import { useCallback } from "react";
import type { Address, Hash } from "viem";
import type { TxState } from "../types/transaction";
import { VaultTxBuilder } from "../core/blockchain/VaultTxBuilder";
import { useUserAddress } from "./useUserAddress";
import { useWriteTransaction } from "./useWriteTransaction";

interface UseCancelRedeemReturn {
  cancelRedeem: () => Promise<void>;
  txState: TxState;
  txHash: Hash | undefined;
  error: string | null;
  reset: () => void;
}

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
      setError(err?.shortMessage || err?.message || 'Cancel failed');
    }
  }, [userAddress, vaultAddress, execute, setTxState, setError]);

  return { cancelRedeem, txState, txHash, error, reset };
}
