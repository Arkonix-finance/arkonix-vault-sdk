import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { CentrifugeAPIClient } from "../core/api";
import type { HoldingsQueryParams, CentrifugeHoldingEscrow } from "../types/centrifugeApi";

/**
 * Hook to query Centrifuge holdings with optional filters
 * @param params Query parameters including poolId and tokenId filters
 * @param apiClient Optional CentrifugeAPIClient instance (creates one if not provided)
 * @returns Query result with holdings data
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