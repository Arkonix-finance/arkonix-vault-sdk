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
  private accountListeners = new Set<(address: Address | null) => void>();
  private boundAccountsChanged?: (accounts: string[]) => void;
  private boundConnect?: () => void;
  private boundDisconnect?: () => void;

  constructor() {
    const ethereum = getEthereum();
    if (!ethereum) return;

    this.boundAccountsChanged = (accounts: string[]) => {
      this.setAddress((accounts[0] as Address) || null);
    };
    this.boundConnect = () => {
      void this.refreshAddressFromProvider();
    };
    this.boundDisconnect = () => {
      this.setAddress(null);
    };

    ethereum.on?.("accountsChanged", this.boundAccountsChanged);
    ethereum.on?.("connect", this.boundConnect);
    ethereum.on?.("disconnect", this.boundDisconnect);
  }

  onAccountsChanged(callback: (address: Address | null) => void): () => void {
    this.accountListeners.add(callback);
    return () => {
      this.accountListeners.delete(callback);
    };
  }

  private notifyAccountListeners(): void {
    const address = this.currentAddress;
    for (const listener of this.accountListeners) {
      listener(address);
    }
  }

  private setAddress(address: Address | null): void {
    this.currentAddress = address;
    this.notifyAccountListeners();
  }

  private async refreshAddressFromProvider(): Promise<void> {
    const ethereum = getEthereum();
    if (!ethereum) {
      this.setAddress(null);
      return;
    }

    try {
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts && accounts.length > 0) {
        this.setAddress(accounts[0] as Address);
        return;
      }
    } catch {}

    this.setAddress(null);
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

    const address = accounts[0] as Address;
    this.setAddress(address);
    return address;
  }

  async disconnect(): Promise<void> {
    this.setAddress(null);
  }

  async getAddress(): Promise<Address | null> {
    if (this.currentAddress) return this.currentAddress;

    await this.refreshAddressFromProvider();
    return this.currentAddress;
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
