// Provider
export { VaultProvider } from "./provider/VaultProvider";
export type { VaultProviderProps } from "./provider/VaultProvider";
export { useVaultContext } from "./provider/VaultContext";
export type { VaultContextValue } from "./provider/VaultContext";

// Hooks
export { useUserAddress } from "./hooks/useUserAddress";
export { useWriteTransaction } from "./hooks/useWriteTransaction";
export { useDeposit } from "./hooks/useDeposit";
export { useClaimDeposit } from "./hooks/useClaimDeposit";
export { useRequestRedeem } from "./hooks/useRequestRedeem";
export { useClaimRedeem } from "./hooks/useClaimRedeem";
export { useVaultUserState } from "./hooks/useVaultUserState";
export { useVaultMetadata } from "./hooks/useVaultMetadata";

// Types
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

// Standalone core (no React required)
export { VaultReader } from "./core/blockchain";
export { VaultTxBuilder } from "./core/blockchain";
export { VaultActions } from "./core/blockchain";
export type { SendTransactionFn, DepositResult, TxResult } from "./core/blockchain";

// Wallet adapters
export { WebWalletAdapter, RNWalletAdapter } from "./core/wallet";

// Utilities
export { isReactNative, isWeb, getPlatform } from "./utils";
export {
  getContracts,
  isChainSupported,
  getSupportedChainIds,
  getChain,
  DEFAULT_CHAIN,
  DEFAULT_CHAIN_ID,
} from "./constants";
