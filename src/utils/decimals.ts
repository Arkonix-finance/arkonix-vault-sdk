/**
 * Token Decimal Utilities
 * Wrappers around viem's parseUnits and formatUnits for convenience
 */

import { parseUnits as viemParseUnits, formatUnits as viemFormatUnits } from "viem";

/**
 * Parse a token amount from human-readable string to wei
 * @param value Amount as string (e.g., "100.5")
 * @param decimals Token decimals (default: 18)
 * @returns Amount in wei as bigint
 */
export function parseUnits(value: string, decimals: number = 18): bigint {
  return viemParseUnits(value, decimals);
}

/**
 * Format a token amount from wei to human-readable string
 * @param value Amount in wei (bigint)
 * @param decimals Token decimals (default: 18)
 * @returns Amount as string
 */
export function formatUnits(value: bigint, decimals: number = 18): string {
  return viemFormatUnits(value, decimals);
}

/**
 * Common token decimals
 */
export const TOKEN_DECIMALS = {
  USDC: 6,
  USDT: 6,
  DAI: 18,
  WETH: 18,
  WBTC: 8,
  VAULT_SHARE: 18, // ERC-7540 vault shares use 18 decimals
} as const;
