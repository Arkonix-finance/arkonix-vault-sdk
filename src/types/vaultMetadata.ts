import type { Address } from "viem";
import type { VaultType } from "./transaction";

export interface VaultMetadata {
  asset: Address;
  share: Address;
  assetDecimals: number;
  shareDecimals: number;
  assetSymbol: string;
  shareSymbol: string;
  poolId: bigint;
  vaultKind: number;
  vaultType: VaultType;
  totalAssets: bigint;
}
