export interface VaultSDKConfig {
  chainId: number;
  rpcUrl: string;
  /**
   * Arkonix backend API — source of NAV, returns, share price, and historical series.
   * These metrics are NOT on-chain; they come from Arkonix's public endpoints.
   */
  arkonixAPI?: {
    /** Base URL of the Arkonix execution API, e.g. "https://api.arkonix.xyz" */
    baseUrl: string;
    /** Request timeout in ms (default 30000) */
    timeout?: number;
  };
  // Optional Centrifuge API configuration (holdings/vaults GraphQL)
  centrifugeAPI?: {
    apiUrl?: string;
    timeout?: number;
  };
}
