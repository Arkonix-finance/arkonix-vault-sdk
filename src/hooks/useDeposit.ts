import { useCallback } from "react";
import { parseUnits, type Address, type Hash } from "viem";
import type { TxState, VaultType } from "../types/transaction";
import { ERC20_ABI } from "../constants/abis";
import { VaultTxBuilder } from "../core/blockchain/VaultTxBuilder";
import { useVaultContext } from "../provider/VaultContext";
import { useUserAddress } from "./useUserAddress";
import { useWriteTransaction } from "./useWriteTransaction";
import { failMutation, handleMutationError } from "./mutationError";

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
  vaultType: VaultType = 'ASYNC',
): UseDepositReturn {
  const { publicClient } = useVaultContext();
  const userAddress = useUserAddress();
  const { execute, txState, txHash, error, reset, setTxState, setError } = useWriteTransaction();

  const deposit = useCallback(async (amount: string) => {
    if (!userAddress || !vaultAddress || !depositAssetAddress) {
      failMutation("Wallet not connected", setTxState, setError);
    }

    const parsedAmount = parseUnits(amount, depositAssetDecimals);
    if (parsedAmount <= 0n) {
      failMutation("Amount must be greater than 0", setTxState, setError);
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
        await execute(VaultTxBuilder.buildApproveTx(depositAssetAddress, vaultAddress, parsedAmount));
      }

      // Step 2: Deposit
      setTxState('pending');
      await execute(VaultTxBuilder.buildDepositTx(vaultAddress, parsedAmount, userAddress, vaultType));
      setTxState('success');
    } catch (err: unknown) {
      handleMutationError(err, setTxState, setError);
    }
  }, [userAddress, vaultAddress, depositAssetAddress, depositAssetDecimals, vaultType, publicClient, execute, setTxState, setError]);

  return { deposit, txState, txHash, error, reset };
}
