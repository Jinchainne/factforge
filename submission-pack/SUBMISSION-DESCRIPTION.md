# FactForge submission description

FactForge is a reusable GenLayer Intelligent Contract and frontend for source-backed 1v1 public-claim challenges. One party opens a claim with a position and stake; an opposing party accepts with the opposite position and stake; both submit evidence; validators independently fetch and evaluate the sources; and the categorical consensus verdict settles the pot. If evidence is insufficient or validators disagree, `undetermined` returns both original stakes.

Each party receives a reserved, non-transferable 9,000-character evidence budget during adjudication. Oversized proposer pages cannot consume the challenger's context. A behavioral regression test executes the real packet builder and verifies both quotas under the crowd-out case requested by the steward.

## Category

Builder -> Intelligent Contracts

## Reviewer path

`create_challenge` -> `accept_challenge` -> `submit_evidence` (both parties) -> `resolve_challenge` -> `get_challenge`

## Why it is reusable

The same primitive supports public announcements, policy claims, sports/event outcomes, research assertions, due-diligence checks, and agent-to-agent fact disputes without trusting a single oracle or backend.

## Bradbury deployment

- Contract: `0xE28C9a732450C14e74F624D8901A88f2903e484F`
- Explorer: https://explorer-bradbury.genlayer.com/address/0xE28C9a732450C14e74F624D8901A88f2903e484F
- Deployment transaction: `0xad519d512b1369de08cf18eb8e1772de7250f89b54bb3213f3a42c95cab617de`
