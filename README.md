# FactForge

FactForge is a source-backed 1v1 challenge market for public claims. It combines the strongest ideas from warranty escrow, bounty verification, prediction challenges, evidence artifacts, and agent-first workflows into one focused primitive: two parties stake GEN on opposite positions, submit public sources, and GenLayer validators decide whether the proposer won, the challenger won, or the evidence is undetermined.

Source Lens adds a second GenLayer-native workflow: anyone can submit a claim and one public HTTPS source. Validators fetch the page independently, classify it as `supports`, `contradicts`, or `inconclusive`, and persist the source-backed reasoning as an on-chain report.

## The use case

Public questions often end in screenshots, social posts, and subjective arguments: whether a public notice was published, whether a policy condition was met, whether a research milestone was announced, or whether an event happened before a deadline. FactForge freezes the statement and resolution rules, records both positions, and makes the source packet inspectable alongside the final verdict.

## Why GenLayer

The decision depends on interpreting natural-language rules against live web evidence. `resolve_challenge` and `create_source_report` call `gl.nondet.web.render()` and `gl.nondet.exec_prompt()` inside `gl.vm.run_nondet_unsafe()`. Validators re-fetch and re-evaluate the evidence, and the categorical outcome must match the leader result before a verdict or report is stored.

## Lifecycle

1. Proposer calls `create_challenge` with a statement, resolution rules, position, future deadline, and payable GEN stake.
2. Challenger calls `accept_challenge` with the opposite position and a payable stake.
3. Both parties call `submit_evidence` with 1-6 public HTTPS URLs.
4. Anyone calls `resolve_challenge`; consensus settles the pot to the winning side.
5. Conflicting or unavailable evidence produces `undetermined` and returns each original stake.
6. If nobody accepts, the proposer can call `refund_unaccepted` after the deadline.

## Repository structure

```text
contracts/fact_forge.py       GenLayer Intelligent Contract
frontend/                     React + Vite live chain application
app/factforge-workflow.ts     reusable genlayer-js workflow
deployments/                  network metadata
tests/                        contract and integration-shape checks
submission-pack/              reviewer handoff notes
```

## Run locally

```bash
python -m py_compile contracts/fact_forge.py
npm install
npm test
npm run verify
npm run build:web

cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Set `VITE_FACTFORGE_ADDRESS` to the deployed contract address before using the web app. The frontend polls live chain state every eight seconds and never fabricates a verdict.

## Deploy

```bash
genlayer deploy --contract contracts/fact_forge.py --rpc https://rpc-bradbury.genlayer.com
```

The current deployment is [`0xc74e8310892Ea651b903eB0b8d86e8698A2e023e`](https://explorer-bradbury.genlayer.com/address/0xc74e8310892Ea651b903eB0b8d86e8698A2e023e), with metadata in `deployments/bradbury.json`.

## Design references

FactForge applies several proven patterns: solvency and terms discipline from warranty escrow; source-backed GitHub-style evidence evaluation; contract-native state transitions; revision-friendly evidence packets; 1v1 challenge lifecycle; and an agent-friendly workflow that exposes explicit next actions. It remains a new public-claim primitive rather than a copy of any one reference project.
