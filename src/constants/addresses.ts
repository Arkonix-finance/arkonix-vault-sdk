import type { Address } from "viem";

export interface ChainContracts {
  USDC: Address;
}

const CONTRACTS: Record<number, ChainContracts> = {
  42161: { USDC: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
  1: { USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
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
