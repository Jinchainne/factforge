# FactForge judge notes

- Live sources are fetched inside the GenLayer nondeterministic leader and validator executions.
- The validator re-runs the assessment and compares the categorical outcome to the leader result.
- Two opposing addresses must stake exactly equal amounts before evidence resolution can start.
- Proposer and challenger evidence are rendered into separate fixed 9,000-character quotas; one side cannot consume the other's reserved context.
- `tests/test_evidence_budget.py` behaviorally verifies the crowd-out case with oversized proposer and challenger pages.
- `undetermined` is a real fail-closed outcome, not an error fallback that silently pays one side.
- The frontend polls on-chain challenge state and exposes wallet-backed write actions.
- The contract zeroes both stake fields before transfers and prevents double settlement.
- Resolution waits for the evidence deadline, and incomplete accepted cases refund both parties instead of locking funds.
- Behavioral tests execute exact-match rejection, symmetric challenger payout, early-resolution rejection, and incomplete-evidence refunds.
