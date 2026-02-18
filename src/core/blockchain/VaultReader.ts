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

    const vaultType: VaultType = vaultKind === 0 ? 'SYNC' : 'ASYNC';

    return {
      asset, share, assetDecimals, assetSymbol, shareDecimals, shareSymbol,
      poolId, vaultKind, vaultType, totalAssets,
    };
  }

  static async getUserState(
    client: PublicClient,
    vaultAddress: Address,
    userAddress: Address,
    vaultType: VaultType = 'SYNC',
    depositAssetDecimals: number = 6,
  ): Promise<VaultUserState> {
    const isAsync = vaultType === 'ASYNC';

    const share = await client.readContract({
      address: vaultAddress,
      abi: SYNC_DEPOSIT_VAULT_ABI,
      functionName: 'share',
    }) as Address;

    const batch1 = await client.multicall({
      contracts: [
        { address: share, abi: ERC20_ABI, functionName: 'balanceOf', args: [userAddress] },
        { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'pendingRedeemRequest', args: [ZERO, userAddress] },
        { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'claimableRedeemRequest', args: [ZERO, userAddress] },
        { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'pendingCancelRedeemRequest', args: [ZERO, userAddress] },
        { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'claimableCancelRedeemRequest', args: [ZERO, userAddress] },
      ],
    });

    const shareBalance = (batch1[0].result as bigint) ?? ZERO;
    const pendingShares = (batch1[1].result as bigint) ?? ZERO;
    const claimableShares = (batch1[2].result as bigint) ?? ZERO;
    const pendingCancelRedeem = (batch1[3].result as boolean) ?? false;
    const claimableCancelRedeemShares = (batch1[4].result as bigint) ?? ZERO;

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

    let positionAssets = ZERO;
    let pendingAssets = ZERO;
    let claimableAssets = ZERO;

    const hasAnyShares = shareBalance > ZERO || pendingShares > ZERO || claimableShares > ZERO;
    if (hasAnyShares) {
      const batch3 = await client.multicall({
        contracts: [
          { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'convertToAssets', args: [shareBalance] },
          { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'convertToAssets', args: [pendingShares] },
          { address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'maxWithdraw', args: [userAddress] },
        ],
      });
      positionAssets = (batch3[0].result as bigint) ?? ZERO;
      pendingAssets = (batch3[1].result as bigint) ?? ZERO;
      claimableAssets = (batch3[2].result as bigint) ?? ZERO;
    }

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
      isLoading: false,
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
