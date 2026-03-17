import type {
  CentrifugeAPIConfig,
  CentrifugeHoldingEscrow,
  CentrifugeVault,
  GraphQLResponse,
  HoldingsQueryParams,
  VaultsQueryParams,
} from '../../types/centrifugeApi';

/**
 * Client for interacting with the Centrifuge GraphQL API
 * @see https://docs.centrifuge.io/developer/centrifuge-api/
 */
export class CentrifugeAPIClient {
  private apiUrl: string;
  private timeout: number;

  constructor(config: CentrifugeAPIConfig = {}) {
    this.apiUrl = config.apiUrl || 'https://api.centrifuge.io';
    this.timeout = config.timeout || 30000;
  }

  /**
   * Builds a GraphQL query string for holding escrows
   */
  private buildHoldingsQuery(params: HoldingsQueryParams): string {
    const filters: string[] = [];
    
    if (params.poolId !== undefined) {
      filters.push(`poolId: "${params.poolId}"`);
    }
    if (params.tokenId !== undefined) {
      filters.push(`tokenId: "${params.tokenId}"`);
    }
    if (params.assetId !== undefined) {
      filters.push(`assetId: "${params.assetId}"`);
    }

    const whereClause = filters.length > 0 ? `where: { ${filters.join(', ')} }` : '';
    const limitClause = params.limit ? `limit: ${params.limit}` : 'limit: 100';
    const orderByClause = params.orderBy ? `orderBy: "${params.orderBy}"` : '';
    const orderDirectionClause = params.orderDirection ? `orderDirection: "${params.orderDirection}"` : '';
    
    const queryParams = [whereClause, limitClause, orderByClause, orderDirectionClause]
      .filter(Boolean)
      .join(', ');

    return `
      query GetHoldingEscrows {
        holdingEscrows(${queryParams}) {
          items {
            poolId
            tokenId
            assetId
            assetAmount
            assetPrice
            asset {
              name
              symbol
              decimals
              address
            }
            createdAt
            updatedAt
          }
          totalCount
        }
      }
    `;
  }

  /**
   * Builds a GraphQL query string for vaults
   */
  private buildVaultsQuery(params: VaultsQueryParams): string {
    const filters: string[] = [];
    
    if (params.poolId !== undefined) {
      filters.push(`poolId: "${params.poolId}"`);
    }
    if (params.tokenId !== undefined) {
      filters.push(`tokenId: "${params.tokenId}"`);
    }
    if (params.centrifugeId !== undefined) {
      filters.push(`centrifugeId: "${params.centrifugeId}"`);
    }
    if (params.id !== undefined) {
      filters.push(`id: "${params.id}"`);
    }
    if (params.isActive !== undefined) {
      filters.push(`isActive: ${params.isActive}`);
    }
    if (params.assetAddress !== undefined) {
      filters.push(`assetAddress: "${params.assetAddress}"`);
    }

    const whereClause = filters.length > 0 ? `where: { ${filters.join(', ')} }` : '';
    const limitClause = params.limit ? `limit: ${params.limit}` : 'limit: 100';
    const orderByClause = params.orderBy ? `orderBy: "${params.orderBy}"` : '';
    const orderDirectionClause = params.orderDirection ? `orderDirection: "${params.orderDirection}"` : '';
    
    const queryParams = [whereClause, limitClause, orderByClause, orderDirectionClause]
      .filter(Boolean)
      .join(', ');

    return `
      query GetVaults {
        vaults(${queryParams}) {
          items {
            id
            poolId
            tokenId
            centrifugeId
            assetAddress
            isActive
            status
            blockchain {
              chainId
              network
            }
          }
          totalCount
        }
      }
    `;
  }

  /**
   * Executes a GraphQL query against the Centrifuge API
   * @private
   * @param query The GraphQL query string
   * @returns The GraphQL response
   * @throws Error on network failure, timeout, or HTTP errors
   */
  private async executeQuery<T>(query: string): Promise<GraphQLResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as GraphQLResponse<T>;
      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Query holding escrows with optional filters
   * @param params Query parameters including poolId and tokenId filters
   * @returns Array of holding escrows matching the criteria
   */
  async getHoldings(params: HoldingsQueryParams = {}): Promise<CentrifugeHoldingEscrow[]> {
    const query = this.buildHoldingsQuery(params);
    const response = await this.executeQuery<CentrifugeHoldingEscrow>(query);
    
    if (response.errors && response.errors.length > 0) {
      throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
    }

    return response.data.holdingEscrows?.items || [];
  }

  /**
   * Query vaults with optional filters
   * @param params Query parameters including poolId and tokenId filters
   * @returns Array of vaults matching the criteria
   */
  async getVaults(params: VaultsQueryParams = {}): Promise<CentrifugeVault[]> {
    const query = this.buildVaultsQuery(params);
    const response = await this.executeQuery<CentrifugeVault>(query);
    
    if (response.errors && response.errors.length > 0) {
      throw new Error(`GraphQL errors: ${response.errors.map(e => e.message).join(', ')}`);
    }

    return response.data.vaults?.items || [];
  }

  /**
   * Get holdings for a specific vault (pool + token combination)
   * @param poolId The pool ID
   * @param tokenId The token ID
   * @returns Holdings for the specified vault
   */
  async getVaultHoldings(poolId: string, tokenId: string): Promise<CentrifugeHoldingEscrow[]> {
    return this.getHoldings({ poolId, tokenId });
  }

  /**
   * Get all holdings for a specific pool
   * @param poolId The pool ID
   * @returns All holdings for the specified pool
   */
  async getPoolHoldings(poolId: string): Promise<CentrifugeHoldingEscrow[]> {
    return this.getHoldings({ poolId });
  }
}