import { useCallback } from "react";
import { parseUnits, type Address, type Hash } from "viem";
import type { TxState } from "../types/transaction";
import { VaultTxBuilder } from "../core/blockchain/VaultTxBuilder";
import { useUserAddress } from "./useUserAddress";
import { useWriteTransaction } from "./useWriteTransaction";
import { failMutation, handleMutationError } from "./mutationError";

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
  const userAddress = useUserAddress();
  const { execute, txState, txHash, error, reset, setTxState, setError } = useWriteTransaction();

  const requestRedeem = useCallback(async (shares: string, shareDecimals: number = 18) => {
    if (!userAddress || !vaultAddress) {
      failMutation("Wallet not connected", setTxState, setError);
    }

    const parsedShares = parseUnits(shares, shareDecimals);
    if (parsedShares <= 0n) {
      failMutation("Shares must be greater than 0", setTxState, setError);
    }

    try {
      setError(null);
      setTxState('pending');
      await execute(VaultTxBuilder.buildRequestRedeemTx(vaultAddress, parsedShares, userAddress, userAddress));
      setTxState('success');
    } catch (err: unknown) {
      handleMutationError(err, setTxState, setError);
    }
  }, [userAddress, vaultAddress, execute, setTxState, setError]);

  return { requestRedeem, txState, txHash, error, reset };
}
