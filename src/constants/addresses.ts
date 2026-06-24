import type { Address } from "viem";

export interface ChainContracts {
  /**
   * Canonical native USDC for the chain, provided as a convenience.
   * NOTE: the SDK does not rely on this for deposit/redeem — the deposit asset
   * is always read on-chain from the vault via `VaultReader.getMetadata().asset`.
   * Chains whose native USDC address is not included here will return `null`.
   */
  USDC?: Address;
}

const CONTRACTS: Record<number, ChainContracts> = {
  // Ethereum mainnet
  1: { USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
  // Base
  8453: { USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
  // Arbitrum One
  42161: { USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
  // BNB Smart Chain (USDC has 18 decimals on BSC)
  56: { USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d" },
  // HyperEVM — native USDC address not included; deposit asset is read from vault metadata
  999: {},
} as const;

export function getContracts(chainId: number): ChainContracts | null {
  return CONTRACTS[chainId] ?? null;
}

export function isChainSupported(chainId: number): boolean {
  return chainId in CONTRACTS;
}

export function getSupportedChainIds(): number[] {
  return Object.keys(CONTRACTS).map(Number);
}
