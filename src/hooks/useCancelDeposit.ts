import { useCallback } from "react";
import type { Address, Hash } from "viem";
import type { TxState, VaultType } from "../types/transaction";
import { VaultTxBuilder } from "../core/blockchain/VaultTxBuilder";
import { useUserAddress } from "./useUserAddress";
import { useWriteTransaction } from "./useWriteTransaction";

const SYNC_DEPOSIT_UNSUPPORTED =
  'Cancel deposit is not supported on this vault: SYNC_DEPOSIT_ASYNC_REDEEM deposits settle immediately.';

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
 * ASYNC vaults only (SYNC_DEPOSIT_ASYNC_REDEEM deposits settle immediately). `vaultType`
 * is required (pass `meta.vaultType` from `useVaultMetadata`); a non-ASYNC or undefined
 * type fails early with a clear error instead of reverting on-chain.
 *   cancelDeposit() → [epoch] → claimCancelDeposit()
 */
export function useCancelDeposit(
  vaultAddress: Address | undefined,
  vaultType: VaultType | undefined,
): UseCancelDepositReturn {
  const userAddress = useUserAddress();
  const { execute, txState, txHash, error, reset, setTxState, setError } = useWriteTransaction();

  const cancelDeposit = useCallback(async () => {
    if (!userAddress || !vaultAddress) {
      setError('Wallet not connected');
      return;
    }
    if (vaultType !== 'ASYNC') {
      setError(SYNC_DEPOSIT_UNSUPPORTED);
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
  }, [userAddress, vaultAddress, vaultType, execute, setTxState, setError]);

  const claimCancelDeposit = useCallback(async () => {
    if (!userAddress || !vaultAddress) {
      setError('Wallet not connected');
      return;
    }
    if (vaultType !== 'ASYNC') {
      setError(SYNC_DEPOSIT_UNSUPPORTED);
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
  }, [userAddress, vaultAddress, vaultType, execute, setTxState, setError]);

  return { cancelDeposit, claimCancelDeposit, txState, txHash, error, reset };
}
