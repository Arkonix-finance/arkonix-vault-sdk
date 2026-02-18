import React, { useMemo } from "react";
import { createPublicClient, http } from "viem";
import { VaultContext, type VaultContextValue } from "./VaultContext";
import type { VaultSDKConfig } from "../types/config";
import type { WalletAdapter } from "../types/wallet";
import { WebWalletAdapter } from "../core/wallet/WebWalletAdapter";
import { RNWalletAdapter } from "../core/wallet/RNWalletAdapter";
import { isReactNative } from "../utils";
import { getChain, DEFAULT_CHAIN } from "../constants/chains";

export interface VaultProviderProps {
  config: VaultSDKConfig;
  children: React.ReactNode;
  walletAdapter?: WalletAdapter;
}

export function VaultProvider({ config, children, walletAdapter: customWalletAdapter }: VaultProviderProps) {
  const contextValue = useMemo<VaultContextValue>(() => {
    const chain = getChain(config.chainId) || DEFAULT_CHAIN;

    const walletAdapter = customWalletAdapter ?? (
      isReactNative() ? new RNWalletAdapter() : new WebWalletAdapter()
    );

    const publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });

    return { config, walletAdapter, publicClient };
  }, [config, customWalletAdapter]);

  return (
    <VaultContext.Provider value={contextValue}>
      {children}
    </VaultContext.Provider>
  );
}
