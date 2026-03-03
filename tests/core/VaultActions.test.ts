import { describe, it, expect, vi } from "vitest";
import type { Address, PublicClient } from "viem";
import { VaultActions } from "../../src/core/blockchain/VaultActions";

const VAULT = "0x1111111111111111111111111111111111111111" as Address;
const ASSET = "0x2222222222222222222222222222222222222222" as Address;
const USER = "0x3333333333333333333333333333333333333333" as Address;
const TX_HASH = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

function createMockClient(allowance: bigint = 0n) {
  return {
    readContract: vi.fn().mockResolvedValue(allowance),
    waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
  } as unknown as PublicClient;
}

function createMockSendTx() {
  return vi.fn().mockResolvedValue(TX_HASH);
}

describe("VaultActions", () => {
  describe("deposit", () => {
    it("approves and deposits when allowance is insufficient", async () => {
      const client = createMockClient(0n);
      const sendTx = createMockSendTx();

      const result = await VaultActions.deposit(
        client, sendTx, VAULT, "100", USER, ASSET, 6, "SYNC_DEPOSIT_ASYNC_REDEEM",
      );

      expect(sendTx).toHaveBeenCalledTimes(2); // approve + deposit
      expect(result.approveHash).toBe(TX_HASH);
      expect(result.depositHash).toBe(TX_HASH);
      expect(client.waitForTransactionReceipt).toHaveBeenCalledTimes(2);
    });

    it("skips approve when allowance is sufficient", async () => {
      const client = createMockClient(200_000_000n); // 200 USDC
      const sendTx = createMockSendTx();

      const result = await VaultActions.deposit(
        client, sendTx, VAULT, "100", USER, ASSET, 6, "SYNC_DEPOSIT_ASYNC_REDEEM",
      );

      expect(sendTx).toHaveBeenCalledTimes(1); // deposit only
      expect(result.approveHash).toBeUndefined();
      expect(result.depositHash).toBe(TX_HASH);
    });

    it("throws for zero amount", async () => {
      const client = createMockClient();
      const sendTx = createMockSendTx();

      await expect(
        VaultActions.deposit(client, sendTx, VAULT, "0", USER, ASSET, 6),
      ).rejects.toThrow("Amount must be greater than 0");

      expect(sendTx).not.toHaveBeenCalled();
    });

    it("waits for receipt after each transaction", async () => {
      const client = createMockClient(0n);
      const sendTx = createMockSendTx();

      await VaultActions.deposit(client, sendTx, VAULT, "50", USER, ASSET, 6);

      expect(client.waitForTransactionReceipt).toHaveBeenCalledWith({ hash: TX_HASH });
      expect(client.waitForTransactionReceipt).toHaveBeenCalledTimes(2);
    });

    it("works with ASYNC vault type", async () => {
      const client = createMockClient(1000_000_000n);
      const sendTx = createMockSendTx();

      const result = await VaultActions.deposit(
        client, sendTx, VAULT, "100", USER, ASSET, 6, "ASYNC",
      );

      expect(sendTx).toHaveBeenCalledTimes(1);
      expect(result.depositHash).toBe(TX_HASH);
    });
  });

  describe("requestRedeem", () => {
    it("sends requestRedeem transaction", async () => {
      const client = createMockClient();
      const sendTx = createMockSendTx();

      const result = await VaultActions.requestRedeem(
        client, sendTx, VAULT, "10", USER, 18,
      );

      expect(sendTx).toHaveBeenCalledTimes(1);
      expect(result.txHash).toBe(TX_HASH);
      expect(client.waitForTransactionReceipt).toHaveBeenCalledTimes(1);
    });

    it("throws for zero shares", async () => {
      const client = createMockClient();
      const sendTx = createMockSendTx();

      await expect(
        VaultActions.requestRedeem(client, sendTx, VAULT, "0", USER),
      ).rejects.toThrow("Shares must be greater than 0");
    });
  });

  describe("claimRedeem", () => {
    it("sends redeem transaction", async () => {
      const client = createMockClient();
      const sendTx = createMockSendTx();

      const result = await VaultActions.claimRedeem(
        client, sendTx, VAULT, 100n, USER,
      );

      expect(sendTx).toHaveBeenCalledTimes(1);
      expect(result.txHash).toBe(TX_HASH);
    });

    it("throws for zero shares", async () => {
      const client = createMockClient();
      const sendTx = createMockSendTx();

      await expect(
        VaultActions.claimRedeem(client, sendTx, VAULT, 0n, USER),
      ).rejects.toThrow("No shares to claim");
    });
  });

  describe("cancelRedeem", () => {
    it("sends cancelRedeemRequest transaction", async () => {
      const client = createMockClient();
      const sendTx = createMockSendTx();

      const result = await VaultActions.cancelRedeem(client, sendTx, VAULT, USER);

      expect(sendTx).toHaveBeenCalledTimes(1);
      expect(result.txHash).toBe(TX_HASH);
    });
  });

  describe("claimCancelRedeem", () => {
    it("sends claimCancelRedeemRequest transaction", async () => {
      const client = createMockClient();
      const sendTx = createMockSendTx();

      const result = await VaultActions.claimCancelRedeem(client, sendTx, VAULT, USER);

      expect(sendTx).toHaveBeenCalledTimes(1);
      expect(result.txHash).toBe(TX_HASH);
    });
  });

  describe("error propagation", () => {
    it("propagates sendTransaction errors", async () => {
      const client = createMockClient(1000_000_000n);
      const sendTx = vi.fn().mockRejectedValue(new Error("User rejected"));

      await expect(
        VaultActions.deposit(client, sendTx, VAULT, "100", USER, ASSET, 6),
      ).rejects.toThrow("User rejected");
    });

    it("propagates waitForTransactionReceipt errors", async () => {
      const client = {
        readContract: vi.fn().mockResolvedValue(1000_000_000n),
        waitForTransactionReceipt: vi.fn().mockRejectedValue(new Error("Reverted")),
      } as unknown as PublicClient;
      const sendTx = createMockSendTx();

      await expect(
        VaultActions.deposit(client, sendTx, VAULT, "100", USER, ASSET, 6),
      ).rejects.toThrow("Reverted");
    });
  });
});
