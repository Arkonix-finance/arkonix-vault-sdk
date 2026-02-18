/**
 * Hook for cancelling a pending redeem request.
 * Calls vault.cancelRedeemRequest(0, controller)
 */

import { useState, useCallback } from "react";
import type { Address, Hash } from "viem";
import type { TxState } from "../types/transaction";
import { VaultTxBuilder } from "../core/blockchain/VaultTxBuilder";
import { useVaultContext } from "../provider/VaultContext";
import { useUserAddress } from "./useUserAddress";

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
  const { walletAdapter, publicClient } = useVaultContext();
  const userAddress = useUserAddress();
  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<Hash | undefined>();
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTxState('idle');
    setTxHash(undefined);
    setError(null);
  }, []);

  const cancelRedeem = useCallback(async () => {
    if (!userAddress || !vaultAddress) {
      setError('Wallet not connected');
      return;
    }

    try {
      setError(null);
      setTxState('pending');

      const tx = VaultTxBuilder.buildCancelRedeemTx(vaultAddress, userAddress);
      const hash = await walletAdapter.sendTransaction(tx) as Hash;
      setTxHash(hash);
      setTxState('confirming');
      await publicClient.waitForTransactionReceipt({ hash });
      setTxState('success');
    } catch (err: any) {
      setTxState('error');
      setError(err?.shortMessage || err?.message || 'Cancel failed');
    }
  }, [userAddress, vaultAddress, walletAdapter, publicClient]);

  return { cancelRedeem, txState, txHash, error, reset };
}
