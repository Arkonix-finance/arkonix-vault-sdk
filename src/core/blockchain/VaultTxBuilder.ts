import { encodeFunctionData, type Address } from "viem";
import { ERC20_ABI, SYNC_DEPOSIT_VAULT_ABI, ASYNC_VAULT_ABI } from "../../constants/abis";
import type { TransactionRequest, VaultType } from "../../types/transaction";

export class VaultTxBuilder {
  static buildDepositTx(
    vault: Address, assets: bigint, receiver: Address, vaultType: VaultType = 'SYNC',
  ): TransactionRequest {
    if (vaultType === 'ASYNC') {
      return {
        to: vault,
        data: encodeFunctionData({
          abi: ASYNC_VAULT_ABI, functionName: 'requestDeposit', args: [assets, receiver, receiver],
        }),
        value: 0n,
      };
    }

    return {
      to: vault,
      data: encodeFunctionData({
        abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'deposit', args: [assets, receiver],
      }),
      value: 0n,
    };
  }

  static buildApproveTx(
    token: Address, spender: Address, amount: bigint,
  ): TransactionRequest {
    return {
      to: token,
      data: encodeFunctionData({
        abi: ERC20_ABI, functionName: 'approve', args: [spender, amount],
      }),
      value: 0n,
    };
  }

  static buildRequestRedeemTx(
    vault: Address, shares: bigint, controller: Address, owner: Address,
  ): TransactionRequest {
    return {
      to: vault,
      data: encodeFunctionData({
        abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'requestRedeem', args: [shares, controller, owner],
      }),
      value: 0n,
    };
  }

  static buildClaimRedeemTx(
    vault: Address, shares: bigint, receiver: Address, controller: Address,
  ): TransactionRequest {
    return {
      to: vault,
      data: encodeFunctionData({
        abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'redeem', args: [shares, receiver, controller],
      }),
      value: 0n,
    };
  }

  // requestId is always 0 — ERC-7540 uses single request per user per vault
  static buildCancelRedeemTx(
    vault: Address, controller: Address,
  ): TransactionRequest {
    return {
      to: vault,
      data: encodeFunctionData({
        abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'cancelRedeemRequest', args: [0n, controller],
      }),
      value: 0n,
    };
  }

  // requestId is always 0 — ERC-7540 uses single request per user per vault
  static buildClaimCancelRedeemTx(
    vault: Address, receiver: Address, controller: Address,
  ): TransactionRequest {
    return {
      to: vault,
      data: encodeFunctionData({
        abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'claimCancelRedeemRequest', args: [0n, receiver, controller],
      }),
      value: 0n,
    };
  }
}
