/**
 * Contract Addresses
 * Adapted from L-InvestisseurMusulman/lib/contracts/addresses.ts
 * Extended for multi-chain support
 */

import type { Address } from "viem";

export interface ChainContracts {
  USDC: Address;
}

export const CONTRACTS: Record<number, ChainContracts> = {
  // Arbitrum One
  42161: {
    USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  },
  // Ethereum Mainnet
  1: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
} as const;

/**
 * Get contract addresses for a specific chain
 * @param chainId Chain ID (e.g., 42161 for Arbitrum)
 * @returns Contract addresses or null if chain not supported
 */
export function getContracts(chainId: number): ChainContracts | null {
  return CONTRACTS[chainId] ?? null;
}

/**
 * Check if a chain is supported
 * @param chainId Chain ID to check
 * @returns true if chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in CONTRACTS;
}

/**
 * Get all supported chain IDs
 * @returns Array of supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(CONTRACTS).map(Number);
}
