# Security model

FactForge is a source-backed public-claim challenge primitive, not a guarantee that a source is truthful.

- The challenger must exactly match the proposer's GEN stake, preserving symmetric risk and payout.
- Both parties submit separate public HTTPS evidence during a fixed evidence window.
- Each side has a reserved, non-transferable 9,000-character evidence budget, so oversized proposer sources cannot crowd challenger evidence out of settlement.
- Validators fetch the evidence independently and must agree on the categorical outcome.
- Sources are delimited as untrusted data and may not provide instructions to the judge.
- `undetermined` returns each original stake and is used for unavailable or contradictory evidence.
- Effects are persisted before transfers and each challenge settles once.
- Resolution is blocked until the evidence deadline has elapsed.
- Unaccepted challenges can only be refunded by the proposer after the deadline; accepted challenges missing either side's evidence can be refunded by either party.
- The frontend must display live chain state, not synthetic verdicts or balances.
