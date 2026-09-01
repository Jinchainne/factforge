# FactForge submission description

FactForge is a reusable GenLayer Intelligent Contract and frontend for source-backed 1v1 public-claim challenges. One party opens a claim with a position and stake; an opposing party accepts with the opposite position and an exactly matching stake; both submit evidence; validators independently fetch and evaluate the sources after the evidence window; and the categorical consensus verdict settles the symmetric pot. If evidence is insufficient or validators disagree, `undetermined` returns both original stakes. Missing evidence after the deadline also unlocks a two-sided refund.

Each party receives a reserved, non-transferable 9,000-character evidence budget during adjudication. Oversized proposer pages cannot consume the challenger's context. A behavioral regression test executes the real packet builder and verifies both quotas under the crowd-out case requested by the steward.

## Category

Builder -> Intelligent Contracts

## Reviewer path

`create_challenge` -> `accept_challenge` -> `submit_evidence` (both parties) -> `resolve_challenge` -> `get_challenge`

## Why it is reusable

The same primitive supports public announcements, policy claims, sports/event outcomes, research assertions, due-diligence checks, and agent-to-agent fact disputes without trusting a single oracle or backend.

## Bradbury deployment

- Contract: `0x866fb1b20Ef82195Dee024117AC2C1bDAF03A9e5`
- Explorer: https://explorer-bradbury.genlayer.com/address/0x866fb1b20Ef82195Dee024117AC2C1bDAF03A9e5
- Deployment transaction: `0xd41970f3e40117ce7f02c825e1b1279b6e0fe99451a22328d0d57dbf5727ea1b`
