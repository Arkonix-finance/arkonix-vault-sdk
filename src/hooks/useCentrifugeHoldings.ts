import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { CentrifugeAPIClient } from "../core/api";
import type { HoldingsQueryParams, CentrifugeHoldingEscrow } from "../types/centrifugeApi";

/**
 * Hook to query Centrifuge holdings with optional filters
 * @param params Query parameters including poolId and tokenId filters
 * @param apiClient Optional CentrifugeAPIClient instance (creates one if not provided)
 * @returns Query result with holdings data
 *
 * @deprecated Prefer `useVaultAssetDistribution(shareClassId)` — the Arkonix-native
 * holdings source, keyed by share-class id (from `useVaultFinancials`) and returning
 * pre-computed `pctOfTvl` weights. This Centrifuge-keyed hook returns raw amounts with
 * no weights. Planned for removal in v3.0.0. See MIGRATION.md.
 */
export function useCentrifugeHoldings(
  params: HoldingsQueryParams = {},
  apiClient?: CentrifugeAPIClient
) {
  const client = useMemo(() => apiClient || new CentrifugeAPIClient(), [apiClient]);

  return useQuery<CentrifugeHoldingEscrow[], Error>({
    queryKey: ['centrifuge-holdings', params],
    queryFn: () => client.getHoldings(params),
    enabled: true,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });
}

/**
 * Hook to query holdings for a specific vault
 * @param poolId The pool ID
 * @param tokenId The token ID
 * @param apiClient Optional CentrifugeAPIClient instance
 * @returns Query result with vault holdings data
 *
 * @deprecated Prefer `useVaultAssetDistribution(shareClassId)` — Arkonix-native,
 * keyed by share-class id (not Centrifuge pool/token id), and includes computed
 * `pctOfTvl` weights. Note the different key and return shape — not a drop-in
 * rename. Planned for removal in v3.0.0. See MIGRATION.md.
 */
export function useVaultHoldings(
  poolId: string | undefined,
  tokenId: string | undefined,
  apiClient?: CentrifugeAPIClient
) {
  const client = useMemo(() => apiClient || new CentrifugeAPIClient(), [apiClient]);

  return useQuery<CentrifugeHoldingEscrow[], Error>({
    queryKey: ['vault-holdings', poolId, tokenId],
    queryFn: () => client.getVaultHoldings(poolId!, tokenId!),
    enabled: !!poolId && !!tokenId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to query all holdings for a specific pool
 * @param poolId The pool ID
 * @param apiClient Optional CentrifugeAPIClient instance
 * @returns Query result with pool holdings data
 *
 * @deprecated Prefer `useVaultAssetDistribution(shareClassId)` for a vault's asset
 * breakdown with computed weights. Planned for removal in v3.0.0. See MIGRATION.md.
 */
export function usePoolHoldings(
  poolId: string | undefined,
  apiClient?: CentrifugeAPIClient
) {
  const client = useMemo(() => apiClient || new CentrifugeAPIClient(), [apiClient]);

  return useQuery<CentrifugeHoldingEscrow[], Error>({
    queryKey: ['pool-holdings', poolId],
    queryFn: () => client.getPoolHoldings(poolId!),
    enabled: !!poolId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}