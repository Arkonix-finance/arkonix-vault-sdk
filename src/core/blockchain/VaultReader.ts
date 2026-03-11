import { formatUnits, type Address, type PublicClient } from "viem";
import { ERC20_ABI, SYNC_DEPOSIT_VAULT_ABI, ASYNC_VAULT_ABI } from "../../constants/abis";
import type { VaultMetadata } from "../../types/vaultMetadata";
import type { VaultUserState } from "../../types/vaultUserState";
import type { VaultType } from "../../types/transaction";

const ZERO = 0n;

export class VaultReader {
  static async getMetadata(
    client: PublicClient,
    vaultAddress: Address,
  ): Promise<VaultMetadata> {
    const vaultResults = await client.multicall({
      contracts: [
        { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'asset' },
        { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'share' },
        { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'poolId' },
        { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'vaultKind' },
        { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'totalAssets' },
      ],
    });

    const asset = vaultResults[0].result as Address;
    const share = vaultResults[1].result as Address;
    const poolId = vaultResults[2].result as bigint;
    const vaultKind = vaultResults[3].result as number;
    const totalAssets = vaultResults[4].result as bigint;

    const tokenResults = await client.multicall({
      contracts: [
        { address: asset, abi: ERC20_ABI, functionName: 'decimals' },
        { address: asset, abi: ERC20_ABI, functionName: 'symbol' },
        { address: share, abi: ERC20_ABI, functionName: 'decimals' },
        { address: share, abi: ERC20_ABI, functionName: 'symbol' },
      ],
    });

    const assetDecimals = tokenResults[0].result as number;
    const assetSymbol = tokenResults[1].result as string;
    const shareDecimals = tokenResults[2].result as number;
    const shareSymbol = tokenResults[3].result as string;

    const vaultType: VaultType = vaultKind === 0 ? 'ASYNC' : 'SYNC_DEPOSIT_ASYNC_REDEEM';

    return {
      asset, share, assetDecimals, assetSymbol, shareDecimals, shareSymbol,
      poolId, vaultKind, vaultType, totalAssets,
    };
  }

  static async getUserState(
    client: PublicClient,
    vaultAddress: Address,
    userAddress: Address,
    vaultType: VaultType = 'ASYNC',
    depositAssetDecimals: number = 6,
  ): Promise<VaultUserState> {
    const isAsync = vaultType === 'ASYNC';

    const share = await client.readContract({
      address: vaultAddress,
      abi: SYNC_DEPOSIT_VAULT_ABI,
      functionName: 'share',
    }) as Address;

    // Batch 1: Share balance + redeem state
    const batch1 = await client.multicall({
      contracts: [
        { address: share, abi: ERC20_ABI, functionName: 'balanceOf', args: [userAddress] },
        { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'pendingRedeemRequest', args: [ZERO, userAddress] },
        { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'claimableRedeemRequest', args: [ZERO, userAddress] },
      ],
    });

    const shareBalance = (batch1[0].result as bigint) ?? ZERO;
    const pendingRedeemShares = (batch1[1].result as bigint) ?? ZERO;
    const claimableRedeemShares = (batch1[2].result as bigint) ?? ZERO;

    // Batch 2 (async only): pending/claimable deposit requests
    let pendingDepositAssets = ZERO;
    let claimableDepositAssets = ZERO;

    if (isAsync) {
      const batch2 = await client.multicall({
        contracts: [
          { address: vaultAddress, abi: ASYNC_VAULT_ABI, functionName: 'pendingDepositRequest', args: [ZERO, userAddress] },
          { address: vaultAddress, abi: ASYNC_VAULT_ABI, functionName: 'claimableDepositRequest', args: [ZERO, userAddress] },
        ],
      });
      pendingDepositAssets = (batch2[0].result as bigint) ?? ZERO;
      claimableDepositAssets = (batch2[1].result as bigint) ?? ZERO;
    }

    // Batch 3: Convert shares → assets for display
    let positionAssets = ZERO;
    let pendingRedeemAssets = ZERO;
    let claimableRedeemAssets = ZERO;

    const hasAnyShares = shareBalance > ZERO || pendingRedeemShares > ZERO || claimableRedeemShares > ZERO;
    if (hasAnyShares) {
      const batch3 = await client.multicall({
        contracts: [
          { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'convertToAssets', args: [shareBalance] },
          { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'convertToAssets', args: [pendingRedeemShares] },
          { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'maxWithdraw', args: [userAddress] },
        ],
      });
      positionAssets = (batch3[0].result as bigint) ?? ZERO;
      pendingRedeemAssets = (batch3[1].result as bigint) ?? ZERO;
      claimableRedeemAssets = (batch3[2].result as bigint) ?? ZERO;
    }

    return {
      isLoading: false,

      // Position
      shareBalance,
      positionValueFormatted: formatUnits(positionAssets, depositAssetDecimals),

      // Deposit (async only)
      hasPendingDeposit: pendingDepositAssets > ZERO,
      pendingDepositAssets,
      pendingDepositFormatted: formatUnits(pendingDepositAssets, depositAssetDecimals),
      hasClaimableDeposit: claimableDepositAssets > ZERO,
      claimableDepositAssets,
      claimableDepositFormatted: formatUnits(claimableDepositAssets, depositAssetDecimals),

      // Redeem
      hasPendingRedeem: pendingRedeemShares > ZERO,
      pendingRedeemShares,
      pendingRedeemAssetsFormatted: formatUnits(pendingRedeemAssets, depositAssetDecimals),
      hasClaimableRedeem: claimableRedeemShares > ZERO,
      claimableRedeemShares,
      claimableRedeemAssetsFormatted: formatUnits(claimableRedeemAssets, depositAssetDecimals),
    };
  }

  static async getAllowance(
    client: PublicClient, token: Address, owner: Address, spender: Address,
  ): Promise<bigint> {
    return await client.readContract({
      address: token, abi: ERC20_ABI, functionName: 'allowance', args: [owner, spender],
    }) as bigint;
  }

  static async getBalance(
    client: PublicClient, token: Address, account: Address,
  ): Promise<bigint> {
    return await client.readContract({
      address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [account],
    }) as bigint;
  }

  static async getMaxDeposit(
    client: PublicClient, vaultAddress: Address, receiver: Address,
  ): Promise<bigint> {
    return await client.readContract({
      address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'maxDeposit', args: [receiver],
    }) as bigint;
  }

  static async getMaxRedeem(
    client: PublicClient, vaultAddress: Address, owner: Address,
  ): Promise<bigint> {
    return await client.readContract({
      address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'maxRedeem', args: [owner],
    }) as bigint;
  }

  static async convertToAssets(
    client: PublicClient, vaultAddress: Address, shares: bigint,
  ): Promise<bigint> {
    return await client.readContract({
      address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'convertToAssets', args: [shares],
    }) as bigint;
  }

  static async convertToShares(
    client: PublicClient, vaultAddress: Address, assets: bigint,
  ): Promise<bigint> {
    return await client.readContract({
      address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'convertToShares', args: [assets],
    }) as bigint;
  }
}
