import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import type {
  HistoryQueryParams,
  ReturnHistory,
  SharePriceHistory,
  TvlHistory,
  VaultFinancials,
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
