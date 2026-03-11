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
}
