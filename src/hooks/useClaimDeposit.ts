import { useCallback } from "react";
import type { Address, Hash } from "viem";
import type { TxState } from "../types/transaction";
import { VaultTxBuilder } from "../core/blockchain/VaultTxBuilder";
import { useUserAddress } from "./useUserAddress";
import { useWriteTransaction } from "./useWriteTransaction";
import { failMutation, handleMutationError } from "./mutationError";

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
      failMutation("Wallet not connected", setTxState, setError);
    }

    if (assets <= 0n) {
      failMutation("No assets to claim", setTxState, setError);
    }

    try {
      setError(null);
      setTxState('pending');
      await execute(VaultTxBuilder.buildClaimDepositTx(vaultAddress, assets, userAddress));
      setTxState('success');
    } catch (err: unknown) {
      handleMutationError(err, setTxState, setError);
    }
  }, [userAddress, vaultAddress, execute, setTxState, setError]);

  return { claimDeposit, txState, txHash, error, reset };
}
