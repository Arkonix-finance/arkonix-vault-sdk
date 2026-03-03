import type { Address } from "viem";

export type TxState = 'idle' | 'approving' | 'pending' | 'confirming' | 'success' | 'error';

export type VaultType = 'ASYNC' | 'SYNC_DEPOSIT_ASYNC_REDEEM';

export interface TransactionRequest {
  to: Address;
  data: `0x${string}`;
  value: bigint;
}
