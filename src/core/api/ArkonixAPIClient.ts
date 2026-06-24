import type {
  ApyHistory,
  ArkonixAPIConfig,
  HistoryQueryParams,
  SharePriceHistory,
  TvlHistory,
  VaultFinancials,
} from '../../types/arkonixApi';

/**
 * Client for the Arkonix backend's public financial-data API.
 *
 * Provides NAV (TVL), APY, share price, and historical series for a vault —
 * the data a partner needs to build a UI but which is not available on-chain.
 * All endpoints used here are public (no authentication).
 */
export class ArkonixAPIClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: ArkonixAPIConfig) {
    if (!config?.baseUrl) {
      throw new Error('ArkonixAPIClient requires a baseUrl');
    }
    // Normalize: drop a trailing slash so we can join path segments cleanly.
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.timeout = config.timeout ?? 30000;
  }

  private async get<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Arkonix API: not found (${path})`);
        }
        if (response.status === 400) {
          throw new Error(`Arkonix API: bad request — check the identifier format (${path})`);
        }
        throw new Error(`Arkonix API error ${response.status} for ${path}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Arkonix API request timeout after ${this.timeout}ms (${path})`);
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get the current financial snapshot (NAV/TVL, share price, all APYs) for a vault,
   * plus the share-class id needed to query history. The address-only entry point.
   */
  async getVaultFinancials(vaultAddress: string): Promise<VaultFinancials> {
    const raw = await this.get<RawVaultDetail>(`/public/vaults/${vaultAddress}`);
    return normalizeVaultFinancials(raw);
  }

  /** APY (7/30/90d, all-time) plus a cumulative-return series for a share class. */
  async getApyHistory(shareClassId: string, params: HistoryQueryParams = {}): Promise<ApyHistory> {
    const qs = buildHistoryQuery(params);
    const raw = await this.get<RawApyHistory>(
      `/public/share-classes/${shareClassId}/apy-history${qs}`,
    );
    return normalizeApyHistory(raw);
  }

  /** TVL (NAV) time series for a share class. */
  async getTvlHistory(shareClassId: string, params: HistoryQueryParams = {}): Promise<TvlHistory> {
    const qs = buildHistoryQuery(params);
    const raw = await this.get<RawTvlHistory>(
      `/public/share-classes/${shareClassId}/tvl-history${qs}`,
    );
    return normalizeTvlHistory(raw);
  }

  /** Raw on-chain share-price event history for a vault. */
  async getSharePriceHistory(vaultAddress: string): Promise<SharePriceHistory> {
    const raw = await this.get<RawSharePriceHistory>(
      `/public/vaults/${vaultAddress}/share-price-history`,
    );
    return normalizeSharePriceHistory(raw);
  }
}

// ---------------------------------------------------------------------------
// Raw backend shapes (snake_case) and normalizers
// ---------------------------------------------------------------------------

interface RawVaultRef {
  vault_address: string;
  chain_id: number;
  chain_name?: string;
}

interface RawVaultDetail {
  share_class_id: string;
  name: string;
  symbol: string;
  share_token_address?: string;
  share_price: number | null;
  tvl: number;
  apy_7d: number | null;
  apy_30d: number | null;
  apy_90d: number | null;
  apy_all_time: number | null;
  vaults?: RawVaultRef[];
}

interface RawApyPoint {
  timestamp: number;
  share_price: number;
  cumulative_return_pct: number;
}

interface RawApyHistory {
  share_class_id: string;
  symbol: string | null;
  days: number;
  apy_7d: number | null;
  apy_30d: number | null;
  apy_90d: number | null;
  apy_all_time: number | null;
  current_share_price: number;
  points?: RawApyPoint[];
}

interface RawTvlPoint {
  timestamp: number;
  tvl_usd: number;
  share_price: number;
  total_supply: number | null;
}

interface RawTvlHistory {
  share_class_id: string;
  symbol: string | null;
  days: number;
  current_tvl_usd: number;
  points?: RawTvlPoint[];
}

interface RawSharePricePoint {
  block_number: number;
  timestamp: number | null;
  share_price: number;
  tx_hash: string;
}

interface RawSharePriceHistory {
  vault_address: string;
  chain_id: number;
  current_price: number | null;
  price_points?: RawSharePricePoint[];
}

function buildHistoryQuery(params: HistoryQueryParams): string {
  return params.days !== undefined ? `?days=${params.days}` : '';
}

function normalizeVaultFinancials(raw: RawVaultDetail): VaultFinancials {
  return {
    shareClassId: raw.share_class_id,
    name: raw.name,
    symbol: raw.symbol,
    shareTokenAddress: raw.share_token_address,
    sharePrice: raw.share_price,
    tvlUsd: raw.tvl,
    apy7d: raw.apy_7d,
    apy30d: raw.apy_30d,
    apy90d: raw.apy_90d,
    apyAllTime: raw.apy_all_time,
    vaults: (raw.vaults ?? []).map((v) => ({
      vaultAddress: v.vault_address,
      chainId: v.chain_id,
      chainName: v.chain_name,
    })),
  };
}

function normalizeApyHistory(raw: RawApyHistory): ApyHistory {
  return {
    shareClassId: raw.share_class_id,
    symbol: raw.symbol,
    days: raw.days,
    apy7d: raw.apy_7d,
    apy30d: raw.apy_30d,
    apy90d: raw.apy_90d,
    apyAllTime: raw.apy_all_time,
    currentSharePrice: raw.current_share_price,
    points: (raw.points ?? []).map((p) => ({
      timestamp: p.timestamp,
      sharePrice: p.share_price,
      cumulativeReturnPct: p.cumulative_return_pct,
    })),
  };
}

function normalizeTvlHistory(raw: RawTvlHistory): TvlHistory {
  return {
    shareClassId: raw.share_class_id,
    symbol: raw.symbol,
    days: raw.days,
    currentTvlUsd: raw.current_tvl_usd,
    points: (raw.points ?? []).map((p) => ({
      timestamp: p.timestamp,
      tvlUsd: p.tvl_usd,
      sharePrice: p.share_price,
      totalSupply: p.total_supply,
    })),
  };
}

function normalizeSharePriceHistory(raw: RawSharePriceHistory): SharePriceHistory {
  return {
    vaultAddress: raw.vault_address,
    chainId: raw.chain_id,
    currentPrice: raw.current_price,
    points: (raw.price_points ?? []).map((p) => ({
      blockNumber: p.block_number,
      timestamp: p.timestamp,
      sharePrice: p.share_price,
      txHash: p.tx_hash,
    })),
  };
}
