import { createContext, useContext } from "react";
import type { PublicClient } from "viem";
import type { VaultSDKConfig } from "../types/config";
import type { WalletAdapter } from "../types/wallet";
import type { CentrifugeAPIClient } from "../core/api";

export interface VaultContextValue {
  config: VaultSDKConfig;
  walletAdapter: WalletAdapter;
  publicClient: PublicClient;
  centrifugeAPIClient?: CentrifugeAPIClient;
}

export const VaultContext = createContext<VaultContextValue | null>(null);

// Must be used within a VaultProvider
export function useVaultContext(): VaultContextValue {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error("useVaultContext must be used within a VaultProvider");
  }
  return context;
}
