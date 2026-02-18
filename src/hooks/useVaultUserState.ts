/**
 * Hook to batch-read user's on-chain state for an ERC-7540 vault.
 * Supports both SyncDepositVault and AsyncVault.
 * Uses viem publicClient.multicall for efficiency.
 */

import { useQuery } from "@tanstack/react-query";
import { formatUnits, type Address } from "viem";
import { ERC20_ABI, SYNC_DEPOSIT_VAULT_ABI, ASYNC_VAULT_ABI } from "../constants/abis";
import type { VaultUserState } from "../types/vaultUserState";
import type { VaultType } from "../types/transaction";
import { useVaultContext } from "../provider/VaultContext";
import { useUserAddress } from "./useUserAddress";

const ZERO = 0n;

export function useVaultUserState(
  vaultAddress: Address | undefined,
  shareTokenAddress: Address | undefined,
  depositAssetDecimals: number = 6,
  vaultType: VaultType = 'SYNC',
): VaultUserState {
  const { publicClient } = useVaultContext();
  const userAddress = useUserAddress();

  const enabled = !!vaultAddress && !!userAddress && !!shareTokenAddress;
  const isAsync = vaultType === 'ASYNC';

  // Batch 1: Share balance + pending/claimable redeem + cancel states (10s poll)
  const { data: batch1, isLoading: isLoadingBatch1 } = useQuery({
    queryKey: ['vault-user-state', vaultAddress, userAddress, shareTokenAddress],
    queryFn: async () => {
      if (!vaultAddress || !userAddress || !shareTokenAddress) return null;

      const results = await publicClient.multicall({
        contracts: [
          {
            address: shareTokenAddress,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [userAddress],
          },
          {
            address: vaultAddress,
            abi: SYNC_DEPOSIT_VAULT_ABI,
            functionName: 'pendingRedeemRequest',
            args: [ZERO, userAddress],
          },
          {
            address: vaultAddress,
            abi: SYNC_DEPOSIT_VAULT_ABI,
            functionName: 'claimableRedeemRequest',
            args: [ZERO, userAddress],
          },
          {
            address: vaultAddress,
            abi: SYNC_DEPOSIT_VAULT_ABI,
            functionName: 'pendingCancelRedeemRequest',
            args: [ZERO, userAddress],
          },
          {
            address: vaultAddress,
            abi: SYNC_DEPOSIT_VAULT_ABI,
            functionName: 'claimableCancelRedeemRequest',
            args: [ZERO, userAddress],
          },
        ],
      });

      return {
        shareBalance: (results[0].result as bigint) ?? ZERO,
        pendingShares: (results[1].result as bigint) ?? ZERO,
        claimableShares: (results[2].result as bigint) ?? ZERO,
        pendingCancelRedeem: (results[3].result as boolean) ?? false,
        claimableCancelRedeemShares: (results[4].result as bigint) ?? ZERO,
      };
    },
    enabled,
    refetchInterval: 10_000,
  });

  // Batch 2 (async only): pending/claimable deposit requests
  const { data: batch2 } = useQuery({
    queryKey: ['vault-user-async-deposit', vaultAddress, userAddress],
    queryFn: async () => {
      if (!vaultAddress || !userAddress) return null;

      const results = await publicClient.multicall({
        contracts: [
          {
            address: vaultAddress,
            abi: ASYNC_VAULT_ABI,
            functionName: 'pendingDepositRequest',
            args: [ZERO, userAddress],
          },
          {
            address: vaultAddress,
            abi: ASYNC_VAULT_ABI,
            functionName: 'claimableDepositRequest',
            args: [ZERO, userAddress],
          },
        ],
      });

      return {
        pendingDepositAssets: (results[0].result as bigint) ?? ZERO,
        claimableDepositAssets: (results[1].result as bigint) ?? ZERO,
      };
    },
    enabled: enabled && isAsync,
  });

  const shareBalance = batch1?.shareBalance ?? ZERO;
  const pendingShares = batch1?.pendingShares ?? ZERO;
  const claimableShares = batch1?.claimableShares ?? ZERO;
  const pendingCancelRedeem = batch1?.pendingCancelRedeem ?? false;
  const claimableCancelRedeemShares = batch1?.claimableCancelRedeemShares ?? ZERO;
  const pendingDepositAssets = isAsync ? (batch2?.pendingDepositAssets ?? ZERO) : ZERO;
  const claimableDepositAssets = isAsync ? (batch2?.claimableDepositAssets ?? ZERO) : ZERO;

  // Batch 3: Convert shares → assets for display + read maxWithdraw
  const hasAnyShares = shareBalance > ZERO || pendingShares > ZERO || claimableShares > ZERO;

  const { data: batch3 } = useQuery({
    queryKey: ['vault-user-conversions', vaultAddress, userAddress, shareBalance.toString(), pendingShares.toString()],
    queryFn: async () => {
      if (!vaultAddress || !userAddress) return null;

      const results = await publicClient.multicall({
        contracts: [
          {
            address: vaultAddress,
            abi: SYNC_DEPOSIT_VAULT_ABI,
            functionName: 'convertToAssets',
            args: [shareBalance],
          },
          {
            address: vaultAddress,
            abi: SYNC_DEPOSIT_VAULT_ABI,
            functionName: 'convertToAssets',
            args: [pendingShares],
          },
          {
            address: vaultAddress,
            abi: SYNC_DEPOSIT_VAULT_ABI,
            functionName: 'maxWithdraw',
            args: [userAddress],
          },
        ],
      });

      return {
        positionAssets: (results[0].result as bigint) ?? ZERO,
        pendingAssets: (results[1].result as bigint) ?? ZERO,
        claimableAssets: (results[2].result as bigint) ?? ZERO,
      };
    },
    enabled: enabled && hasAnyShares,
    refetchInterval: 10_000,
  });

  const positionAssets = batch3?.positionAssets ?? ZERO;
  const pendingAssets = batch3?.pendingAssets ?? ZERO;
  const claimableAssets = batch3?.claimableAssets ?? ZERO;

  return {
    shareBalance,
    positionValueFormatted: formatUnits(positionAssets, depositAssetDecimals),
    pendingShares,
    pendingAssetsFormatted: formatUnits(pendingAssets, depositAssetDecimals),
    claimableShares,
    claimableAssetsFormatted: formatUnits(claimableAssets, depositAssetDecimals),
    hasPending: pendingShares > ZERO,
    hasClaimable: claimableShares > ZERO,
    pendingCancelRedeem,
    claimableCancelRedeemShares,
    hasClaimableCancelRedeem: claimableCancelRedeemShares > ZERO,
    pendingDepositAssets,
    pendingDepositFormatted: formatUnits(pendingDepositAssets, depositAssetDecimals),
    claimableDepositAssets,
    claimableDepositFormatted: formatUnits(claimableDepositAssets, depositAssetDecimals),
    hasPendingDeposit: pendingDepositAssets > ZERO,
    hasClaimableDeposit: claimableDepositAssets > ZERO,
    isLoading: isLoadingBatch1,
  };
}
