import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import type {
  HistoryQueryParams,
  ReturnHistory,
  ShareClassFees,
  SharePriceHistory,
  TvlHistory,
  VaultAssetDistribution,
  VaultFinancials,
  VaultTransactions,
  VaultTransactionsQueryParams,
} from "../types/arkonixApi";
import { useVaultContext } from "../provider/VaultContext";

const NOT_CONFIGURED =
  "Arkonix API not configured. Pass config.arkonixAPI.baseUrl to VaultProvider.";

/**
 * Read a vault's financial snapshot — NAV (TVL), share price, and all return windows —
 * from the Arkonix backend, given only the vault address. The address-only entry
 * point for partner UIs. Also returns the share-class id used by the *History hooks.
 */
export function useVaultFinancials(vaultAddress: Address | undefined) {
  const { arkonixAPIClient } = useVaultContext();

  return useQuery<VaultFinancials, Error>({
    queryKey: ["arkonix-vault-financials", vaultAddress],
    queryFn: () => {
      if (!arkonixAPIClient) throw new Error(NOT_CONFIGURED);
      return arkonixAPIClient.getVaultFinancials(vaultAddress!);
    },
    enabled: !!vaultAddress && !!arkonixAPIClient,
    staleTime: 60_000,
  });
}

/** Returns (7/30/90d cumulative, all-time) plus a return series for a share class. */
export function useReturnHistory(
  shareClassId: string | undefined,
  params: HistoryQueryParams = {},
) {
  const { arkonixAPIClient } = useVaultContext();

  return useQuery<ReturnHistory, Error>({
    queryKey: ["arkonix-return-history", shareClassId, params],
    queryFn: () => {
      if (!arkonixAPIClient) throw new Error(NOT_CONFIGURED);
      return arkonixAPIClient.getReturnHistory(shareClassId!, params);
    },
    enabled: !!shareClassId && !!arkonixAPIClient,
    staleTime: 5 * 60_000,
  });
}

/** TVL (NAV) time series for a share class. */
export function useTvlHistory(
  shareClassId: string | undefined,
  params: HistoryQueryParams = {},
) {
  const { arkonixAPIClient } = useVaultContext();

  return useQuery<TvlHistory, Error>({
    queryKey: ["arkonix-tvl-history", shareClassId, params],
    queryFn: () => {
      if (!arkonixAPIClient) throw new Error(NOT_CONFIGURED);
      return arkonixAPIClient.getTvlHistory(shareClassId!, params);
    },
    enabled: !!shareClassId && !!arkonixAPIClient,
    staleTime: 5 * 60_000,
  });
}

/** Raw on-chain share-price event history for a vault. */
export function useSharePriceHistory(vaultAddress: Address | undefined) {
  const { arkonixAPIClient } = useVaultContext();

  return useQuery<SharePriceHistory, Error>({
    queryKey: ["arkonix-share-price-history", vaultAddress],
    queryFn: () => {
      if (!arkonixAPIClient) throw new Error(NOT_CONFIGURED);
      return arkonixAPIClient.getSharePriceHistory(vaultAddress!);
    },
    enabled: !!vaultAddress && !!arkonixAPIClient,
    staleTime: 60_000,
  });
}

/**
 * A user's transaction activity (deposits, redeems, pending requests) for a vault.
 * Keyed by vault address; pass a `userAddress` in `params` to scope to one user.
 * The query stays disabled until a `userAddress` is supplied (an all-users list is
 * rarely what a partner UI wants — pass `{ userAddress }` explicitly).
 */
export function useVaultTransactions(
  vaultAddress: Address | undefined,
  params: VaultTransactionsQueryParams = {},
) {
  const { arkonixAPIClient } = useVaultContext();

  return useQuery<VaultTransactions, Error>({
    queryKey: ["arkonix-vault-transactions", vaultAddress, params],
    queryFn: () => {
      if (!arkonixAPIClient) throw new Error(NOT_CONFIGURED);
      return arkonixAPIClient.getVaultTransactions(vaultAddress!, params);
    },
    enabled: !!vaultAddress && !!params.userAddress && !!arkonixAPIClient,
    staleTime: 30_000,
  });
}

/**
 * A vault's asset distribution (per-asset holdings with pre-computed weights),
 * from the Arkonix backend. Keyed by share-class id — obtain it from
 * `useVaultFinancials(vault).data.shareClassId`.
 *
 * This is the Arkonix-native holdings source (weights included, vault-scoped). It
 * is distinct from the Centrifuge-keyed `useVaultHoldings(poolId, tokenId)`.
 */
export function useVaultAssetDistribution(shareClassId: string | undefined) {
  const { arkonixAPIClient } = useVaultContext();

  return useQuery<VaultAssetDistribution, Error>({
    queryKey: ["arkonix-asset-distribution", shareClassId],
    queryFn: () => {
      if (!arkonixAPIClient) throw new Error(NOT_CONFIGURED);
      return arkonixAPIClient.getAssetDistribution(shareClassId!);
    },
    enabled: !!shareClassId && !!arkonixAPIClient,
    staleTime: 5 * 60_000,
  });
}

/**
 * The fee structure (management + performance rates) for a share class. Keyed by
 * share-class id — obtain it from `useVaultFinancials(vault).data.shareClassId`.
 * The returns from `useVaultFinancials` are already net of these fees.
 */
export function useShareClassFees(shareClassId: string | undefined) {
  const { arkonixAPIClient } = useVaultContext();

  return useQuery<ShareClassFees, Error>({
    queryKey: ["arkonix-share-class-fees", shareClassId],
    queryFn: () => {
      if (!arkonixAPIClient) throw new Error(NOT_CONFIGURED);
      return arkonixAPIClient.getShareClassFees(shareClassId!);
    },
    enabled: !!shareClassId && !!arkonixAPIClient,
    staleTime: 10 * 60_000,
  });
}
