import type { Address } from "viem";
import type { WalletAdapter } from "../../types/wallet";
import type { TransactionRequest } from "../../types/transaction";

// Default fallback for React Native — partners should pass their own walletAdapter to VaultProvider
export class RNWalletAdapter implements WalletAdapter {
  platform = "native" as const;

  async connect(): Promise<Address> {
    throw new Error("Pass a custom walletAdapter to VaultProvider for React Native.");
  }

  async disconnect(): Promise<void> {}

  async getAddress(): Promise<Address | null> {
    return null;
  }

  async sendTransaction(_tx: TransactionRequest): Promise<string> {
    throw new Error("Pass a custom walletAdapter to VaultProvider for React Native.");
  }

  isConnected(): boolean {
    return false;
  }
}
