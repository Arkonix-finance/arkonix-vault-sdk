import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Address, PublicClient } from "viem";
import { VaultReader } from "../../src/core/blockchain/VaultReader";

const VAULT = "0x1111111111111111111111111111111111111111" as Address;
const ASSET = "0x2222222222222222222222222222222222222222" as Address;
const SHARE = "0x3333333333333333333333333333333333333333" as Address;
const USER = "0x4444444444444444444444444444444444444444" as Address;

function createMockClient(overrides: {
  multicallResults?: any[];
  readContractResult?: any;
} = {}) {
  const multicallResults = [...(overrides.multicallResults ?? [])];
  return {
    multicall: vi.fn().mockImplementation(() => {
      return Promise.resolve(multicallResults.shift() ?? []);
    }),
    readContract: vi.fn().mockResolvedValue(overrides.readContractResult ?? 0n),
  } as unknown as PublicClient;
}

describe("VaultReader", () => {
  describe("getMetadata", () => {
    it("returns correct metadata from multicall results", async () => {
      const client = createMockClient({
        multicallResults: [
          // Batch 1: vault metadata
          [
            { result: ASSET, status: "success" },
            { result: SHARE, status: "success" },
            { result: 1n, status: "success" },
            { result: 0, status: "success" },
            { result: 1000000n, status: "success" },
          ],
          // Batch 2: token metadata
          [
            { result: 6, status: "success" },
            { result: "USDC", status: "success" },
            { result: 18, status: "success" },
            { result: "vUSDC", status: "success" },
          ],
        ],
      });

      const meta = await VaultReader.getMetadata(client, VAULT);

      expect(meta.asset).toBe(ASSET);
      expect(meta.share).toBe(SHARE);
      expect(meta.poolId).toBe(1n);
      expect(meta.vaultKind).toBe(0);
      expect(meta.vaultType).toBe("ASYNC");
      expect(meta.totalAssets).toBe(1000000n);
      expect(meta.assetDecimals).toBe(6);
      expect(meta.assetSymbol).toBe("USDC");
      expect(meta.shareDecimals).toBe(18);
      expect(meta.shareSymbol).toBe("vUSDC");
    });

    it("returns SYNC_DEPOSIT_ASYNC_REDEEM vaultType when vaultKind is non-zero", async () => {
      const client = createMockClient({
        multicallResults: [
          [
            { result: ASSET }, { result: SHARE }, { result: 2n },
            { result: 2 }, { result: 0n },
          ],
          [
            { result: 6 }, { result: "USDC" },
            { result: 18 }, { result: "vUSDC" },
          ],
        ],
      });

      const meta = await VaultReader.getMetadata(client, VAULT);
      expect(meta.vaultType).toBe("SYNC_DEPOSIT_ASYNC_REDEEM");
      expect(meta.vaultKind).toBe(2);
    });

    it("calls multicall twice (vault + token batches)", async () => {
      const client = createMockClient({
        multicallResults: [
          [{ result: ASSET }, { result: SHARE }, { result: 1n }, { result: 0 }, { result: 0n }],
          [{ result: 6 }, { result: "USDC" }, { result: 18 }, { result: "vUSDC" }],
        ],
      });

      await VaultReader.getMetadata(client, VAULT);
      expect(client.multicall).toHaveBeenCalledTimes(2);
    });
  });

  describe("getUserState", () => {
    it("returns zero state when user has no shares", async () => {
      const client = createMockClient({
        readContractResult: SHARE,
        multicallResults: [
          // Batch 1: all zeros
          [
            { result: 0n }, { result: 0n }, { result: 0n },
            { result: false }, { result: 0n },
          ],
        ],
      });

      const state = await VaultReader.getUserState(client, VAULT, USER, "SYNC_DEPOSIT_ASYNC_REDEEM", 6);

      expect(state.shareBalance).toBe(0n);
      expect(state.hasPending).toBe(false);
      expect(state.hasClaimable).toBe(false);
      expect(state.hasClaimableCancelRedeem).toBe(false);
      expect(state.positionValueFormatted).toBe("0");
      expect(state.isLoading).toBe(false);
    });

    it("returns populated state when user has shares", async () => {
      const client = createMockClient({
        readContractResult: SHARE,
        multicallResults: [
          // Batch 1: share data
          [
            { result: 100n * 10n ** 18n }, // shareBalance
            { result: 50n * 10n ** 18n },  // pendingShares
            { result: 25n * 10n ** 18n },  // claimableShares
            { result: false },
            { result: 0n },
          ],
          // Batch 3: conversions (batch 2 skipped for SYNC_DEPOSIT_ASYNC_REDEEM)
          [
            { result: 100000000n }, // positionAssets (100 USDC)
            { result: 50000000n },  // pendingAssets (50 USDC)
            { result: 25000000n },  // claimableAssets (25 USDC)
          ],
        ],
      });

      const state = await VaultReader.getUserState(client, VAULT, USER, "SYNC_DEPOSIT_ASYNC_REDEEM", 6);

      expect(state.shareBalance).toBe(100n * 10n ** 18n);
      expect(state.hasPending).toBe(true);
      expect(state.hasClaimable).toBe(true);
      expect(state.positionValueFormatted).toBe("100");
      expect(state.pendingAssetsFormatted).toBe("50");
      expect(state.claimableAssetsFormatted).toBe("25");
    });

    it("reads async deposit state for ASYNC vaults", async () => {
      const client = createMockClient({
        readContractResult: SHARE,
        multicallResults: [
          // Batch 1
          [{ result: 0n }, { result: 0n }, { result: 0n }, { result: false }, { result: 0n }],
          // Batch 2: async deposit state
          [
            { result: 500000n }, // pendingDepositAssets
            { result: 200000n }, // claimableDepositAssets
          ],
        ],
      });

      const state = await VaultReader.getUserState(client, VAULT, USER, "ASYNC", 6);

      expect(state.hasPendingDeposit).toBe(true);
      expect(state.hasClaimableDeposit).toBe(true);
      expect(state.pendingDepositAssets).toBe(500000n);
      expect(state.claimableDepositAssets).toBe(200000n);
    });

    it("skips async deposit batch for SYNC_DEPOSIT_ASYNC_REDEEM vaults", async () => {
      const client = createMockClient({
        readContractResult: SHARE,
        multicallResults: [
          [{ result: 0n }, { result: 0n }, { result: 0n }, { result: false }, { result: 0n }],
        ],
      });

      const state = await VaultReader.getUserState(client, VAULT, USER, "SYNC_DEPOSIT_ASYNC_REDEEM", 6);

      expect(state.pendingDepositAssets).toBe(0n);
      expect(state.claimableDepositAssets).toBe(0n);
      expect(state.hasPendingDeposit).toBe(false);
      // multicall called once (batch 1 only, no batch 2 or 3)
      expect(client.multicall).toHaveBeenCalledTimes(1);
    });
  });

  describe("getAllowance", () => {
    it("returns allowance from readContract", async () => {
      const client = createMockClient({ readContractResult: 500n });
      const allowance = await VaultReader.getAllowance(client, ASSET, USER, VAULT);
      expect(allowance).toBe(500n);
    });
  });

  describe("getBalance", () => {
    it("returns balance from readContract", async () => {
      const client = createMockClient({ readContractResult: 1000n });
      const balance = await VaultReader.getBalance(client, ASSET, USER);
      expect(balance).toBe(1000n);
    });
  });

  describe("getMaxDeposit", () => {
    it("returns max deposit from readContract", async () => {
      const client = createMockClient({ readContractResult: 999999n });
      const max = await VaultReader.getMaxDeposit(client, VAULT, USER);
      expect(max).toBe(999999n);
    });
  });

  describe("getMaxRedeem", () => {
    it("returns max redeem from readContract", async () => {
      const client = createMockClient({ readContractResult: 888n });
      const max = await VaultReader.getMaxRedeem(client, VAULT, USER);
      expect(max).toBe(888n);
    });
  });

  describe("convertToAssets", () => {
    it("converts shares to assets", async () => {
      const client = createMockClient({ readContractResult: 1000000n });
      const assets = await VaultReader.convertToAssets(client, VAULT, 10n ** 18n);
      expect(assets).toBe(1000000n);
    });
  });

  describe("convertToShares", () => {
    it("converts assets to shares", async () => {
      const client = createMockClient({ readContractResult: 10n ** 18n });
      const shares = await VaultReader.convertToShares(client, VAULT, 1000000n);
      expect(shares).toBe(10n ** 18n);
    });
  });
});
