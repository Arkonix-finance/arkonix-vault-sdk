import { describe, it, expect } from "vitest";
import { decodeFunctionData, type Address } from "viem";
import { VaultTxBuilder } from "../../src/core/blockchain/VaultTxBuilder";
import { ERC20_ABI, SYNC_DEPOSIT_VAULT_ABI, ASYNC_VAULT_ABI } from "../../src/constants/abis";

const VAULT = "0x1111111111111111111111111111111111111111" as Address;
const TOKEN = "0x2222222222222222222222222222222222222222" as Address;
const USER = "0x3333333333333333333333333333333333333333" as Address;

describe("VaultTxBuilder", () => {
  describe("buildApproveTx", () => {
    it("encodes ERC20 approve correctly", () => {
      const tx = VaultTxBuilder.buildApproveTx(TOKEN, VAULT, 1000n);
      expect(tx.to).toBe(TOKEN);
      expect(tx.value).toBe(0n);

      const decoded = decodeFunctionData({ abi: ERC20_ABI, data: tx.data });
      expect(decoded.functionName).toBe("approve");
      expect(decoded.args).toEqual([VAULT, 1000n]);
    });
  });

  describe("buildDepositTx", () => {
    it("encodes SYNC deposit correctly", () => {
      const tx = VaultTxBuilder.buildDepositTx(VAULT, 500n, USER, "SYNC");
      expect(tx.to).toBe(VAULT);
      expect(tx.value).toBe(0n);

      const decoded = decodeFunctionData({ abi: SYNC_DEPOSIT_VAULT_ABI, data: tx.data });
      expect(decoded.functionName).toBe("deposit");
      expect(decoded.args).toEqual([500n, USER]);
    });

    it("encodes ASYNC requestDeposit correctly", () => {
      const tx = VaultTxBuilder.buildDepositTx(VAULT, 500n, USER, "ASYNC");
      expect(tx.to).toBe(VAULT);

      const decoded = decodeFunctionData({ abi: ASYNC_VAULT_ABI, data: tx.data });
      expect(decoded.functionName).toBe("requestDeposit");
      expect(decoded.args).toEqual([500n, USER, USER]);
    });

    it("defaults to SYNC", () => {
      const tx = VaultTxBuilder.buildDepositTx(VAULT, 100n, USER);
      const decoded = decodeFunctionData({ abi: SYNC_DEPOSIT_VAULT_ABI, data: tx.data });
      expect(decoded.functionName).toBe("deposit");
    });
  });

  describe("buildRequestRedeemTx", () => {
    it("encodes requestRedeem correctly", () => {
      const tx = VaultTxBuilder.buildRequestRedeemTx(VAULT, 200n, USER, USER);
      expect(tx.to).toBe(VAULT);
      expect(tx.value).toBe(0n);

      const decoded = decodeFunctionData({ abi: SYNC_DEPOSIT_VAULT_ABI, data: tx.data });
      expect(decoded.functionName).toBe("requestRedeem");
      expect(decoded.args).toEqual([200n, USER, USER]);
    });
  });

  describe("buildClaimRedeemTx", () => {
    it("encodes redeem correctly", () => {
      const tx = VaultTxBuilder.buildClaimRedeemTx(VAULT, 150n, USER, USER);
      expect(tx.to).toBe(VAULT);

      const decoded = decodeFunctionData({ abi: SYNC_DEPOSIT_VAULT_ABI, data: tx.data });
      expect(decoded.functionName).toBe("redeem");
      expect(decoded.args).toEqual([150n, USER, USER]);
    });
  });

  describe("buildCancelRedeemTx", () => {
    it("encodes cancelRedeemRequest with requestId=0", () => {
      const tx = VaultTxBuilder.buildCancelRedeemTx(VAULT, USER);
      expect(tx.to).toBe(VAULT);

      const decoded = decodeFunctionData({ abi: SYNC_DEPOSIT_VAULT_ABI, data: tx.data });
      expect(decoded.functionName).toBe("cancelRedeemRequest");
      expect(decoded.args).toEqual([0n, USER]);
    });
  });

  describe("buildClaimCancelRedeemTx", () => {
    it("encodes claimCancelRedeemRequest with requestId=0", () => {
      const tx = VaultTxBuilder.buildClaimCancelRedeemTx(VAULT, USER, USER);
      expect(tx.to).toBe(VAULT);

      const decoded = decodeFunctionData({ abi: SYNC_DEPOSIT_VAULT_ABI, data: tx.data });
      expect(decoded.functionName).toBe("claimCancelRedeemRequest");
      expect(decoded.args).toEqual([0n, USER, USER]);
    });
  });
});
