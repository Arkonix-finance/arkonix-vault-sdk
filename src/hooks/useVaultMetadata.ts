/**
 * Hook to read vault metadata from a vault address.
 * Fetches asset, share token, decimals, symbols, poolId, and vaultType
 * so partners don't need to know anything beyond the vault address.
 */

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { SYNC_DEPOSIT_VAULT_ABI, ERC20_ABI } from "../constants/abis";
import type { VaultMetadata } from "../types/vaultMetadata";
import type { VaultType } from "../types/transaction";
import { useVaultContext } from "../provider/VaultContext";

export function useVaultMetadata(vaultAddress: Address | undefined): {
  data: VaultMetadata | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { publicClient } = useVaultContext();

  const { data, isLoading, error } = useQuery({
    queryKey: ['vault-metadata', vaultAddress],
    queryFn: async (): Promise<VaultMetadata> => {
      if (!vaultAddress) throw new Error('No vault address');

      // Batch 1: Read vault-level metadata
      const vaultResults = await publicClient.multicall({
        contracts: [
          {
            address: vaultAddress,
            abi: SYNC_DEPOSIT_VAULT_ABI,
            functionName: 'asset',
          },
          {
            address: vaultAddress,
            abi: SYNC_DEPOSIT_VAULT_ABI,
            functionName: 'share',
          },
          {
            address: vaultAddress,
            abi: SYNC_DEPOSIT_VAULT_ABI,
            functionName: 'poolId',
          },
          {
            address: vaultAddress,
            abi: SYNC_DEPOSIT_VAULT_ABI,
            functionName: 'vaultKind',
          },
          {
            address: vaultAddress,
            abi: SYNC_DEPOSIT_VAULT_ABI,
            functionName: 'totalAssets',
          },
        ],
      });

      const asset = vaultResults[0].result as Address;
      const share = vaultResults[1].result as Address;
      const poolId = vaultResults[2].result as bigint;
      const vaultKind = vaultResults[3].result as number;
      const totalAssets = vaultResults[4].result as bigint;

      // Batch 2: Read token metadata for asset and share
      const tokenResults = await publicClient.multicall({
        contracts: [
          { address: asset, abi: ERC20_ABI, functionName: 'decimals' },
          { address: asset, abi: ERC20_ABI, functionName: 'symbol' },
          { address: share, abi: ERC20_ABI, functionName: 'decimals' },
          { address: share, abi: ERC20_ABI, functionName: 'symbol' },
        ],
      });

      const assetDecimals = tokenResults[0].result as number;
      const assetSymbol = tokenResults[1].result as string;
      const shareDecimals = tokenResults[2].result as number;
      const shareSymbol = tokenResults[3].result as string;

      const vaultType: VaultType = vaultKind === 0 ? 'SYNC' : 'ASYNC';

      return {
        asset,
        share,
        assetDecimals,
        assetSymbol,
        shareDecimals,
        shareSymbol,
        poolId,
        vaultKind,
        vaultType,
        totalAssets,
      };
    },
    enabled: !!vaultAddress,
    staleTime: 60_000, // metadata rarely changes, cache 1 min
  });

  return { data, isLoading, error: error as Error | null };
}
