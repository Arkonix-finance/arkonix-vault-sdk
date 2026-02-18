import type { Address } from "viem";

export type TxState = 'idle' | 'approving' | 'pending' | 'confirming' | 'success' | 'error';

export type VaultType = 'SYNC' | 'ASYNC';

export interface TransactionRequest {
  to: Address;
  data: `0x${string}`;
  value: bigint;
}
