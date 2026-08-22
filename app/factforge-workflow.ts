import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

export async function runFactForgeWorkflow(params: { account: `0x${string}`; contractAddress: `0x${string}`; statement: string; rules: string; position: boolean; deadline: number; stakeWei: bigint; challengeId?: number; evidenceUrls?: string[] }) {
  const client = createClient({ chain: testnetBradbury, account: params.account });
  const createHash = await client.writeContract({ address: params.contractAddress, functionName: "create_challenge", args: [params.statement, params.rules, params.position, params.deadline], value: params.stakeWei });
  const createReceipt = await client.waitForTransactionReceipt({ hash: createHash, status: "ACCEPTED", fullTransaction: true, retries: 120, interval: 3000 });
  if (params.challengeId === undefined) return { createReceipt };
  const evidenceHash = await client.writeContract({ address: params.contractAddress, functionName: "submit_evidence", args: [params.challengeId, params.evidenceUrls || []] });
  const evidenceReceipt = await client.waitForTransactionReceipt({ hash: evidenceHash, status: "ACCEPTED", fullTransaction: true, retries: 120, interval: 3000 });
  return { createReceipt, evidenceReceipt, policyBoundToExecution: true };
}
