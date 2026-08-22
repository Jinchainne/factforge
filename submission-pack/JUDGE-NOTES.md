# FactForge judge notes

- Live sources are fetched inside the GenLayer nondeterministic leader and validator executions.
- The validator re-runs the assessment and compares the categorical outcome to the leader result.
- Two opposing addresses must stake before evidence resolution can start.
- `undetermined` is a real fail-closed outcome, not an error fallback that silently pays one side.
- The frontend polls on-chain challenge state and exposes wallet-backed write actions.
- The contract zeroes both stake fields before transfers and prevents double settlement.
