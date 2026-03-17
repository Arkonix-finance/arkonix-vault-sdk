import { useQuery } from "@tanstack/react-query";
import { CentrifugeAPIClient } from "../core/api";
import type { VaultsQueryParams, CentrifugeVault } from "../types/centrifugeApi";

/**
 * Hook to query Centrifuge vaults with optional filters
 * @param params Query parameters including poolId, tokenId, and other filters
 * @param apiClient Optional CentrifugeAPIClient instance (creates one if not provided)
 * @returns Query result with vaults data
 */
export function useCentrifugeVaults(
  params: VaultsQueryParams = {},
  apiClient?: CentrifugeAPIClient
) {
  const client = apiClient || new CentrifugeAPIClient();

  return useQuery<CentrifugeVault[], Error>({
    queryKey: ['centrifuge-vaults', params],
    queryFn: () => client.getVaults(params),
    enabled: true,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to query vaults for a specific pool
 * @param poolId The pool ID
 * @param apiClient Optional CentrifugeAPIClient instance
 * @returns Query result with pool vaults data
 */
export function usePoolVaults(
  poolId: string | undefined,
  apiClient?: CentrifugeAPIClient
) {
  return useCentrifugeVaults(
    poolId ? { poolId } : {},
    apiClient
  );
}

/**
 * Hook to query active vaults
 * @param params Additional query parameters
 * @param apiClient Optional CentrifugeAPIClient instance
 * @returns Query result with active vaults data
 */
export function useActiveVaults(
  params: Omit<VaultsQueryParams, 'isActive'> = {},
  apiClient?: CentrifugeAPIClient
) {
  return useCentrifugeVaults(
    { ...params, isActive: true },
    apiClient
  );
}