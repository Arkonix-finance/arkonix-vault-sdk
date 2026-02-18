/**
 * Web Wallet Adapter
 * Browser wallet integration using window.ethereum (MetaMask, etc.)
 */

import type { Address } from "viem";
import type { WalletAdapter } from "../../types/wallet";
import type { TransactionRequest } from "../../types/transaction";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (
        event: string,
        handler: (...args: any[]) => void
      ) => void;
    };
  }
}

export class WebWalletAdapter implements WalletAdapter {
  platform = "web" as const;
  private currentAddress: Address | null = null;

  constructor() {
    if (typeof window !== "undefined" && window.ethereum) {
      // Listen for account changes
      window.ethereum.on?.("accountsChanged", (accounts: string[]) => {
        this.currentAddress = (accounts[0] as Address) || null;
      });
    }
  }

  async connect(): Promise<Address> {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error(
        "No wallet found. Please install MetaMask or another Web3 wallet."
      );
    }

    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found. Please connect your wallet.");
    }

    this.currentAddress = accounts[0] as Address;
    return this.currentAddress;
  }

  async disconnect(): Promise<void> {
    this.currentAddress = null;
    // Note: Most wallets don't support programmatic disconnection
    // User must disconnect from the wallet extension directly
  }

  async getAddress(): Promise<Address | null> {
    if (this.currentAddress) {
      return this.currentAddress;
    }

    if (typeof window === "undefined" || !window.ethereum) {
      return null;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts && accounts.length > 0) {
        this.currentAddress = accounts[0] as Address;
        return this.currentAddress;
      }
    } catch (error) {
      console.error("Failed to get accounts:", error);
    }

    return null;
  }

  async sendTransaction(tx: TransactionRequest): Promise<string> {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("No wallet found");
    }

    const address = await this.getAddress();
    if (!address) {
      throw new Error("Wallet not connected. Please connect your wallet.");
    }

    const txHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: address,
          to: tx.to,
          data: tx.data,
          value: `0x${tx.value.toString(16)}`,
        },
      ],
    });

    return txHash;
  }

  isConnected(): boolean {
    return this.currentAddress !== null;
  }

  /**
   * Request to switch to a specific chain
   */
  async switchChain(chainId: number): Promise<void> {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("No wallet found");
    }

    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  }

  /**
   * Add a token to the user's wallet
   */
  async watchAsset(params: {
    address: Address;
    symbol: string;
    decimals: number;
    image?: string;
  }): Promise<boolean> {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("No wallet found");
    }

    return await window.ethereum.request({
      method: "wallet_watchAsset",
      params: [
        {
          type: "ERC20",
          options: {
            address: params.address,
            symbol: params.symbol,
            decimals: params.decimals,
            image: params.image,
          },
        },
      ],
    });
  }
}
