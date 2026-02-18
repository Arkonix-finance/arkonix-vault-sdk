/**
 * Wallet Adapter Type Definitions
 */

import type { Address } from "viem";
import type { TransactionRequest } from "./transaction";

export interface WalletAdapter {
  /**
   * Connect to the wallet
   * @returns The connected wallet address
   */
  connect(): Promise<Address>;

  /**
   * Disconnect from the wallet
   */
  disconnect(): Promise<void>;

  /**
   * Get the current wallet address
   * @returns The wallet address or null if not connected
   */
  getAddress(): Promise<Address | null>;

  /**
   * Send a transaction
   * @param tx Transaction request object
   * @returns Transaction hash
   */
  sendTransaction(tx: TransactionRequest): Promise<string>;

  /**
   * Check if the wallet is connected
   */
  isConnected(): boolean;

  /**
   * Platform identifier
   */
  platform: "web" | "native";
}

export interface AddTokenParams {
  address: Address;
  symbol: string;
  decimals: number;
  image?: string;
}
