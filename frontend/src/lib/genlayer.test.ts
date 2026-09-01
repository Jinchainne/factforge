import { describe, expect, it, vi } from "vitest";
import { CONTRACT_ADDRESS, refundUnaccepted } from "./genlayer";


describe("refundUnaccepted", () => {
  it("writes refund_unaccepted and waits for an accepted receipt", async () => {
    const hash = `0x${"a".repeat(64)}` as `0x${string}`;
    const receipt = { statusName: "ACCEPTED" };
    const client = {
      writeContract: vi.fn().mockResolvedValue(hash),
      waitForTransactionReceipt: vi.fn().mockResolvedValue(receipt),
    };

    await expect(refundUnaccepted(client, 17)).resolves.toBe(receipt);
    expect(client.writeContract).toHaveBeenCalledWith({
      address: CONTRACT_ADDRESS,
      functionName: "refund_unaccepted",
      args: [17],
    });
    expect(client.waitForTransactionReceipt).toHaveBeenCalledWith({
      hash,
      status: "ACCEPTED",
      fullTransaction: true,
      retries: 120,
      interval: 3000,
    });
  });
});
