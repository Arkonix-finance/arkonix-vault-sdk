import { arbitrum, mainnet } from "viem/chains";
import type { Chain } from "viem";

const SUPPORTED_CHAINS: Record<number, Chain> = {
  1: mainnet,
  42161: arbitrum,
} as const;

export function getChain(chainId: number): Chain | null {
  return SUPPORTED_CHAINS[chainId] ?? null;
}

export const DEFAULT_CHAIN = arbitrum;
export const DEFAULT_CHAIN_ID = 42161;
