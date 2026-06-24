import { useCallback } from "react";
import type { Address, Hash } from "viem";
import type { TxState } from "../types/transaction";
import { VaultTxBuilder } from "../core/blockchain/VaultTxBuilder";
import { useUserAddress } from "./useUserAddress";
import { useWriteTransaction } from "./useWriteTransaction";

interface UseCancelDepositReturn {
  /** Submit a cancellation for the user's pending deposit request (ASYNC vaults). */
  cancelDeposit: () => Promise<void>;
  /** After the epoch processes the cancellation, reclaim the assets. */
  claimCancelDeposit: () => Promise<void>;
  txState: TxState;
  txHash: Hash | undefined;
  error: string | null;
  reset: () => void;
}

/**
 * Cancel a pending deposit request and, once the epoch processes it, reclaim assets.
 * ASYNC vaults only (SYNC_DEPOSIT_ASYNC_REDEEM deposits settle immediately).
 *   cancelDeposit() → [epoch] → claimCancelDeposit()
 */
export function useCancelDeposit(
  vaultAddress: Address | undefined,
): UseCancelDepositReturn {
  const userAddress = useUserAddress();
  const { execute, txState, txHash, error, reset, setTxState, setError } = useWriteTransaction();

  const cancelDeposit = useCallback(async () => {
    if (!userAddress || !vaultAddress) {
      setError('Wallet not connected');
      return;
    }

    try {
      setError(null);
      setTxState('pending');
      await execute(VaultTxBuilder.buildCancelDepositTx(vaultAddress, userAddress));
      setTxState('success');
    } catch (err: any) {
      setTxState('error');
      setError(err?.shortMessage || err?.message || 'Transaction failed');
    }
  }, [userAddress, vaultAddress, execute, setTxState, setError]);

  const claimCancelDeposit = useCallback(async () => {
    if (!userAddress || !vaultAddress) {
      setError('Wallet not connected');
      return;
    }

    try {
      setError(null);
      setTxState('pending');
      await execute(VaultTxBuilder.buildClaimCancelDepositTx(vaultAddress, userAddress, userAddress));
      setTxState('success');
    } catch (err: any) {
      setTxState('error');
      setError(err?.shortMessage || err?.message || 'Transaction failed');
    }
  }, [userAddress, vaultAddress, execute, setTxState, setError]);

  return { cancelDeposit, claimCancelDeposit, txState, txHash, error, reset };
}
