/**
 * Types for the Arkonix backend API — financial data (NAV, returns, share price, history).
 *
 * These fields are sourced from the Arkonix execution service's PUBLIC endpoints
 * (no auth required), keyed by vault address or share-class id. The SDK normalizes
 * the backend's snake_case JSON into camelCase here.
 *
 * `return7d/30d/90d` are CUMULATIVE % returns over the window (not annualized);
 * `returnAllTime` is annualized since inception for vaults with ≥30d of history,
 * otherwise cumulative. All are percentages (12.5 = 12.5%) and nullable.
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
   * CUMULATIVE % return over the window (e.g. 12.5 = 12.5%) — NOT annualized.
   * A -7% month reads -7, never -60. `null` means insufficient valid history
   * for the window — `null` is NOT `0`, so never coerce it to 0 or average
   * nulls as zeros (common on young vaults).
   */
  return7d: number | null;
  return30d: number | null;
  return90d: number | null;
  /**
   * ANNUALIZED return since inception for vaults with ≥30 days of settled
   * history; CUMULATIVE for younger ones. The only annualized field.
   * Percent, bounded to roughly [-99, 1000]. `null` = insufficient history.
   * Daily-cached — won't reconcile exactly with the live `points` series.
   */
  returnAllTime: number | null;
  /** Other vaults belonging to the same share class. */
  vaults: ArkonixVaultRef[];
}

/** One point in a return / share-price series. */
export interface ReturnHistoryPoint {
  /** Unix seconds. */
  timestamp: number;
  /** NAV per share at this time. */
  sharePrice: number;
  /** % return vs the FIRST point in the returned window (resets per `days`). */
  cumulativeReturnPct: number;
  /**
   * Absolute (CUMULATIVE) % return since true inception. Use this (not
   * `cumulativeReturnPct`) to chart all-time performance. `null` if there's no
   * inception baseline.
   *
   * Both per-point return fields are CUMULATIVE — there is no per-point annualized
   * series. The only annualized number in the API is the top-level
   * `returnAllTime` headline (annualizing a per-point series is noisy/explosive
   * early in a vault's life, so it isn't provided).
   */
  cumulativeReturnSinceInceptionPct: number | null;
}

/**
 * Return history for a share class.
 * Source: `GET /public/share-classes/{share_class_id}/apy-history?days=`.
 *
 * `return7d/30d/90d` are cumulative; `returnAllTime` is annualized (≥30d) or
 * cumulative. The headline `return*` fields are daily-cached, while `points` is
 * the live ~15-min series — the last point will NOT equal `returnAllTime`.
 */
export interface ReturnHistory {
  shareClassId: string;
  symbol: string | null;
  days: number;
  /** Cumulative %, `null` = insufficient history; never treat as 0. */
  return7d: number | null;
  return30d: number | null;
  return90d: number | null;
  /** Annualized since inception (≥30d) or cumulative; the only annualized field. */
  returnAllTime: number | null;
  /** Live current share price; `0` if unset. */
  currentSharePrice: number;
  /** ~50 points, oldest → newest; `[]` when there's no history in the window. */
  points: ReturnHistoryPoint[];
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
   * Controls the `points` window only — not the headline `return*` fields, which
   * are fixed 7/30/90d/all-time. `cumulativeReturnPct` is relative to the first
   * point in the returned window, so it resets per `days` value.
   */
  days?: number;
}

// ---------------------------------------------------------------------------
// User transaction activity
// ---------------------------------------------------------------------------

/**
 * The kind of user activity a `VaultTransaction` represents.
 *
 * - `DEPOSIT` / `WITHDRAWAL`: a settled deposit or redeem (a claim settles as
 *   `WITHDRAWAL`).
 * - `DEPOSIT_REQUEST` / `REDEEM_REQUEST`: a request that has been submitted but
 *   not yet settled by the epoch.
 */
export type VaultTransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'DEPOSIT_REQUEST'
  | 'REDEEM_REQUEST';

/** One row of a user's historical activity on a vault. */
export interface VaultTransaction {
  type: VaultTransactionType;
  /** The user (controller) address this row belongs to. */
  userAddress: string;
  /** Asset amount (human-readable, e.g. 100.5 USDC). `0` where not applicable. */
  amount: number;
  /** Share amount (human-readable). `0` where not applicable. */
  shares: number;
  /** NAV per share at the time of the transaction. */
  sharePrice: number;
  /** On-chain tx hash; `null` for a request row still awaiting its tx. */
  txHash: string | null;
  /** Block number; `null` until on-chain. */
  blockNumber: number | null;
  /** ISO-8601 timestamp string; `null` if unknown. */
  timestamp: string | null;
}

/**
 * A user's transaction history for a vault.
 * Source: `GET /public/vaults/{vault_address}/transactions?user_address=`.
 */
export interface VaultTransactions {
  vaultAddress: string;
  /** Total rows available for this user (may exceed `transactions.length` when paginated). */
  totalTransactions: number;
  /** Newest → oldest is NOT guaranteed; sort client-side by `timestamp` if order matters. */
  transactions: VaultTransaction[];
}

/** Optional filters for a user transactions query. */
export interface VaultTransactionsQueryParams {
  /** Restrict to a single user (controller) address. Omit for all users on the vault. */
  userAddress?: string;
  /** Restrict to one transaction type, or `'ALL'` (default) for every type. */
  transactionType?: VaultTransactionType | 'ALL';
  /** Max rows to return. */
  limit?: number;
  /** Row offset for pagination. */
  offset?: number;
}

// ---------------------------------------------------------------------------
// Asset distribution (holdings) — Arkonix-native, weights included
// ---------------------------------------------------------------------------

/** One asset the vault holds, with its share of TVL already computed. */
export interface VaultHoldingAsset {
  symbol: string;
  /** Amount held, human-readable (already decimal-adjusted). */
  amountHuman: number;
  /** USD value of this holding. */
  valueUsd: number;
  /** Percent of the vault's total value this asset represents (e.g. 42.5 = 42.5%). */
  pctOfTvl: number;
}

/**
 * A vault's asset distribution (holdings breakdown with weights).
 * Source: `GET /public/share-classes/{share_class_id}/holdings`.
 *
 * `pctOfTvl` is computed by the backend — do not re-derive it from
 * `valueUsd / totalValueUsd` (rounding and off-chain assets can make them differ).
 */
export interface VaultAssetDistribution {
  shareClassId: string;
  symbol: string | null;
  name: string | null;
  /** Total USD value across all holdings. */
  totalValueUsd: number;
  assets: VaultHoldingAsset[];
  /** `true` when some holdings could not be priced/included (see `partialReasons`). */
  partial: boolean;
  /** Human-readable reasons a `partial` result is incomplete. */
  partialReasons: string[];
}

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------

/** Fee rates for a share class, in basis points and percent. */
export interface ShareClassFeeConfig {
  /** Management fee in basis points (100 bps = 1%). */
  managementFeeBps: number;
  /** Performance fee in basis points. */
  performanceFeeBps: number;
  /** Management fee as a percent string, e.g. "1.00". */
  managementFeePct: string;
  /** Performance fee as a percent string, e.g. "10.00". */
  performanceFeePct: string;
}

/**
 * Fee structure for a share class, read from the on-chain fee manager.
 * Source: `GET /public/share-classes/{share_class_id}/fees`.
 *
 * The headline returns from `useVaultFinancials` are ALREADY net of these fees;
 * use this only to display the fee breakdown (e.g. "net of 1% mgmt + 10% perf").
 */
export interface ShareClassFees {
  shareClassId: string;
  symbol: string | null;
  /** Address fees accrue to; `null` if unset. */
  feeRecipient: string | null;
  /** `false` when the fee manager has not been initialized for this share class. */
  isInitialized: boolean;
  /** `null` when uninitialized — treat as "no fees configured", not zero fees. */
  config: ShareClassFeeConfig | null;
}
