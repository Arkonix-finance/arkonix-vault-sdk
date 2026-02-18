/**
 * Vault Provider
 * React Context Provider that initializes SDK clients.
 * Accepts an optional custom walletAdapter for wagmi/RainbowKit integration.
 */

import React, { useMemo } from "react";
import { createPublicClient, http } from "viem";
import { VaultContext, type VaultContextValue } from "./VaultContext";
import type { VaultSDKConfig } from "../types/config";
import type { WalletAdapter } from "../types/wallet";
import { WebWalletAdapter } from "../core/wallet/WebWalletAdapter";
import { RNWalletAdapter } from "../core/wallet/RNWalletAdapter";
import { isReactNative } from "../utils/platform";
import { getChain, DEFAULT_CHAIN } from "../constants/chains";

export interface VaultProviderProps {
  config: VaultSDKConfig;
  children: React.ReactNode;
  /**
   * Optional custom wallet adapter.
   * Use this to integrate with wagmi, RainbowKit, or any existing wallet setup.
   * If not provided, defaults to WebWalletAdapter (browser) or RNWalletAdapter (React Native).
   */
  walletAdapter?: WalletAdapter;
}

export function VaultProvider({ config, children, walletAdapter: customWalletAdapter }: VaultProviderProps) {
  const contextValue = useMemo<VaultContextValue>(() => {
    const chain = getChain(config.chainId) || DEFAULT_CHAIN;

    const walletAdapter = customWalletAdapter ?? (
      isReactNative()
        ? new RNWalletAdapter(config.walletConnectProjectId)
        : new WebWalletAdapter()
    );

    const publicClient = createPublicClient({
      chain,
      transport: http(config.rpcUrl),
    });

    return {
      config,
      walletAdapter,
      publicClient,
    };
  }, [config, customWalletAdapter]);

  return (
    <VaultContext.Provider value={contextValue}>
      {children}
    </VaultContext.Provider>
  );
}
