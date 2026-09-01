import { useEffect, useRef, useState } from "react";
import {
  acceptChallenge,
  connectWallet,
  createChallenge,
  createSourceReport,
  listChallengeIds,
  listSourceReportIds,
  readChallenge,
  readSourceReport,
  refundIncomplete,
  refundUnaccepted,
  resolveChallenge,
  submitEvidence,
  walletClient,
} from "./lib/genlayer";
import "./source-lens.css";

type Challenge = {
  id: number;
  statement: string;
  resolution_rules: string;
  status: string;
  verdict: string;
  reasoning: string;
  deadline: number;
  proposer: string;
  challenger: string;
  proposer_stake: string;
  challenger_stake: string;
  proposer_urls: string[];
  challenger_urls: string[];
};
type SourceReport = {
  id: number;
  claim: string;
  source_url: string;
  finding: string;
  reasoning: string;
};
const EMPTY = {
  statement: "",
  rules: "",
  position: true,
  deadline: 86400,
  stake: "0.01",
  evidence: "",
};

function toChallenge(value: any): Challenge {
  return {
    ...value,
    id: Number(value.id),
    deadline: Number(value.deadline),
    proposer_stake: String(value.proposer_stake),
    challenger_stake: String(value.challenger_stake),
    proposer_urls: value.proposer_urls || [],
    challenger_urls: value.challenger_urls || [],
  };
}
function toReport(value: any): SourceReport {
  return { ...value, id: Number(value.id) };
}
function shortAddress(value: string) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "—";
}
function formatStake(value: string) {
  return `${(Number(value) / 1e18).toFixed(3)} GEN`;
}
function label(value: string) {
  return value.replaceAll("_", " ");
}

export default function App() {
  const [account, setAccount] = useState<`0x${string}` | "">("");
  const [ids, setIds] = useState<number[]>([]);
  const [selected, setSelected] = useState<Challenge | null>(null);
  const selectedId = useRef<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [challengeId, setChallengeId] = useState("1");
  const [message, setMessage] = useState("Syncing live challenge index...");
  const [busy, setBusy] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [report, setReport] = useState<SourceReport | null>(null);
  const [reportForm, setReportForm] = useState({ claim: "", url: "" });
  const [view, setView] = useState<"desk" | "cases" | "lens" | "inspector">(
    "desk",
  );

  async function loadChallenge(id: number) {
    const next = toChallenge(await readChallenge(id));
    selectedId.current = id;
    setSelected(next);
    setChallengeId(String(id));
  }
  async function refresh() {
    try {
      const raw = await listChallengeIds();
      const next = (Array.isArray(raw) ? raw : []).map(Number).reverse();
      setIds(next);
      const targetId =
        selectedId.current && next.includes(selectedId.current)
          ? selectedId.current
          : next[0];
      if (targetId) await loadChallenge(targetId);
      const reportIds = await listSourceReportIds();
      const latestReport = (Array.isArray(reportIds) ? reportIds : [])
        .map(Number)
        .pop();
      if (latestReport)
        setReport(toReport(await readSourceReport(latestReport)));
      setMessage(
        next.length
          ? "Live state synced from GenLayer"
          : "No challenges indexed yet",
      );
    } catch (error) {
      setMessage(`Sync error: ${String(error)}`);
    }
  }
  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 8000);
    return () => window.clearInterval(timer);
  }, []);
  async function act(fn: () => Promise<unknown>, success: string) {
    try {
      setBusy(true);
      setMessage("Transaction submitted · waiting for consensus");
      await fn();
      setMessage(success);
      await refresh();
      if (Number(challengeId)) await loadChallenge(Number(challengeId));
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    if (!account) return setMessage("Connect a wallet to open a challenge");
    await act(
      () =>
        createChallenge(
          walletClient(account),
          form.statement,
          form.rules,
          form.position,
          Math.floor(Date.now() / 1000) + Number(form.deadline || 86400),
          BigInt(Math.round(Number(form.stake) * 1e18)),
        ),
      "Challenge opened on-chain",
    );
  }
  async function accept() {
    if (!account) return setMessage("Connect a wallet to accept a challenge");
    if (!selected || selected.id !== Number(challengeId)) {
      return setMessage("Load the selected challenge before matching its stake");
    }
    await act(
      () =>
        acceptChallenge(
          walletClient(account),
          Number(challengeId),
          BigInt(selected.proposer_stake),
        ),
      "Opposite position accepted with an exact matching stake",
    );
  }
  async function evidence() {
    if (!account) return setMessage("Connect a wallet to submit evidence");
    const urls = form.evidence
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    await act(
      () => submitEvidence(walletClient(account), Number(challengeId), urls),
      "Evidence submitted to the case",
    );
  }
  async function resolve() {
    if (!account) return setMessage("Connect a wallet to resolve a challenge");
    await act(
      () => resolveChallenge(walletClient(account), Number(challengeId)),
      "Consensus verdict written on-chain",
    );
  }
  async function refundMissingEvidence() {
    if (!account) return setMessage("Connect a wallet to request a refund");
    await act(
      () => refundIncomplete(walletClient(account), Number(challengeId)),
      "Incomplete challenge refunded to both parties",
    );
  }
  async function refundExpiredUnaccepted() {
    if (!account) return setMessage("Connect the proposer wallet to request a refund");
    if (!selected || selected.id !== Number(challengeId)) {
      return setMessage("Load the selected challenge before requesting its refund");
    }
    if (selected.status !== "open" || Math.floor(Date.now() / 1000) <= selected.deadline) {
      return setMessage("Only an expired challenge that was never accepted can use this refund");
    }
    if (selected.proposer.toLowerCase() !== account.toLowerCase()) {
      return setMessage("Only the challenge proposer can recover this stake");
    }
    await act(
      () => refundUnaccepted(walletClient(account), selected.id),
      "Expired unaccepted challenge refunded to the proposer",
    );
  }
  async function runSourceLens() {
    if (!account) return setMessage("Connect a wallet to run Source Lens");
    try {
      setReportBusy(true);
      setMessage(
        "Source Lens is reading the public page and waiting for validators",
      );
      const client = walletClient(account);
      await createSourceReport(client, reportForm.claim, reportForm.url);
      const reportIds = await listSourceReportIds();
      const latestReport = (Array.isArray(reportIds) ? reportIds : [])
        .map(Number)
        .pop();
      if (latestReport)
        setReport(toReport(await readSourceReport(latestReport)));
      setMessage("Source Lens report finalized on-chain");
    } catch (error) {
      setMessage(String(error));
    } finally {
      setReportBusy(false);
    }
  }

  const resolvedCount =
    selected &&
    ["proposer_won", "challenger_won", "undetermined"].includes(
      selected.verdict,
    )
      ? 1
      : 0;
  const canRefundUnaccepted = Boolean(
    account &&
      selected &&
      selected.id === Number(challengeId) &&
      selected.status === "open" &&
      Math.floor(Date.now() / 1000) > selected.deadline &&
      selected.proposer.toLowerCase() === account.toLowerCase(),
  );
  return (
    <main className={`app-shell view-${view}`}>
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">FF</span>
          <span>
            <b>FactForge</b>
            <small>claim intelligence desk</small>
          </span>
        </div>
        <nav>
          <button
            className={view === "desk" ? "active" : ""}
            onClick={() => setView("desk")}
          >
            Desk
          </button>
          <button
            className={view === "cases" ? "active" : ""}
            onClick={() => setView("cases")}
          >
            Cases
          </button>
          <button
            className={view === "lens" ? "active" : ""}
            onClick={() => setView("lens")}
          >
            Source Lens
          </button>
          <button
            className={view === "inspector" ? "active" : ""}
            onClick={() => setView("inspector")}
          >
            Inspector
          </button>
        </nav>
        <div className="top-actions">
          <span className="network">
            <i /> Bradbury / 4221
          </span>
          <button
            className="wallet"
            onClick={async () => setAccount(await connectWallet())}
          >
            {account ? shortAddress(account) : "Connect wallet"}
          </button>
        </div>
      </header>
      <section className="dashboard-head" id="desk">
        <div>
          <p className="kicker">GENLAYER / PUBLIC CLAIMS / 08:42 UTC</p>
          <h1>
            Claims worth
            <br />
            <em>checking.</em>
          </h1>
          <p className="head-copy">
            A live workspace for public questions that need more than an
            opinion. Build the case, bring the sources, let independent
            validators settle it.
          </p>
        </div>
        <div className="head-signal">
          <span className="live-dot" />
          <b>{message}</b>
          <small>Auto-refresh every 8 seconds · contract reads only</small>
        </div>
      </section>
      <section className="metric-strip">
        <div>
          <span>Indexed challenges</span>
          <strong>{String(ids.length).padStart(2, "0")}</strong>
          <small>on Bradbury</small>
        </div>
        <div>
          <span>Selected case</span>
          <strong>{selected ? `#${selected.id}` : "—"}</strong>
          <small>{selected ? label(selected.status) : "none loaded"}</small>
        </div>
        <div>
          <span>Consensus mode</span>
          <strong>2×</strong>
          <small>independent reads</small>
        </div>
        <div>
          <span>Resolved here</span>
          <strong>{String(resolvedCount).padStart(2, "0")}</strong>
          <small>fail-closed by design</small>
        </div>
      </section>
      <section className="source-lens">
        <div className="lens-copy">
          <p className="kicker">GENLAYER NATIVE / SOURCE LENS</p>
          <h2>
            Ask the web.
            <br />
            <em>Keep the receipt.</em>
          </h2>
          <p>
            Run one public source through live web rendering, an LLM judge, and
            an independent validator. The finding and reasoning become a
            permanent on-chain report.
          </p>
          <div className="lens-steps">
            <span>
              <b>01</b> fetch
            </span>
            <span>
              <b>02</b> assess
            </span>
            <span>
              <b>03</b> agree
            </span>
          </div>
        </div>
        <div className="lens-form">
          <label>
            Claim to inspect
            <textarea
              value={reportForm.claim}
              onChange={(e) =>
                setReportForm({ ...reportForm, claim: e.target.value })
              }
              placeholder="The source confirms that the city published its budget before June 30."
            />
          </label>
          <label>
            Public source URL
            <input
              value={reportForm.url}
              onChange={(e) =>
                setReportForm({ ...reportForm, url: e.target.value })
              }
              placeholder="https://example.gov/report"
            />
          </label>
          <button
            className="lens-button"
            disabled={reportBusy}
            onClick={runSourceLens}
          >
            {reportBusy ? "Validators are comparing..." : "Run Source Lens"}
            <span>◎</span>
          </button>
        </div>
        {report && (
          <div className={`report-result report-${report.finding}`}>
            <div>
              <span className="kicker">
                LATEST ON-CHAIN REPORT #{report.id}
              </span>
              <b>{label(report.finding)}</b>
            </div>
            <a href={report.source_url} target="_blank" rel="noreferrer">
              Open source ↗
            </a>
            <p>{report.reasoning}</p>
          </div>
        )}
      </section>
      <section className="desk-grid" id="cases">
        <div className="feed-column">
          <div className="section-heading">
            <div>
              <p className="kicker">01 / LIVE INDEX</p>
              <h2>Challenge feed</h2>
            </div>
            <span className="source-pill">
              <i /> on-chain
            </span>
          </div>
          <div className="case-list">
            {ids.length ? (
              ids.slice(0, 8).map((id, index) => (
                <button
                  className={`case-row ${selected?.id === id ? "selected" : ""}`}
                  key={id}
                  onClick={() => loadChallenge(id)}
                >
                  <span className="case-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="case-summary">
                    <b>Challenge #{id}</b>
                    <small>
                      {selected?.id === id
                        ? selected.statement
                        : "Select to inspect live state"}
                    </small>
                  </span>
                  <span className="row-arrow">↗</span>
                </button>
              ))
            ) : (
              <div className="empty-state">
                <strong>No public challenges yet</strong>
                <span>Open the first claim from the composer.</span>
              </div>
            )}
          </div>
          <div className="method-card" id="method">
            <div className="method-icon">◎</div>
            <div>
              <p className="kicker">WHY THIS HOLDS</p>
              <h3>Evidence in. Verdict out.</h3>
              <p>
                Validators independently fetch both parties' sources. A
                disagreement or unavailable source becomes <b>undetermined</b>{" "}
                and returns both stakes.
              </p>
            </div>
          </div>
        </div>
        <aside className="composer-card">
          <div className="section-heading">
            <div>
              <p className="kicker">02 / COMPOSE</p>
              <h2>Open a challenge</h2>
            </div>
            <span className="soft-label">PAYABLE</span>
          </div>
          <label>
            Public statement
            <textarea
              value={form.statement}
              onChange={(e) => setForm({ ...form, statement: e.target.value })}
              placeholder="The city published its 2026 flood-relief budget before June 30."
            />
          </label>
          <label>
            Resolution rules
            <textarea
              value={form.rules}
              onChange={(e) => setForm({ ...form, rules: e.target.value })}
              placeholder="What counts as decisive evidence? When is the claim settled?"
            />
          </label>
          <div className="field-row">
            <label>
              Position
              <select
                value={String(form.position)}
                onChange={(e) =>
                  setForm({ ...form, position: e.target.value === "true" })
                }
              >
                <option value="true">Claim is true</option>
                <option value="false">Claim is false</option>
              </select>
            </label>
            <label>
              Stake <span className="unit">GEN</span>
              <input
                value={form.stake}
                onChange={(e) => setForm({ ...form, stake: e.target.value })}
              />
            </label>
          </div>
          <label>
            Evidence URLs{" "}
            <span className="field-note">
              one URL per line · add after opening too
            </span>
            <textarea
              value={form.evidence}
              onChange={(e) => setForm({ ...form, evidence: e.target.value })}
              placeholder="https://source.example/report"
            />
          </label>
          <button className="action-button" disabled={busy} onClick={create}>
            {busy ? "Waiting for consensus..." : "Open with stake"}
            <span>↗</span>
          </button>
        </aside>
      </section>
      <section className="inspector">
        <div className="inspector-top">
          <div>
            <p className="kicker">03 / INSPECTOR</p>
            <h2>Operate the case</h2>
          </div>
          <label className="case-id">
            CASE ID
            <input
              value={challengeId}
              onChange={(e) => setChallengeId(e.target.value)}
            />
          </label>
        </div>
        <div className="inspector-grid">
          <div className="case-detail">
            {selected ? (
              <>
                <div className="detail-meta">
                  <span>Challenge #{selected.id}</span>
                  <strong className={`status status-${selected.status}`}>
                    {label(selected.status)}
                  </strong>
                </div>
                <h3>{selected.statement}</h3>
                <p>{selected.resolution_rules}</p>
                <div className="party-grid">
                  <div>
                    <span>PROPOSER</span>
                    <b>{shortAddress(selected.proposer)}</b>
                    <small>{formatStake(selected.proposer_stake)}</small>
                  </div>
                  <div>
                    <span>CHALLENGER</span>
                    <b>{shortAddress(selected.challenger)}</b>
                    <small>{formatStake(selected.challenger_stake)}</small>
                  </div>
                  <div>
                    <span>SOURCES</span>
                    <b>
                      {selected.proposer_urls.length +
                        selected.challenger_urls.length}
                    </b>
                    <small>submitted URLs</small>
                  </div>
                </div>
                {selected.verdict && (
                  <div className="verdict-box">
                    <span>CONSENSUS VERDICT</span>
                    <b>{label(selected.verdict)}</b>
                    <p>{selected.reasoning}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <strong>Select a challenge</strong>
                <span>Choose a case from the live index to inspect it.</span>
              </div>
            )}
          </div>
          <div className="action-rail">
            <p className="kicker">CASE ACTIONS</p>
            <button onClick={accept}>
              Match proposer stake <span>↗</span>
            </button>
            <button onClick={evidence}>
              Submit evidence <span>↗</span>
            </button>
            <button className="resolve-button" onClick={resolve}>
              Resolve with validators <span>◎</span>
            </button>
            <button onClick={refundMissingEvidence}>
              Refund incomplete case <span>↗</span>
            </button>
            <button
              className="refund-unaccepted-button"
              disabled={busy || !canRefundUnaccepted}
              onClick={refundExpiredUnaccepted}
              title={
                canRefundUnaccepted
                  ? "Recover the proposer's stake"
                  : "Requires an expired open case and its proposer wallet"
              }
            >
              Refund expired unaccepted case <span>↗</span>
            </button>
            <small>
              Proposers can recover expired open cases that nobody accepted. Resolution
              and incomplete refunds unlock after the evidence deadline.
            </small>
            <small>{message}</small>
          </div>
        </div>
      </section>
      <footer>
        <span>FACTFORGE / SOURCE-BACKED CHALLENGES</span>
        <span>Bradbury testnet · contract reads live</span>
        <a
          href="https://explorer-bradbury.genlayer.com/address/0x866fb1b20Ef82195Dee024117AC2C1bDAF03A9e5"
          target="_blank"
          rel="noreferrer"
        >
          Explorer ↗
        </a>
      </footer>
    </main>
  );
}
