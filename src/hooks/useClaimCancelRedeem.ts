import { useCallback } from "react";
import type { Address, Hash } from "viem";
import type { TxState } from "../types/transaction";
import { VaultTxBuilder } from "../core/blockchain/VaultTxBuilder";
import { useUserAddress } from "./useUserAddress";
import { useWriteTransaction } from "./useWriteTransaction";

interface UseClaimCancelRedeemReturn {
  claimCancelRedeem: () => Promise<void>;
  txState: TxState;
  txHash: Hash | undefined;
  error: string | null;
  reset: () => void;
}

export function useClaimCancelRedeem(
  vaultAddress: Address | undefined,
): UseClaimCancelRedeemReturn {
  const userAddress = useUserAddress();
  const { execute, txState, txHash, error, reset, setTxState, setError } = useWriteTransaction();

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
      setError(err?.shortMessage || err?.message || 'Claim failed');
    }
  }, [userAddress, vaultAddress, execute, setTxState, setError]);

  return { claimCancelRedeem, txState, txHash, error, reset };
}
