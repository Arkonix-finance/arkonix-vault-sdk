/**
 * Types for Centrifuge GraphQL API responses
 * @see https://docs.centrifuge.io/developer/centrifuge-api/
 */

/**
 * Represents an asset in the Centrifuge system
 */
export interface CentrifugeAsset {
  id?: string;
  name: string;
  symbol: string;
  decimals?: number;
  address?: string;
}

/**
 * Represents a holding escrow containing vault assets
 */
export interface CentrifugeHoldingEscrow {
  id?: string;
  poolId: string;
  tokenId: string;
  assetId?: string;
  assetAmount: string;
  assetPrice: string;
  asset?: CentrifugeAsset;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Represents a Centrifuge vault
 */
export interface CentrifugeVault {
  /** Vault contract address */
  id: string;
  poolId: string;
  tokenId: string;
  centrifugeId: string;
  assetAddress: string;
  isActive: boolean;
  status?: string;
  blockchain?: {
    chainId?: number;
    network?: string;
  };
}

export interface HoldingsQueryParams {
  poolId?: string;
  tokenId?: string;
  centrifugeId?: string;
  assetId?: string;
  assetAddress?: string;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface VaultsQueryParams {
  poolId?: string;
  tokenId?: string;
  centrifugeId?: string;
  id?: string; // Vault address
  isActive?: boolean;
  assetAddress?: string;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface GraphQLResponse<T> {
  data: {
    holdingEscrows?: {
      items: T[];
      totalCount?: number;
    };
    vaults?: {
      items: T[];
      totalCount?: number;
    };
  };
  errors?: Array<{
    message: string;
    extensions?: any;
  }>;
}

export interface CentrifugeAPIConfig {
  apiUrl?: string;
  timeout?: number;
}