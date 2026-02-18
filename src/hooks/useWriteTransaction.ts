/**
 * Shared hook for executing a write transaction via WalletAdapter.
 * Handles send + waitForTransactionReceipt + state tracking.
 */

import { useState, useCallback } from "react";
import type { Hash } from "viem";
import type { TxState } from "../types/transaction";
import type { TransactionRequest } from "../types/transaction";
import { useVaultContext } from "../provider/VaultContext";

interface UseWriteTransactionReturn {
  execute: (tx: TransactionRequest) => Promise<Hash>;
  txState: TxState;
  txHash: Hash | undefined;
  error: string | null;
  reset: () => void;
  setTxState: (state: TxState) => void;
  setError: (error: string | null) => void;
}

export function useWriteTransaction(): UseWriteTransactionReturn {
  const { walletAdapter, publicClient } = useVaultContext();
  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<Hash | undefined>();
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTxState('idle');
    setTxHash(undefined);
    setError(null);
  }, []);

  const execute = useCallback(async (tx: TransactionRequest): Promise<Hash> => {
    const hash = await walletAdapter.sendTransaction(tx) as Hash;
    setTxHash(hash);
    setTxState('confirming');

    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }, [walletAdapter, publicClient]);

  return { execute, txState, txHash, error, reset, setTxState, setError };
}
