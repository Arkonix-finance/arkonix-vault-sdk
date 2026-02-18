/**
 * Hook for depositing into a vault.
 * Handles ERC20 approval check + approve tx + deposit tx.
 * - SYNC vaults: vault.deposit(assets, receiver)
 * - ASYNC vaults: vault.requestDeposit(assets, controller, owner)
 */

import { useState, useCallback } from "react";
import { parseUnits, type Address, type Hash } from "viem";
import type { TxState, VaultType } from "../types/transaction";
import { ERC20_ABI } from "../constants/abis";
import { VaultTxBuilder } from "../core/blockchain/VaultTxBuilder";
import { useVaultContext } from "../provider/VaultContext";
import { useUserAddress } from "./useUserAddress";

interface UseDepositReturn {
  deposit: (amount: string) => Promise<void>;
  txState: TxState;
  txHash: Hash | undefined;
  error: string | null;
  reset: () => void;
}

export function useDeposit(
  vaultAddress: Address | undefined,
  depositAssetAddress: Address | undefined,
  depositAssetDecimals: number = 6,
  vaultType: VaultType = 'SYNC',
): UseDepositReturn {
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

  const deposit = useCallback(async (amount: string) => {
    if (!userAddress || !vaultAddress || !depositAssetAddress) {
      setError('Wallet not connected');
      return;
    }

    const parsedAmount = parseUnits(amount, depositAssetDecimals);
    if (parsedAmount <= 0n) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setError(null);

      // Step 1: Check allowance and approve if needed
      const allowance = await publicClient.readContract({
        address: depositAssetAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [userAddress, vaultAddress],
      });

      if (allowance < parsedAmount) {
        setTxState('approving');
        const approveTx = VaultTxBuilder.buildApproveTx(depositAssetAddress, vaultAddress, parsedAmount);
        const approveHash = await walletAdapter.sendTransaction(approveTx) as Hash;
        setTxHash(approveHash);
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // Step 2: Deposit
      setTxState('pending');
      const depositTx = VaultTxBuilder.buildDepositTx(vaultAddress, parsedAmount, userAddress, vaultType);
      const depositHash = await walletAdapter.sendTransaction(depositTx) as Hash;
      setTxHash(depositHash);
      setTxState('confirming');
      await publicClient.waitForTransactionReceipt({ hash: depositHash });
      setTxState('success');
    } catch (err: any) {
      setTxState('error');
      setError(err?.shortMessage || err?.message || 'Transaction failed');
    }
  }, [userAddress, vaultAddress, depositAssetAddress, depositAssetDecimals, vaultType, walletAdapter, publicClient]);

  return { deposit, txState, txHash, error, reset };
}
