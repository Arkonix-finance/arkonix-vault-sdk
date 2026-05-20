import type { Address } from "viem";
import type { TransactionRequest } from "./transaction";

export interface WalletAdapter {
  connect(): Promise<Address>;
  disconnect(): Promise<void>;
  getAddress(): Promise<Address | null>;
  sendTransaction(tx: TransactionRequest): Promise<string>;
  isConnected(): boolean;
  platform: "web" | "native";
  /** Subscribe to wallet connect, disconnect, and account changes. */
  onAccountsChanged?(callback: (address: Address | null) => void): () => void;
}

export interface AddTokenParams {
  address: Address;
  symbol: string;
  decimals: number;
  image?: string;
}
