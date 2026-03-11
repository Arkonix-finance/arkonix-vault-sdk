import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import type { VaultUserState } from "../types/vaultUserState";
import type { VaultType } from "../types/transaction";
import { VaultReader } from "../core/blockchain/VaultReader";
import { useVaultContext } from "../provider/VaultContext";
import { useUserAddress } from "./useUserAddress";

const EMPTY_STATE: VaultUserState = {
  isLoading: true,

  shareBalance: 0n,
  positionValueFormatted: '0',

  hasPendingDeposit: false,
  pendingDepositAssets: 0n,
  pendingDepositFormatted: '0',
  hasClaimableDeposit: false,
  claimableDepositAssets: 0n,
  claimableDepositFormatted: '0',

  hasPendingRedeem: false,
  pendingRedeemShares: 0n,
  pendingRedeemAssetsFormatted: '0',
  hasClaimableRedeem: false,
  claimableRedeemShares: 0n,
  claimableRedeemAssetsFormatted: '0',
};

export function useVaultUserState(
  vaultAddress: Address | undefined,
  shareTokenAddress: Address | undefined,
  depositAssetDecimals: number = 6,
  vaultType: VaultType = 'ASYNC',
): VaultUserState {
  const { publicClient } = useVaultContext();
  const userAddress = useUserAddress();

  const enabled = !!vaultAddress && !!userAddress && !!shareTokenAddress;

  const { data, isLoading } = useQuery({
    queryKey: ['vault-user-state', vaultAddress, userAddress, vaultType],
    queryFn: () => VaultReader.getUserState(
      publicClient, vaultAddress!, userAddress!, vaultType, depositAssetDecimals,
    ),
    enabled,
    refetchInterval: 10_000,
  });

  if (!data) return { ...EMPTY_STATE, isLoading };
  return { ...data, isLoading: false };
}
