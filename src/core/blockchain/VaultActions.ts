import { parseUnits, type Address, type Hash, type PublicClient } from "viem";
import { ERC20_ABI } from "../../constants/abis";
import { VaultTxBuilder } from "./VaultTxBuilder";
import type { TransactionRequest, VaultType } from "../../types/transaction";

export type SendTransactionFn = (tx: TransactionRequest) => Promise<string>;

export interface DepositResult {
  approveHash?: Hash;
  depositHash: Hash;
}

export interface TxResult {
  txHash: Hash;
}

export class VaultActions {
  static async deposit(
    client: PublicClient,
    sendTransaction: SendTransactionFn,
    vaultAddress: Address,
    amount: string,
    userAddress: Address,
    assetAddress: Address,
    assetDecimals: number,
    vaultType: VaultType = 'SYNC',
  ): Promise<DepositResult> {
    const parsedAmount = parseUnits(amount, assetDecimals);
    if (parsedAmount <= 0n) throw new Error('Amount must be greater than 0');

    let approveHash: Hash | undefined;

    const allowance = await client.readContract({
      address: assetAddress, abi: ERC20_ABI, functionName: 'allowance',
      args: [userAddress, vaultAddress],
    }) as bigint;

    if (allowance < parsedAmount) {
      const approveTx = VaultTxBuilder.buildApproveTx(assetAddress, vaultAddress, parsedAmount);
      approveHash = await sendTransaction(approveTx) as Hash;
      await client.waitForTransactionReceipt({ hash: approveHash });
    }

    const depositTx = VaultTxBuilder.buildDepositTx(vaultAddress, parsedAmount, userAddress, vaultType);
    const depositHash = await sendTransaction(depositTx) as Hash;
    await client.waitForTransactionReceipt({ hash: depositHash });

    return { approveHash, depositHash };
  }

  static async requestRedeem(
    client: PublicClient,
    sendTransaction: SendTransactionFn,
    vaultAddress: Address,
    shares: string,
    userAddress: Address,
    shareDecimals: number = 18,
  ): Promise<TxResult> {
    const parsedShares = parseUnits(shares, shareDecimals);
    if (parsedShares <= 0n) throw new Error('Shares must be greater than 0');

    const tx = VaultTxBuilder.buildRequestRedeemTx(vaultAddress, parsedShares, userAddress, userAddress);
    const txHash = await sendTransaction(tx) as Hash;
    await client.waitForTransactionReceipt({ hash: txHash });

    return { txHash };
  }

  static async claimRedeem(
    client: PublicClient,
    sendTransaction: SendTransactionFn,
    vaultAddress: Address,
    shares: bigint,
    userAddress: Address,
  ): Promise<TxResult> {
    if (shares <= 0n) throw new Error('No shares to claim');

    const tx = VaultTxBuilder.buildClaimRedeemTx(vaultAddress, shares, userAddress, userAddress);
    const txHash = await sendTransaction(tx) as Hash;
    await client.waitForTransactionReceipt({ hash: txHash });

    return { txHash };
  }

  static async cancelRedeem(
    client: PublicClient,
    sendTransaction: SendTransactionFn,
    vaultAddress: Address,
    userAddress: Address,
  ): Promise<TxResult> {
    const tx = VaultTxBuilder.buildCancelRedeemTx(vaultAddress, userAddress);
    const txHash = await sendTransaction(tx) as Hash;
    await client.waitForTransactionReceipt({ hash: txHash });

    return { txHash };
  }

  static async claimCancelRedeem(
    client: PublicClient,
    sendTransaction: SendTransactionFn,
    vaultAddress: Address,
    userAddress: Address,
  ): Promise<TxResult> {
    const tx = VaultTxBuilder.buildClaimCancelRedeemTx(vaultAddress, userAddress, userAddress);
    const txHash = await sendTransaction(tx) as Hash;
    await client.waitForTransactionReceipt({ hash: txHash });

    return { txHash };
  }
}
