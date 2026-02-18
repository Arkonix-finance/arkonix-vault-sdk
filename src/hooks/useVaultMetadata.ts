import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import type { VaultMetadata } from "../types/vaultMetadata";
import { VaultReader } from "../core/blockchain/VaultReader";
import { useVaultContext } from "../provider/VaultContext";

export function useVaultMetadata(vaultAddress: Address | undefined): {
  data: VaultMetadata | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const { publicClient } = useVaultContext();

  const { data, isLoading, error } = useQuery({
    queryKey: ['vault-metadata', vaultAddress],
    queryFn: () => VaultReader.getMetadata(publicClient, vaultAddress!),
    enabled: !!vaultAddress,
    staleTime: 60_000,
  });

  return { data, isLoading, error: error as Error | null };
}
