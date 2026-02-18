/**
 * @arkonix.xyz/arkonix-vault-sdk
 * Universal React/React Native SDK for ERC-7540 vault operations
 *
 * Main entry point - exports all public APIs
 */

// ============================================================================
// Provider
// ============================================================================
export { VaultProvider } from "./provider/VaultProvider";
export type { VaultProviderProps } from "./provider/VaultProvider";
export { useVaultContext } from "./provider/VaultContext";
export type { VaultContextValue } from "./provider/VaultContext";

// ============================================================================
// Hooks
// ============================================================================
export { useUserAddress } from "./hooks/useUserAddress";
export { useWriteTransaction } from "./hooks/useWriteTransaction";
export { useDeposit } from "./hooks/useDeposit";
export { useRequestRedeem } from "./hooks/useRequestRedeem";
export { useClaimRedeem } from "./hooks/useClaimRedeem";
export { useCancelRedeem } from "./hooks/useCancelRedeem";
export { useClaimCancelRedeem } from "./hooks/useClaimCancelRedeem";
export { useVaultUserState } from "./hooks/useVaultUserState";
export { useVaultMetadata } from "./hooks/useVaultMetadata";

// ============================================================================
// Types
// ============================================================================
export type {
  VaultSDKConfig,
  TxState,
  VaultType,
  TransactionRequest,
  VaultUserState,
  VaultMetadata,
  WalletAdapter,
  AddTokenParams,
} from "./types";

// ============================================================================
// Utilities
// ============================================================================
export {
  parseUnits,
  formatUnits,
  TOKEN_DECIMALS,
  isReactNative,
  isWeb,
  getPlatform,
} from "./utils";

// ============================================================================
// Constants
// ============================================================================
export {
  ERC20_ABI,
  SYNC_DEPOSIT_VAULT_ABI,
  ASYNC_VAULT_ABI,
  getContracts,
  isChainSupported,
  getSupportedChainIds,
  getChain,
  DEFAULT_CHAIN,
  DEFAULT_CHAIN_ID,
} from "./constants";

// ============================================================================
// Core (Advanced Usage)
// ============================================================================
export { VaultTxBuilder } from "./core/blockchain";
export { WebWalletAdapter, RNWalletAdapter } from "./core/wallet";
