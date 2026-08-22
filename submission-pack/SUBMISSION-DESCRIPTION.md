# FactForge submission description

FactForge is a reusable GenLayer Intelligent Contract and frontend for source-backed 1v1 public-claim challenges. One party opens a claim with a position and stake; an opposing party accepts with the opposite position and stake; both submit evidence; validators independently fetch and evaluate the sources; and the categorical consensus verdict settles the pot. If evidence is insufficient or validators disagree, `undetermined` returns both original stakes.

## Category

Builder -> Intelligent Contracts

## Reviewer path

`create_challenge` -> `accept_challenge` -> `submit_evidence` (both parties) -> `resolve_challenge` -> `get_challenge`

## Why it is reusable

The same primitive supports public announcements, policy claims, sports/event outcomes, research assertions, due-diligence checks, and agent-to-agent fact disputes without trusting a single oracle or backend.
