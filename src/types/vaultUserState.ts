export interface VaultUserState {
  /** True while on-chain data is being fetched */
  isLoading: boolean;

  // ---------------------------------------------------------------------------
  // Position (shares held after deposit is complete)
  // ---------------------------------------------------------------------------

  /** User's share token balance */
  shareBalance: bigint;
  /** Share balance converted to asset value at current price */
  positionValueFormatted: string;

  // ---------------------------------------------------------------------------
  // Deposit flow (ASYNC vaults only — SYNC vaults mint shares immediately)
  //
  //   1. requestDeposit()  → hasPendingDeposit = true
  //   2. [epoch executes]  → hasClaimableDeposit = true
  //   3. claimDeposit()    → shareBalance increases
  // ---------------------------------------------------------------------------

  /** User has a pending deposit request waiting for epoch */
  hasPendingDeposit: boolean;
  /** Asset amount locked in pending deposit request */
  pendingDepositAssets: bigint;
  /** Formatted pending deposit amount */
  pendingDepositFormatted: string;

  /** Epoch has processed the deposit — user can claim shares */
  hasClaimableDeposit: boolean;
  /** Asset amount ready to be claimed as shares */
  claimableDepositAssets: bigint;
  /** Formatted claimable deposit amount */
  claimableDepositFormatted: string;

  // ---------------------------------------------------------------------------
  // Redeem flow (both ASYNC and SYNC_DEPOSIT_ASYNC_REDEEM)
  //
  //   1. requestRedeem()  → hasPendingRedeem = true
  //   2. [epoch executes] → hasClaimableRedeem = true
  //   3. claimRedeem()    → user receives assets
  // ---------------------------------------------------------------------------

  /** User has a pending redeem request waiting for epoch */
  hasPendingRedeem: boolean;
  /** Share amount locked in pending redeem request */
  pendingRedeemShares: bigint;
  /** Pending redeem converted to estimated asset value */
  pendingRedeemAssetsFormatted: string;

  /** Epoch has processed the redeem — user can claim assets */
  hasClaimableRedeem: boolean;
  /** Share amount ready to be redeemed for assets */
  claimableRedeemShares: bigint;
  /** Claimable redeem value in assets (locked at epoch price) */
  claimableRedeemAssetsFormatted: string;

  // ---------------------------------------------------------------------------
  // Cancel flows (ERC-7540)
  //
  //   cancelRedeemRequest()       → hasPendingCancelRedeem = true
  //   [epoch executes]            → hasClaimableCancelRedeem = true
  //   claimCancelRedeemRequest()  → user receives their shares back
  // (cancelDeposit mirrors this, returning assets instead of shares)
  // ---------------------------------------------------------------------------

  /** A cancel-redeem request is pending the next epoch */
  hasPendingCancelRedeem: boolean;
  /** Shares ready to reclaim after a processed redeem cancellation */
  claimableCancelRedeemShares: bigint;
  /** Whether there are shares to reclaim from a cancelled redeem */
  hasClaimableCancelRedeem: boolean;

  /** A cancel-deposit request is pending the next epoch (ASYNC vaults only) */
  hasPendingCancelDeposit: boolean;
  /** Assets ready to reclaim after a processed deposit cancellation */
  claimableCancelDepositAssets: bigint;
  /** Formatted claimable cancel-deposit amount */
  claimableCancelDepositFormatted: string;
  /** Whether there are assets to reclaim from a cancelled deposit */
  hasClaimableCancelDeposit: boolean;
}
