import { useCallback } from "react";
import type { Address, Hash } from "viem";
import type { TxState } from "../types/transaction";
import { VaultTxBuilder } from "../core/blockchain/VaultTxBuilder";
import { useUserAddress } from "./useUserAddress";
import { useWriteTransaction } from "./useWriteTransaction";

interface UseCancelRedeemReturn {
  /** Submit a cancellation for the user's pending redeem request. */
  cancelRedeem: () => Promise<void>;
  /** After the epoch processes the cancellation, reclaim the shares. */
  claimCancelRedeem: () => Promise<void>;
  txState: TxState;
  txHash: Hash | undefined;
  error: string | null;
  reset: () => void;
}

/**
 * Cancel a pending redeem request and, once the epoch processes it, reclaim shares.
 *   cancelRedeem() → [epoch] → claimCancelRedeem()
 */
export function useCancelRedeem(
  vaultAddress: Address | undefined,
): UseCancelRedeemReturn {
  const userAddress = useUserAddress();
  const { execute, txState, txHash, error, reset, setTxState, setError } = useWriteTransaction();

  const cancelRedeem = useCallback(async () => {
    if (!userAddress || !vaultAddress) {
      setError('Wallet not connected');
      return;
    }

    try {
      setError(null);
      setTxState('pending');
      await execute(VaultTxBuilder.buildCancelRedeemTx(vaultAddress, userAddress));
      setTxState('success');
    } catch (err: any) {
      setTxState('error');
      setError(err?.shortMessage || err?.message || 'Transaction failed');
    }
  }, [userAddress, vaultAddress, execute, setTxState, setError]);

  const claimCancelRedeem = useCallback(async () => {
    if (!userAddress || !vaultAddress) {
      setError('Wallet not connected');
      return;
    }

    try {
      setError(null);
      setTxState('pending');
      await execute(VaultTxBuilder.buildClaimCancelRedeemTx(vaultAddress, userAddress, userAddress));
      setTxState('success');
    } catch (err: any) {
      setTxState('error');
      setError(err?.shortMessage || err?.message || 'Transaction failed');
    }
  }, [userAddress, vaultAddress, execute, setTxState, setError]);

  return { cancelRedeem, claimCancelRedeem, txState, txHash, error, reset };
}
