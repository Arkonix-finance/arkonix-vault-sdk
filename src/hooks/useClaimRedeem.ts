import { useCallback } from "react";
import type { Address, Hash } from "viem";
import type { TxState } from "../types/transaction";
import { VaultTxBuilder } from "../core/blockchain/VaultTxBuilder";
import { useUserAddress } from "./useUserAddress";
import { useWriteTransaction } from "./useWriteTransaction";

interface UseClaimRedeemReturn {
  claimRedeem: (shares: bigint) => Promise<void>;
  txState: TxState;
  txHash: Hash | undefined;
  error: string | null;
  reset: () => void;
}

export function useClaimRedeem(
  vaultAddress: Address | undefined,
): UseClaimRedeemReturn {
  const userAddress = useUserAddress();
  const { execute, txState, txHash, error, reset, setTxState, setError } = useWriteTransaction();

  const claimRedeem = useCallback(async (shares: bigint) => {
    if (!userAddress || !vaultAddress) {
      setError('Wallet not connected');
      return;
    }

    if (shares <= 0n) {
      setError('No shares to claim');
      return;
    }

    try {
      setError(null);
      setTxState('pending');
      await execute(VaultTxBuilder.buildClaimRedeemTx(vaultAddress, shares, userAddress, userAddress));
      setTxState('success');
    } catch (err: any) {
      setTxState('error');
      setError(err?.shortMessage || err?.message || 'Transaction failed');
    }
  }, [userAddress, vaultAddress, execute, setTxState, setError]);

  return { claimRedeem, txState, txHash, error, reset };
}
