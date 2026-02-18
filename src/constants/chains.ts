/**
 * Supported Chain Definitions
 */

import { arbitrum, mainnet } from "viem/chains";
import type { Chain } from "viem";

export const SUPPORTED_CHAINS: Record<number, Chain> = {
  1: mainnet,
  42161: arbitrum,
} as const;

/**
 * Get chain configuration by chain ID
 * @param chainId Chain ID
 * @returns Chain configuration or null if not supported
 */
export function getChain(chainId: number): Chain | null {
  return SUPPORTED_CHAINS[chainId] ?? null;
}

/**
 * Default chain (Arbitrum One)
 */
export const DEFAULT_CHAIN = arbitrum;
export const DEFAULT_CHAIN_ID = 42161;
