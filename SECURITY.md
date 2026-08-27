# Security model

FactForge is a source-backed public-claim challenge primitive, not a guarantee that a source is truthful.

- Both parties stake GEN and submit separate public HTTPS evidence.
- Each side has a reserved, non-transferable 9,000-character evidence budget, so oversized proposer sources cannot crowd challenger evidence out of settlement.
- Validators fetch the evidence independently and must agree on the categorical outcome.
- Sources are delimited as untrusted data and may not provide instructions to the judge.
- `undetermined` returns each original stake and is used for unavailable or contradictory evidence.
- Effects are persisted before transfers and each challenge settles once.
- Unaccepted challenges can only be refunded by the proposer after the deadline.
- The frontend must display live chain state, not synthetic verdicts or balances.
