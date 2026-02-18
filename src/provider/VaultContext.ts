/**
 * Vault Context
 * React Context for accessing SDK configuration and clients
 */

import { createContext, useContext } from "react";
import type { PublicClient } from "viem";
import type { VaultSDKConfig } from "../types/config";
import type { WalletAdapter } from "../types/wallet";

export interface VaultContextValue {
  config: VaultSDKConfig;
  walletAdapter: WalletAdapter;
  publicClient: PublicClient;
}

export const VaultContext = createContext<VaultContextValue | null>(null);

/**
 * Hook to access the Vault SDK context.
 * Must be used within a VaultProvider.
 */
export function useVaultContext(): VaultContextValue {
  const context = useContext(VaultContext);

  if (!context) {
    throw new Error("useVaultContext must be used within a VaultProvider");
  }

  return context;
}
