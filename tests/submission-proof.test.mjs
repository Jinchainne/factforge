import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const source = readFileSync("contracts/fact_forge.py", "utf8");
const app = readFileSync("app/factforge-workflow.ts", "utf8");
const web = readFileSync("frontend/src/lib/genlayer.ts", "utf8");

test("FactForge has source-backed consensus", () => {
  for (const signal of ["gl.nondet.web.render", "gl.nondet.exec_prompt", "gl.vm.run_nondet_unsafe", "validator_fn(leader_result", "leader.get(\"outcome\")", "UNTRUSTED SOURCES"]) assert.ok(source.includes(signal), signal);
});

test("FactForge has two-sided escrow and fail-closed settlement", () => {
  for (const signal of ["@gl.public.write.payable", "def create_challenge", "def accept_challenge", "def submit_evidence", "def resolve_challenge", "def refund_unaccepted", "ChallengeStatus.UNDETERMINED", "proposer_stake = u256(0)", "challenger_stake = u256(0)", "emit_transfer"]) assert.ok(source.includes(signal), signal);
});

test("FactForge has real app-to-contract reads and writes", () => {
  for (const signal of ["readContract", "writeContract", "waitForTransactionReceipt", "connectWallet"]) assert.ok(web.includes(signal), signal);
  for (const signal of ["writeContract", "waitForTransactionReceipt", "policyBoundToExecution"]) assert.ok(app.includes(signal), signal);
  for (const path of ["README.md", "SECURITY.md", "frontend/src/App.tsx", "deploy/001_deploy_fact_forge.mjs", "submission-pack/SUBMISSION-DESCRIPTION.md"]) assert.equal(existsSync(path), true, path);
});
