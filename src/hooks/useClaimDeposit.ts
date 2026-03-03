import { useCallback } from "react";
import type { Address, Hash } from "viem";
import type { TxState } from "../types/transaction";
import { VaultTxBuilder } from "../core/blockchain/VaultTxBuilder";
import { useUserAddress } from "./useUserAddress";
import { useWriteTransaction } from "./useWriteTransaction";

interface UseClaimDepositReturn {
  claimDeposit: (assets: bigint) => Promise<void>;
  txState: TxState;
  txHash: Hash | undefined;
  error: string | null;
  reset: () => void;
}

/**
 * Hook to claim a deposit for ASYNC vaults.
 * After the epoch processes a requestDeposit, the user calls
 * the ERC-4626 deposit(assets, receiver) to mint their shares.
 */
export function useClaimDeposit(
  vaultAddress: Address | undefined,
): UseClaimDepositReturn {
  const userAddress = useUserAddress();
  const { execute, txState, txHash, error, reset, setTxState, setError } = useWriteTransaction();

  const claimDeposit = useCallback(async (assets: bigint) => {
    if (!userAddress || !vaultAddress) {
      setError('Wallet not connected');
      return;
    }

    if (assets <= 0n) {
      setError('No assets to claim');
      return;
    }

    try {
      setError(null);
      setTxState('pending');
      await execute(VaultTxBuilder.buildClaimDepositTx(vaultAddress, assets, userAddress));
      setTxState('success');
    } catch (err: any) {
      setTxState('error');
      setError(err?.shortMessage || err?.message || 'Transaction failed');
    }
  }, [userAddress, vaultAddress, execute, setTxState, setError]);

  return { claimDeposit, txState, txHash, error, reset };
}
