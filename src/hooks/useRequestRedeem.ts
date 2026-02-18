/**
 * Hook for requesting a redeem (async flow).
 * Calls vault.requestRedeem(shares, controller, owner)
 */

import { useState, useCallback } from "react";
import { parseUnits, type Address, type Hash } from "viem";
import type { TxState } from "../types/transaction";
import { VaultTxBuilder } from "../core/blockchain/VaultTxBuilder";
import { useVaultContext } from "../provider/VaultContext";
import { useUserAddress } from "./useUserAddress";

interface UseRequestRedeemReturn {
  requestRedeem: (shares: string, shareDecimals?: number) => Promise<void>;
  txState: TxState;
  txHash: Hash | undefined;
  error: string | null;
  reset: () => void;
}

export function useRequestRedeem(
  vaultAddress: Address | undefined,
): UseRequestRedeemReturn {
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

  const requestRedeem = useCallback(async (shares: string, shareDecimals: number = 18) => {
    if (!userAddress || !vaultAddress) {
      setError('Wallet not connected');
      return;
    }

    const parsedShares = parseUnits(shares, shareDecimals);
    if (parsedShares <= 0n) {
      setError('Shares must be greater than 0');
      return;
    }

    try {
      setError(null);
      setTxState('pending');

      const tx = VaultTxBuilder.buildRequestRedeemTx(vaultAddress, parsedShares, userAddress, userAddress);
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

  return { requestRedeem, txState, txHash, error, reset };
}
