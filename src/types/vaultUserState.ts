export interface VaultUserState {
  shareBalance: bigint;
  positionValueFormatted: string;

  pendingShares: bigint;
  pendingAssetsFormatted: string;
  claimableShares: bigint;
  claimableAssetsFormatted: string;
  hasPending: boolean;
  hasClaimable: boolean;

  pendingCancelRedeem: boolean;
  claimableCancelRedeemShares: bigint;
  hasClaimableCancelRedeem: boolean;

  // Only populated for ASYNC vaults
  pendingDepositAssets: bigint;
  pendingDepositFormatted: string;
  claimableDepositAssets: bigint;
  claimableDepositFormatted: string;
  hasPendingDeposit: boolean;
  hasClaimableDeposit: boolean;

  isLoading: boolean;
}
