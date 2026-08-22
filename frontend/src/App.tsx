import { useEffect, useState } from "react";
import { acceptChallenge, connectWallet, createChallenge, listChallengeIds, readChallenge, resolveChallenge, submitEvidence, walletClient } from "./lib/genlayer";

type Challenge = { id: number; statement: string; resolution_rules: string; status: string; verdict: string; reasoning: string; deadline: number; proposer: string; challenger: string; proposer_stake: number; challenger_stake: number; proposer_urls: string[]; challenger_urls: string[] };
const EMPTY = { statement: "", rules: "", position: true, deadline: 0, stake: "0.01", evidence: "" };

function toChallenge(value: any): Challenge { return { ...value, id: Number(value.id), deadline: Number(value.deadline), proposer_stake: Number(value.proposer_stake), challenger_stake: Number(value.challenger_stake), proposer_urls: value.proposer_urls || [], challenger_urls: value.challenger_urls || [] }; }

export default function App() {
  const [account, setAccount] = useState<`0x${string}` | "">("");
  const [ids, setIds] = useState<number[]>([]);
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [challengeId, setChallengeId] = useState("1");
  const [message, setMessage] = useState("Loading live challenges...");

  async function refresh() {
    try {
      const raw = await listChallengeIds();
      const next = (Array.isArray(raw) ? raw : []).map(Number).reverse();
      setIds(next);
      if (next[0]) setSelected(toChallenge(await readChallenge(next[0])));
      setMessage(next.length ? "Live state synced from GenLayer." : "No challenges yet. Open the first one.");
    } catch (error) { setMessage(String(error)); }
  }
  useEffect(() => { refresh(); const timer = window.setInterval(refresh, 8000); return () => window.clearInterval(timer); }, []);

  async function act(fn: () => Promise<unknown>, success: string) {
    try { setMessage("Transaction submitted. Waiting for consensus..."); await fn(); setMessage(success); await refresh(); } catch (error) { setMessage(String(error)); }
  }
  async function create() {
    if (!account) return setMessage("Connect a wallet first.");
    const client = walletClient(account);
    await act(() => createChallenge(client, form.statement, form.rules, form.position, Math.floor(Date.now() / 1000) + Number(form.deadline || 86400), BigInt(Math.round(Number(form.stake) * 1e18))), "Challenge opened on-chain.");
  }
  async function accept() {
    if (!account) return setMessage("Connect a wallet first.");
    await act(() => acceptChallenge(walletClient(account), Number(challengeId), BigInt(Math.round(Number(form.stake) * 1e18))), "Challenge accepted.");
  }
  async function evidence() {
    if (!account) return setMessage("Connect a wallet first.");
    const urls = form.evidence.split("\n").map((item) => item.trim()).filter(Boolean);
    await act(() => submitEvidence(walletClient(account), Number(challengeId), urls), "Evidence submitted.");
  }
  async function resolve() {
    if (!account) return setMessage("Connect a wallet first.");
    await act(() => resolveChallenge(walletClient(account), Number(challengeId)), "Consensus resolved the challenge.");
  }

  return <main>
    <nav><span className="mark">FF</span><span className="brand">FactForge</span><span className="nav-note">source-backed challenges</span><button onClick={async () => setAccount(await connectWallet())}>{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect wallet"}</button></nav>
    <section className="hero"><div><p className="eyebrow">GENLAYER / PUBLIC CLAIMS</p><h1>Make the source<br /><em>settle the claim.</em></h1><p className="lede">Two positions. Public evidence. One validator-backed verdict. FactForge turns arguable public questions into inspectable, stake-backed challenges.</p></div><div className="signal"><span className="pulse" />{message}<small>Bradbury testnet · live contract reads</small></div></section>
    <section className="grid"><div className="panel compose"><div className="panel-head"><span>01 / Open a challenge</span><span className="tag">PAYABLE</span></div><label>Public statement<textarea value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} placeholder="Example: The city published its 2026 flood-relief budget before June 30." /></label><label>Resolution rules<textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} placeholder="Define what counts as decisive evidence and when the claim is settled." /></label><div className="row"><label>Position<select value={String(form.position)} onChange={(e) => setForm({ ...form, position: e.target.value === "true" })}><option value="true">Claim is true</option><option value="false">Claim is false</option></select></label><label>Stake (GEN)<input value={form.stake} onChange={(e) => setForm({ ...form, stake: e.target.value })} /></label></div><label>Evidence URLs <span className="muted">optional now, required from both sides</span><textarea value={form.evidence} onChange={(e) => setForm({ ...form, evidence: e.target.value })} placeholder="https://source-one.example/report" /></label><button className="primary" onClick={create}>Open with stake ↗</button></div>
      <div className="panel operate"><div className="panel-head"><span>02 / Operate the case</span><span className="tag dark">CONSENSUS</span></div><label>Challenge ID<input value={challengeId} onChange={(e) => setChallengeId(e.target.value)} /></label><div className="actions"><button onClick={accept}>Accept opposite position</button><button onClick={evidence}>Submit evidence</button><button className="primary" onClick={resolve}>Resolve with validators</button></div>{selected && <article className="case"><div className="case-top"><span>Challenge #{selected.id}</span><strong>{selected.status.replaceAll("_", " ")}</strong></div><h2>{selected.statement}</h2><p>{selected.resolution_rules}</p><div className="facts"><span>Proposer stake <b>{selected.proposer_stake} wei</b></span><span>Challenger stake <b>{selected.challenger_stake} wei</b></span></div>{selected.verdict && <div className="verdict"><span>VERDICT</span><b>{selected.verdict.replaceAll("_", " ")}</b><p>{selected.reasoning}</p></div>}</article>}</div></section>
    <section className="footer-grid"><div><span className="eyebrow">HOW IT HOLDS</span><h2>Fail closed, never silently.</h2><p>Validators independently fetch both parties' sources. If their outcome differs, or evidence is unavailable, the contract settles as <b>undetermined</b> and returns each original stake.</p></div><div className="ledger"><span>LIVE CHALLENGE INDEX</span>{ids.length ? ids.slice(0, 5).map((id) => <button key={id} onClick={async () => setSelected(toChallenge(await readChallenge(id)))}>#{id} <small>inspect ↗</small></button>) : <p>No indexed cases yet.</p>}</div></section>
  </main>;
}
