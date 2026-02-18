/**
 * Vault User State Types
 * Mirrors the on-chain state for a user's position in an ERC-7540 vault.
 */

export interface VaultUserState {
  shareBalance: bigint;
  positionValueFormatted: string;

  // Redeem request state
  pendingShares: bigint;
  pendingAssetsFormatted: string;
  claimableShares: bigint;
  claimableAssetsFormatted: string;
  hasPending: boolean;
  hasClaimable: boolean;

  // Cancel redeem state
  pendingCancelRedeem: boolean;
  claimableCancelRedeemShares: bigint;
  hasClaimableCancelRedeem: boolean;

  // Async deposit state (only populated for ASYNC vaults)
  pendingDepositAssets: bigint;
  pendingDepositFormatted: string;
  claimableDepositAssets: bigint;
  claimableDepositFormatted: string;
  hasPendingDeposit: boolean;
  hasClaimableDeposit: boolean;

  isLoading: boolean;
}
