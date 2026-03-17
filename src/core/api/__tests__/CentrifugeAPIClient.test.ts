import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CentrifugeAPIClient } from '../CentrifugeAPIClient';
import type { CentrifugeHoldingEscrow, CentrifugeVault } from '../../../types/centrifugeApi';

// Mock fetch
global.fetch = vi.fn();

describe('CentrifugeAPIClient', () => {
  let client: CentrifugeAPIClient;

  beforeEach(() => {
    client = new CentrifugeAPIClient({
      apiUrl: 'https://api.centrifuge.io',
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getHoldings', () => {
    it('should fetch holdings with poolId and tokenId filters', async () => {
      const mockHoldings: CentrifugeHoldingEscrow[] = [
        {
          poolId: 'pool-123',
          tokenId: 'token-456',
          assetId: 'asset-789',
          assetAmount: '1000000',
          assetPrice: '1000000000000000000',
          asset: {
            name: 'USDC',
            symbol: 'USDC',
            decimals: 6,
            address: '0xabc123',
          },
        },
      ];

      const mockResponse = {
        data: {
          holdingEscrows: {
            items: mockHoldings,
            totalCount: 1,
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getHoldings({
        poolId: 'pool-123',
        tokenId: 'token-456',
      });

      expect(result).toEqual(mockHoldings);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.centrifuge.io',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }),
          body: expect.stringContaining('poolId: \\"pool-123\\"'),
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.centrifuge.io',
        expect.objectContaining({
          body: expect.stringContaining('tokenId: \\"token-456\\"'),
        })
      );
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        data: {
          holdingEscrows: {
            items: [],
            totalCount: 0,
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getHoldings({});
      expect(result).toEqual([]);
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        data: null,
        errors: [
          {
            message: 'GraphQL error occurred',
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(client.getHoldings({})).rejects.toThrow('GraphQL errors: GraphQL error occurred');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.getHoldings({})).rejects.toThrow('Network error');
    });

    it('should handle timeout', async () => {
      const slowClient = new CentrifugeAPIClient({ timeout: 100 });

      (global.fetch as any).mockImplementationOnce((_url: string, options: any) => {
        return new Promise((resolve, reject) => {
          // Listen for abort signal
          const abortHandler = () => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          };

          if (options.signal) {
            options.signal.addEventListener('abort', abortHandler);
          }

          // Simulate a slow response that takes longer than the timeout
          setTimeout(() => {
            if (!options.signal?.aborted) {
              resolve({ ok: true, json: async () => ({ data: { holdingEscrows: { items: [] } } }) });
            }
          }, 200);
        });
      });

      await expect(slowClient.getHoldings({})).rejects.toThrow('Request timeout after 100ms');
    });
  });

  describe('getVaults', () => {
    it('should fetch vaults with filters', async () => {
      const mockVaults: CentrifugeVault[] = [
        {
          id: '0xvault123',
          poolId: 'pool-123',
          tokenId: 'token-456',
          centrifugeId: 'centrifuge-1',
          assetAddress: '0xasset123',
          isActive: true,
          status: 'active',
          blockchain: {
            chainId: 1,
            network: 'mainnet',
          },
        },
      ];

      const mockResponse = {
        data: {
          vaults: {
            items: mockVaults,
            totalCount: 1,
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getVaults({
        poolId: 'pool-123',
        tokenId: 'token-456',
        isActive: true,
      });

      expect(result).toEqual(mockVaults);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.centrifuge.io',
        expect.objectContaining({
          body: expect.stringContaining('poolId: \\\"pool-123\\\"'),
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.centrifuge.io',
        expect.objectContaining({
          body: expect.stringContaining('tokenId: \\\"token-456\\\"'),
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.centrifuge.io',
        expect.objectContaining({
          body: expect.stringContaining('isActive: true'),
        })
      );
    });

    it('should support ordering and pagination', async () => {
      const mockResponse = {
        data: {
          vaults: {
            items: [],
            totalCount: 0,
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.getVaults({
        limit: 50,
        orderBy: 'poolId',
        orderDirection: 'desc',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.centrifuge.io',
        expect.objectContaining({
          body: expect.stringContaining('limit: 50'),
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.centrifuge.io',
        expect.objectContaining({
          body: expect.stringContaining('orderBy: \\"poolId\\"'),
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.centrifuge.io',
        expect.objectContaining({
          body: expect.stringContaining('orderDirection: \\"desc\\"'),
        })
      );
    });
  });

  describe('getVaultHoldings', () => {
    it('should fetch holdings for a specific vault', async () => {
      const mockHoldings: CentrifugeHoldingEscrow[] = [
        {
          poolId: 'pool-123',
          tokenId: 'token-456',
          assetId: 'asset-789',
          assetAmount: '1000000',
          assetPrice: '1000000000000000000',
        },
      ];

      const mockResponse = {
        data: {
          holdingEscrows: {
            items: mockHoldings,
            totalCount: 1,
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getVaultHoldings('pool-123', 'token-456');

      expect(result).toEqual(mockHoldings);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.centrifuge.io',
        expect.objectContaining({
          body: expect.stringContaining('poolId: \\\"pool-123\\\"'),
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.centrifuge.io',
        expect.objectContaining({
          body: expect.stringContaining('tokenId: \\\"token-456\\\"'),
        })
      );
    });
  });

  describe('getPoolHoldings', () => {
    it('should fetch all holdings for a pool', async () => {
      const mockHoldings: CentrifugeHoldingEscrow[] = [
        {
          poolId: 'pool-123',
          tokenId: 'token-789',
          assetId: 'asset-789',
          assetAmount: '1000000',
          assetPrice: '1000000000000000000',
        },
      ];

      const mockResponse = {
        data: {
          holdingEscrows: {
            items: mockHoldings,
            totalCount: 1,
          },
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getPoolHoldings('pool-123');

      expect(result).toEqual(mockHoldings);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.centrifuge.io',
        expect.objectContaining({
          body: expect.stringContaining('poolId: \\"pool-123\\"'),
        })
      );
    });
  });


});