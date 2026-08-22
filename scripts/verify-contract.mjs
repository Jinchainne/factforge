import { readFileSync } from "node:fs";
const source = readFileSync("contracts/fact_forge.py", "utf8");
for (const signal of ["gl.nondet.web.render", "gl.nondet.exec_prompt", "gl.vm.run_nondet_unsafe", "validator_fn(leader_result", "@gl.public.write.payable", "def create_challenge", "def accept_challenge", "def resolve_challenge", "def refund_unaccepted", "emit_transfer"]) {
  if (!source.includes(signal)) throw new Error(`Missing required signal: ${signal}`);
}
console.log("FactForge contract verification signals are present.");
