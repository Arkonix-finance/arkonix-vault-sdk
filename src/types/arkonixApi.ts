/**
 * Types for the Arkonix backend API — financial data (NAV, APY, share price, history).
 *
 * These fields are sourced from the Arkonix execution service's PUBLIC endpoints
 * (no auth required), keyed by vault address or share-class id. The SDK normalizes
 * the backend's snake_case JSON into camelCase here.
 */

export interface ArkonixAPIConfig {
  /** Base URL of the Arkonix execution API, e.g. "https://api.arkonix.xyz" */
  baseUrl: string;
  /** Request timeout in ms (default 30000) */
  timeout?: number;
}

/** A single vault deployment within a share class. */
export interface ArkonixVaultRef {
  vaultAddress: string;
  chainId: number;
  chainName?: string;
}

/**
 * Financial snapshot for a vault / share class.
 * Source: `GET /public/vaults/{vault_address}`.
 */
export interface VaultFinancials {
  /** Internal share-class id (hex), e.g. "0x0001…". Needed for history endpoints. */
  shareClassId: string;
  name: string;
  symbol: string;
  shareTokenAddress?: string;
  /** Net asset value per share (NAV per share). `null` until first price update. */
  sharePrice: number | null;
  /** Total value locked, in USD. This is the vault/share-class NAV. */
  tvlUsd: number;
  /**
   * Annualized yield, as a percent (e.g. 12.5 = 12.5%), clamped to [-99, 1000].
   * `null` means insufficient valid history for the window — `null` is NOT `0`,
   * so never coerce it to 0 or average nulls as zeros (common on young vaults).
   * Headline APYs are daily-cached; they intentionally won't reconcile exactly
   * with the live ~15-min share-price `points` series.
   */
  apy7d: number | null;
  apy30d: number | null;
  apy90d: number | null;
  apyAllTime: number | null;
  /** Other vaults belonging to the same share class. */
  vaults: ArkonixVaultRef[];
}

/** One point in an APY / cumulative-return series. */
export interface ApyHistoryPoint {
  /** Unix seconds. */
  timestamp: number;
  sharePrice: number;
  /** (sharePrice / firstInWindow - 1) * 100. */
  cumulativeReturnPct: number;
}

/**
 * APY history for a share class.
 * Source: `GET /public/share-classes/{share_class_id}/apy-history?days=`.
 */
export interface ApyHistory {
  shareClassId: string;
  symbol: string | null;
  days: number;
  /** Percent, clamped [-99, 1000]. `null` = insufficient history; never treat as 0. */
  apy7d: number | null;
  apy30d: number | null;
  apy90d: number | null;
  apyAllTime: number | null;
  /** Live current share price; `0` if unset. */
  currentSharePrice: number;
  /** ~50 points, oldest → newest; `[]` when there's no history in the window. */
  points: ApyHistoryPoint[];
}

/** One point in a TVL series. */
export interface TvlHistoryPoint {
  /** Unix seconds. */
  timestamp: number;
  tvlUsd: number;
  sharePrice: number;
  totalSupply: number | null;
}

/**
 * TVL history for a share class.
 * Source: `GET /public/share-classes/{share_class_id}/tvl-history?days=`.
 */
export interface TvlHistory {
  shareClassId: string;
  symbol: string | null;
  days: number;
  currentTvlUsd: number;
  points: TvlHistoryPoint[];
}

/** One on-chain share-price event. */
export interface SharePricePoint {
  blockNumber: number;
  /** Unix seconds; `null` if the block timestamp is unavailable. */
  timestamp: number | null;
  sharePrice: number;
  txHash: string;
}

/**
 * On-chain share-price event history for a vault.
 * Source: `GET /public/vaults/{vault_address}/share-price-history`.
 */
export interface SharePriceHistory {
  vaultAddress: string;
  chainId: number;
  currentPrice: number | null;
  points: SharePricePoint[];
}

/** Optional time-window for history queries. */
export interface HistoryQueryParams {
  /**
   * Lookback window in days for the chart series (default 30, range 1..365).
   * Controls the `points` window only — not the headline APYs, which are fixed
   * 7/30/90d/all-time. `cumulativeReturnPct` is relative to the first point in
   * the returned window, so it resets per `days` value.
   */
  days?: number;
}
