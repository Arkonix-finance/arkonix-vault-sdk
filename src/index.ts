// Provider
export { VaultProvider } from "./provider/VaultProvider";
export type { VaultProviderProps } from "./provider/VaultProvider";
export { useVaultContext } from "./provider/VaultContext";
export type { VaultContextValue } from "./provider/VaultContext";

// Hooks — wallet & transactions
export { useUserAddress } from "./hooks/useUserAddress";
export { useWriteTransaction } from "./hooks/useWriteTransaction";

// Hooks — deposit / redeem lifecycle
export { useDeposit } from "./hooks/useDeposit";
export { useClaimDeposit } from "./hooks/useClaimDeposit";
export { useRequestRedeem } from "./hooks/useRequestRedeem";
export { useClaimRedeem } from "./hooks/useClaimRedeem";
export { useCancelRedeem } from "./hooks/useCancelRedeem";
export { useCancelDeposit } from "./hooks/useCancelDeposit";

// Hooks — vault & user state
export { useVaultUserState } from "./hooks/useVaultUserState";
export { useVaultMetadata } from "./hooks/useVaultMetadata";

// Hooks — Arkonix financial data (NAV / returns / share price / history)
export {
  useVaultFinancials,
  useReturnHistory,
  useTvlHistory,
  useSharePriceHistory,
} from "./hooks/useVaultFinancials";

// Hooks — Centrifuge holdings & vaults
export { useCentrifugeHoldings, useVaultHoldings, usePoolHoldings } from "./hooks/useCentrifugeHoldings";
export { useCentrifugeVaults, usePoolVaults, useActiveVaults } from "./hooks/useCentrifugeVaults";

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

// Arkonix API Types (NAV / returns / share price / history)
export type {
  ArkonixAPIConfig,
  ArkonixVaultRef,
  VaultFinancials,
  ReturnHistory,
  ReturnHistoryPoint,
  TvlHistory,
  TvlHistoryPoint,
  SharePriceHistory,
  SharePricePoint,
  HistoryQueryParams,
} from "./types/arkonixApi";

// Centrifuge API Types
export type {
  CentrifugeAsset,
  CentrifugeHoldingEscrow,
  CentrifugeVault,
  HoldingsQueryParams,
  VaultsQueryParams,
  CentrifugeAPIConfig,
} from "./types/centrifugeApi";

// Standalone core (no React required)
export { VaultReader } from "./core/blockchain";
export { VaultTxBuilder } from "./core/blockchain";
export { VaultActions } from "./core/blockchain";
export type { SendTransactionFn, DepositResult, TxResult } from "./core/blockchain";

// API Clients
export { ArkonixAPIClient } from "./core/api";
export { CentrifugeAPIClient } from "./core/api";

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
