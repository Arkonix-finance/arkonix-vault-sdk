/**
 * Vault Metadata Types
 * On-chain metadata readable from a vault address alone.
 */

import type { Address } from "viem";
import type { VaultType } from "./transaction";

export interface VaultMetadata {
  /** The deposit asset address (e.g. USDC) */
  asset: Address;
  /** The share token address */
  share: Address;
  /** Deposit asset decimals */
  assetDecimals: number;
  /** Share token decimals */
  shareDecimals: number;
  /** Deposit asset symbol (e.g. "USDC") */
  assetSymbol: string;
  /** Share token symbol */
  shareSymbol: string;
  /** Pool ID this vault belongs to */
  poolId: bigint;
  /** Vault kind: 0 = SYNC, 1 = ASYNC */
  vaultKind: number;
  /** Derived vault type */
  vaultType: VaultType;
  /** Total assets under management */
  totalAssets: bigint;
}
