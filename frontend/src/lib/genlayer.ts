import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

export const RPC_URL = "https://rpc-bradbury.genlayer.com";
export const EXPLORER_URL = "https://explorer-bradbury.genlayer.com";
export const CONTRACT_ADDRESS = (import.meta.env.VITE_FACTFORGE_ADDRESS as string) || "0xE28C9a732450C14e74F624D8901A88f2903e484F";

function address(value: string) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) throw new Error("Set a valid VITE_FACTFORGE_ADDRESS");
  return value as `0x${string}`;
}

export function readClient() {
  return createClient({ chain: testnetBradbury, endpoint: RPC_URL });
}

export function walletClient(account: `0x${string}`) {
  const provider = (window as any).ethereum;
  if (!provider) throw new Error("Install a wallet with window.ethereum");
  return createClient({ chain: testnetBradbury, account, provider, endpoint: RPC_URL });
}

export async function connectWallet() {
  const provider = (window as any).ethereum;
  if (!provider) throw new Error("Install MetaMask or OKX Wallet");
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  return accounts[0] as `0x${string}`;
}

async function confirmed(client: any, hash: `0x${string}`) {
  return client.waitForTransactionReceipt({ hash, status: "ACCEPTED", fullTransaction: true, retries: 120, interval: 3000 });
}

export async function createChallenge(client: any, statement: string, rules: string, position: boolean, deadline: number, stakeWei: bigint) {
  const hash = await client.writeContract({ address: address(CONTRACT_ADDRESS), functionName: "create_challenge", args: [statement, rules, position, deadline], value: stakeWei });
  return confirmed(client, hash);
}

export async function acceptChallenge(client: any, id: number, stakeWei: bigint) {
  const hash = await client.writeContract({ address: address(CONTRACT_ADDRESS), functionName: "accept_challenge", args: [id], value: stakeWei });
  return confirmed(client, hash);
}

export async function submitEvidence(client: any, id: number, urls: string[]) {
  const hash = await client.writeContract({ address: address(CONTRACT_ADDRESS), functionName: "submit_evidence", args: [id, urls] });
  return confirmed(client, hash);
}

export async function resolveChallenge(client: any, id: number) {
  const hash = await client.writeContract({ address: address(CONTRACT_ADDRESS), functionName: "resolve_challenge", args: [id] });
  return confirmed(client, hash);
}

export async function createSourceReport(client: any, claim: string, sourceUrl: string) {
  const hash = await client.writeContract({ address: address(CONTRACT_ADDRESS), functionName: "create_source_report", args: [claim, sourceUrl] });
  return confirmed(client, hash);
}

export async function readChallenge(id: number) {
  return readClient().readContract({ address: address(CONTRACT_ADDRESS), functionName: "get_challenge", args: [id] });
}

export async function listChallengeIds() {
  return readClient().readContract({ address: address(CONTRACT_ADDRESS), functionName: "list_challenge_ids", args: [] });
}

export async function readSourceReport(id: number) {
  return readClient().readContract({ address: address(CONTRACT_ADDRESS), functionName: "get_source_report", args: [id] });
}

export async function listSourceReportIds() {
  return readClient().readContract({ address: address(CONTRACT_ADDRESS), functionName: "list_source_report_ids", args: [] });
}
