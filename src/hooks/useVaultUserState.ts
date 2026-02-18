import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import type { VaultUserState } from "../types/vaultUserState";
import type { VaultType } from "../types/transaction";
import { VaultReader } from "../core/blockchain/VaultReader";
import { useVaultContext } from "../provider/VaultContext";
import { useUserAddress } from "./useUserAddress";

const EMPTY_STATE: VaultUserState = {
  shareBalance: 0n,
  positionValueFormatted: '0',
  pendingShares: 0n,
  pendingAssetsFormatted: '0',
  claimableShares: 0n,
  claimableAssetsFormatted: '0',
  hasPending: false,
  hasClaimable: false,
  pendingCancelRedeem: false,
  claimableCancelRedeemShares: 0n,
  hasClaimableCancelRedeem: false,
  pendingDepositAssets: 0n,
  pendingDepositFormatted: '0',
  claimableDepositAssets: 0n,
  claimableDepositFormatted: '0',
  hasPendingDeposit: false,
  hasClaimableDeposit: false,
  isLoading: true,
};

export function useVaultUserState(
  vaultAddress: Address | undefined,
  shareTokenAddress: Address | undefined,
  depositAssetDecimals: number = 6,
  vaultType: VaultType = 'SYNC',
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
