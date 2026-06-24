import type { Address } from "viem";
import type { WalletAdapter } from "../../types/wallet";
import type { TransactionRequest } from "../../types/transaction";

interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
}

function getEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as any).ethereum as EthereumProvider | undefined;
}

export class WebWalletAdapter implements WalletAdapter {
  platform = "web" as const;
  private currentAddress: Address | null = null;

  constructor() {
    const ethereum = getEthereum();
    if (ethereum) {
      ethereum.on?.("accountsChanged", (accounts: string[]) => {
        this.currentAddress = (accounts[0] as Address) || null;
      });
    }
  }

  async connect(): Promise<Address> {
    const ethereum = getEthereum();
    if (!ethereum) {
      throw new Error("No wallet found. Please install MetaMask or another Web3 wallet.");
    }

    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found. Please connect your wallet.");
    }

    this.currentAddress = accounts[0] as Address;
    return this.currentAddress;
  }

  async disconnect(): Promise<void> {
    this.currentAddress = null;
  }

  async getAddress(): Promise<Address | null> {
    if (this.currentAddress) return this.currentAddress;

    const ethereum = getEthereum();
    if (!ethereum) return null;

    try {
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts && accounts.length > 0) {
        this.currentAddress = accounts[0] as Address;
        return this.currentAddress;
      }
    } catch {
      // No connected accounts (or provider rejected) — treat as not connected.
    }

    return null;
  }

  async sendTransaction(tx: TransactionRequest): Promise<string> {
    const ethereum = getEthereum();
    if (!ethereum) {
      throw new Error("No wallet found");
    }

    const address = await this.getAddress();
    if (!address) throw new Error("Wallet not connected");

    return await ethereum.request({
      method: "eth_sendTransaction",
      params: [{
        from: address,
        to: tx.to,
        data: tx.data,
        value: `0x${tx.value.toString(16)}`,
      }],
    });
  }

  isConnected(): boolean {
    return this.currentAddress !== null;
  }
}
