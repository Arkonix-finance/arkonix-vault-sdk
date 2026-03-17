export interface VaultSDKConfig {
  chainId: number;
  rpcUrl: string;
  // Optional Centrifuge API configuration
  centrifugeAPI?: {
    apiUrl?: string;
    timeout?: number;
  };
}
