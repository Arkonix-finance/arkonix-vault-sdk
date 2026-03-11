import { encodeFunctionData, type Address } from "viem";
import { ERC20_ABI, SYNC_DEPOSIT_VAULT_ABI, ASYNC_VAULT_ABI } from "../../constants/abis";
import type { TransactionRequest, VaultType } from "../../types/transaction";

export class VaultTxBuilder {
  static buildDepositTx(
    vault: Address, assets: bigint, receiver: Address, vaultType: VaultType = 'ASYNC',
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

    // SYNC_DEPOSIT_ASYNC_REDEEM: deposit is synchronous (ERC-4626)
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

  /**
   * Claim deposit: for ASYNC vaults, after the epoch processes,
   * call the ERC-4626 deposit(assets, receiver) to mint shares.
   */
  static buildClaimDepositTx(
    vault: Address, assets: bigint, receiver: Address,
  ): TransactionRequest {
    return {
      to: vault,
      data: encodeFunctionData({
        abi: SYNC_DEPOSIT_VAULT_ABI, functionName: 'deposit', args: [assets, receiver],
      }),
      value: 0n,
    };
  }

}
