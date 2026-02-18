/**
 * Hook for claiming a completed redeem.
 * Calls vault.redeem(shares, receiver, controller)
 */

import { useState, useCallback } from "react";
import type { Address, Hash } from "viem";
import type { TxState } from "../types/transaction";
import { VaultTxBuilder } from "../core/blockchain/VaultTxBuilder";
import { useVaultContext } from "../provider/VaultContext";
import { useUserAddress } from "./useUserAddress";

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

      const tx = VaultTxBuilder.buildClaimRedeemTx(vaultAddress, shares, userAddress, userAddress);
      const hash = await walletAdapter.sendTransaction(tx) as Hash;
      setTxHash(hash);
      setTxState('confirming');
      await publicClient.waitForTransactionReceipt({ hash });
      setTxState('success');
    } catch (err: any) {
      setTxState('error');
      setError(err?.shortMessage || err?.message || 'Transaction failed');
    }
  }, [userAddress, vaultAddress, walletAdapter, publicClient]);

  return { claimRedeem, txState, txHash, error, reset };
}
