/**
 * VaultTxBuilder
 * Static methods to build ERC-7540 vault transaction calldata using viem.
 * Returns TransactionRequest objects ready to send via WalletAdapter.
 */

import { encodeFunctionData, type Address } from "viem";
import { ERC20_ABI, SYNC_DEPOSIT_VAULT_ABI, ASYNC_VAULT_ABI } from "../../constants/abis";
import type { TransactionRequest, VaultType } from "../../types/transaction";

export class VaultTxBuilder {
  /**
   * Build a deposit transaction.
   * - SYNC vaults: vault.deposit(assets, receiver)
   * - ASYNC vaults: vault.requestDeposit(assets, controller, owner)
   */
  static buildDepositTx(
    vault: Address,
    assets: bigint,
    receiver: Address,
    vaultType: VaultType = 'SYNC',
  ): TransactionRequest {
    if (vaultType === 'ASYNC') {
      return {
        to: vault,
        data: encodeFunctionData({
          abi: ASYNC_VAULT_ABI,
          functionName: 'requestDeposit',
          args: [assets, receiver, receiver],
        }),
        value: 0n,
      };
    }

    return {
      to: vault,
      data: encodeFunctionData({
        abi: SYNC_DEPOSIT_VAULT_ABI,
        functionName: 'deposit',
        args: [assets, receiver],
      }),
      value: 0n,
    };
  }

  /**
   * Build an ERC20 approve transaction.
   */
  static buildApproveTx(
    token: Address,
    spender: Address,
    amount: bigint,
  ): TransactionRequest {
    return {
      to: token,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amount],
      }),
      value: 0n,
    };
  }

  /**
   * Build a requestRedeem transaction (ERC-7540 async redeem).
   * vault.requestRedeem(shares, controller, owner)
   */
  static buildRequestRedeemTx(
    vault: Address,
    shares: bigint,
    controller: Address,
    owner: Address,
  ): TransactionRequest {
    return {
      to: vault,
      data: encodeFunctionData({
        abi: SYNC_DEPOSIT_VAULT_ABI,
        functionName: 'requestRedeem',
        args: [shares, controller, owner],
      }),
      value: 0n,
    };
  }

  /**
   * Build a claim redeem transaction.
   * vault.redeem(shares, receiver, controller)
   */
  static buildClaimRedeemTx(
    vault: Address,
    shares: bigint,
    receiver: Address,
    controller: Address,
  ): TransactionRequest {
    return {
      to: vault,
      data: encodeFunctionData({
        abi: SYNC_DEPOSIT_VAULT_ABI,
        functionName: 'redeem',
        args: [shares, receiver, controller],
      }),
      value: 0n,
    };
  }

  /**
   * Build a cancel redeem request transaction.
   * vault.cancelRedeemRequest(requestId=0, controller)
   */
  static buildCancelRedeemTx(
    vault: Address,
    controller: Address,
  ): TransactionRequest {
    return {
      to: vault,
      data: encodeFunctionData({
        abi: SYNC_DEPOSIT_VAULT_ABI,
        functionName: 'cancelRedeemRequest',
        args: [0n, controller],
      }),
      value: 0n,
    };
  }

  /**
   * Build a claim cancel redeem request transaction.
   * vault.claimCancelRedeemRequest(requestId=0, receiver, controller)
   */
  static buildClaimCancelRedeemTx(
    vault: Address,
    receiver: Address,
    controller: Address,
  ): TransactionRequest {
    return {
      to: vault,
      data: encodeFunctionData({
        abi: SYNC_DEPOSIT_VAULT_ABI,
        functionName: 'claimCancelRedeemRequest',
        args: [0n, receiver, controller],
      }),
      value: 0n,
    };
  }
}
