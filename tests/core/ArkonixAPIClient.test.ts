import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ArkonixAPIClient } from "../../src/core/api/ArkonixAPIClient";

const BASE = "https://api.example.com";
const VAULT = "0x1111111111111111111111111111111111111111";
const SCID = "0x0003000000000001000000000000000b";

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true;
  const status = init.status ?? 200;
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  } as Response);
}

describe("ArkonixAPIClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires a baseUrl", () => {
    // @ts-expect-error intentionally invalid
    expect(() => new ArkonixAPIClient({})).toThrow(/baseUrl/);
  });

  it("strips a trailing slash from baseUrl", async () => {
    const fetchMock = mockFetchOnce(rawVaultDetail());
    vi.stubGlobal("fetch", fetchMock);

    const client = new ArkonixAPIClient({ baseUrl: `${BASE}/` });
    await client.getVaultFinancials(VAULT);

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE}/public/vaults/${VAULT}`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  describe("getVaultFinancials", () => {
    it("normalizes snake_case into camelCase", async () => {
      vi.stubGlobal("fetch", mockFetchOnce(rawVaultDetail()));
      const client = new ArkonixAPIClient({ baseUrl: BASE });

      const fin = await client.getVaultFinancials(VAULT);

      expect(fin.shareClassId).toBe(SCID);
      expect(fin.symbol).toBe("DGI");
      expect(fin.tvlUsd).toBe(1234.56);
      expect(fin.sharePrice).toBe(0.9862);
      expect(fin.return7d).toBe(12.5);
      expect(fin.return30d).toBeNull();
      expect(fin.return90d).toBeNull();
      expect(fin.returnAllTime).toBe(-50.05);
      expect(fin.vaults).toEqual([
        { vaultAddress: VAULT, chainId: 42161, chainName: "Arbitrum" },
      ]);
    });

    it("preserves null return (does not coerce to 0)", async () => {
      vi.stubGlobal("fetch", mockFetchOnce(rawVaultDetail({ return_7d_pct: null })));
      const client = new ArkonixAPIClient({ baseUrl: BASE });

      const fin = await client.getVaultFinancials(VAULT);
      expect(fin.return7d).toBeNull();
    });

    it("throws a clear 404 error", async () => {
      vi.stubGlobal("fetch", mockFetchOnce({}, { ok: false, status: 404 }));
      const client = new ArkonixAPIClient({ baseUrl: BASE });

      await expect(client.getVaultFinancials(VAULT)).rejects.toThrow(/not found/i);
    });

    it("throws a clear 400 error", async () => {
      vi.stubGlobal("fetch", mockFetchOnce({}, { ok: false, status: 400 }));
      const client = new ArkonixAPIClient({ baseUrl: BASE });

      await expect(client.getVaultFinancials(VAULT)).rejects.toThrow(/bad request/i);
    });
  });

  describe("getReturnHistory", () => {
    it("appends the days query param and normalizes points", async () => {
      const fetchMock = mockFetchOnce(rawReturnHistory());
      vi.stubGlobal("fetch", fetchMock);
      const client = new ArkonixAPIClient({ baseUrl: BASE });

      const hist = await client.getReturnHistory(SCID, { days: 90 });

      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/public/share-classes/${SCID}/apy-history?days=90`,
        expect.anything(),
      );
      expect(hist.return7d).toBe(12.5);
      expect(hist.returnAllTime).toBe(-50.05);
      expect(hist.currentSharePrice).toBe(0.9862);
      expect(hist.points).toHaveLength(2);
      expect(hist.points[0]).toEqual({
        timestamp: 1780069595,
        sharePrice: 1.0,
        cumulativeReturnPct: 0.0,
        cumulativeReturnSinceInceptionPct: 0.0,
      });
    });

    it("defaults a missing since-inception point value to null", async () => {
      vi.stubGlobal("fetch", mockFetchOnce(rawReturnHistory()));
      const client = new ArkonixAPIClient({ baseUrl: BASE });

      const hist = await client.getReturnHistory(SCID);
      // Second fixture point omits cumulative_return_since_inception_pct.
      expect(hist.points[1].cumulativeReturnSinceInceptionPct).toBeNull();
    });

    it("omits the query string when days is not provided", async () => {
      const fetchMock = mockFetchOnce(rawReturnHistory());
      vi.stubGlobal("fetch", fetchMock);
      const client = new ArkonixAPIClient({ baseUrl: BASE });

      await client.getReturnHistory(SCID);
      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/public/share-classes/${SCID}/apy-history`,
        expect.anything(),
      );
    });

    it("defaults missing points to an empty array", async () => {
      vi.stubGlobal("fetch", mockFetchOnce(rawReturnHistory({ points: undefined })));
      const client = new ArkonixAPIClient({ baseUrl: BASE });

      const hist = await client.getReturnHistory(SCID);
      expect(hist.points).toEqual([]);
    });
  });

  describe("getTvlHistory", () => {
    it("normalizes tvl points", async () => {
      vi.stubGlobal("fetch", mockFetchOnce(rawTvlHistory()));
      const client = new ArkonixAPIClient({ baseUrl: BASE });

      const hist = await client.getTvlHistory(SCID, { days: 30 });
      expect(hist.currentTvlUsd).toBe(1234.56);
      expect(hist.points[0]).toEqual({
        timestamp: 1780069595,
        tvlUsd: 1000,
        sharePrice: 1.0,
        totalSupply: 1000,
      });
    });
  });

  describe("getSharePriceHistory", () => {
    it("maps price_points → points", async () => {
      vi.stubGlobal("fetch", mockFetchOnce(rawSharePriceHistory()));
      const client = new ArkonixAPIClient({ baseUrl: BASE });

      const hist = await client.getSharePriceHistory(VAULT);
      expect(hist.vaultAddress).toBe(VAULT);
      expect(hist.chainId).toBe(42161);
      expect(hist.currentPrice).toBe(0.9862);
      expect(hist.points[0]).toEqual({
        blockNumber: 100,
        timestamp: 1780069595,
        sharePrice: 1.0,
        txHash: "0xabc",
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Raw fixtures (backend snake_case)
// ---------------------------------------------------------------------------

function rawVaultDetail(overrides: Record<string, unknown> = {}) {
  return {
    share_class_id: SCID,
    name: "DeFi Growth Index",
    symbol: "DGI",
    share_token_address: "0x5555555555555555555555555555555555555555",
    share_price: 0.9862,
    tvl: 1234.56,
    return_7d_pct: 12.5,
    return_30d_pct: null,
    return_90d_pct: null,
    return_all_time_pct: -50.05,
    vaults: [{ vault_address: VAULT, chain_id: 42161, chain_name: "Arbitrum" }],
    ...overrides,
  };
}

function rawReturnHistory(overrides: Record<string, unknown> = {}) {
  return {
    share_class_id: SCID,
    symbol: "DGI",
    days: 30,
    return_7d_pct: 12.5,
    return_30d_pct: null,
    return_90d_pct: null,
    return_all_time_pct: -50.05,
    current_share_price: 0.9862,
    points: [
      {
        timestamp: 1780069595,
        share_price: 1.0,
        cumulative_return_pct: 0.0,
        cumulative_return_since_inception_pct: 0.0,
      },
      // Second point omits cumulative_return_since_inception_pct → normalizes to null.
      { timestamp: 1780079440, share_price: 0.2669, cumulative_return_pct: -73.3079 },
    ],
    ...overrides,
  };
}

function rawTvlHistory(overrides: Record<string, unknown> = {}) {
  return {
    share_class_id: SCID,
    symbol: "DGI",
    days: 30,
    current_tvl_usd: 1234.56,
    points: [
      { timestamp: 1780069595, tvl_usd: 1000, share_price: 1.0, total_supply: 1000 },
    ],
    ...overrides,
  };
}

function rawSharePriceHistory(overrides: Record<string, unknown> = {}) {
  return {
    vault_address: VAULT,
    chain_id: 42161,
    current_price: 0.9862,
    price_points: [
      { block_number: 100, timestamp: 1780069595, share_price: 1.0, tx_hash: "0xabc" },
    ],
    ...overrides,
  };
}
