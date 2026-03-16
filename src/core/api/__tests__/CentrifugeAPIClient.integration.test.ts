import { describe, it, expect } from 'vitest';
import { CentrifugeAPIClient } from '../CentrifugeAPIClient';

/**
 * Integration tests that actually call the Centrifuge API
 * 
 * Run with: pnpm test:integration
 * or: pnpm test CentrifugeAPIClient.integration
 * 
 * Note: These tests require network access and may be slower than unit tests
 */
describe('CentrifugeAPIClient Integration Tests', () => {
  const client = new CentrifugeAPIClient({
    apiUrl: 'https://api.centrifuge.io',
    timeout: 30000,
  });

  describe('Real API Calls', () => {
    it('should fetch real holdings from Centrifuge API', async () => {
      // This actually calls the API
      const holdings = await client.getHoldings({
        limit: 5,
      });

      // Verify response structure
      expect(Array.isArray(holdings)).toBe(true);
      
      // If there are holdings, verify the structure
      if (holdings.length > 0) {
        const firstHolding = holdings[0];
        
        // Check required fields exist
        expect(firstHolding).toHaveProperty('poolId');
        expect(firstHolding).toHaveProperty('tokenId');
        expect(firstHolding).toHaveProperty('assetAmount');
        expect(firstHolding).toHaveProperty('assetPrice');
        
        // Check types
        expect(typeof firstHolding.poolId).toBe('string');
        expect(typeof firstHolding.tokenId).toBe('string');
        expect(typeof firstHolding.assetAmount).toBe('string');
        expect(typeof firstHolding.assetPrice).toBe('string');
        
        console.log('Sample holding from API:', firstHolding);
      }
    }, 10000); // 10 second timeout for real API call

    it('should fetch real vaults from Centrifuge API', async () => {
      // This actually calls the API
      const vaults = await client.getVaults({
        isActive: true,
        limit: 5,
      });

      // Verify response structure
      expect(Array.isArray(vaults)).toBe(true);
      
      // If there are vaults, verify the structure
      if (vaults.length > 0) {
        const firstVault = vaults[0];
        
        // Check required fields exist
        expect(firstVault).toHaveProperty('id');
        expect(firstVault).toHaveProperty('poolId');
        expect(firstVault).toHaveProperty('tokenId');
        expect(firstVault).toHaveProperty('centrifugeId');
        expect(firstVault).toHaveProperty('assetAddress');
        expect(firstVault).toHaveProperty('isActive');
        
        // Check types
        expect(typeof firstVault.id).toBe('string');
        expect(typeof firstVault.poolId).toBe('string');
        expect(typeof firstVault.tokenId).toBe('string');
        expect(typeof firstVault.isActive).toBe('boolean');
        
        console.log('Sample vault from API:', firstVault);
      }
    }, 10000);

    it('should handle filtering by poolId and tokenId', async () => {
      // First get some vaults to get valid poolId and tokenId
      const vaults = await client.getVaults({
        isActive: true,
        limit: 1,
      });

      if (vaults.length > 0) {
        const { poolId, tokenId } = vaults[0];
        
        // Now query holdings for this specific vault
        const vaultHoldings = await client.getVaultHoldings(poolId, tokenId);
        
        expect(Array.isArray(vaultHoldings)).toBe(true);
        
        // All holdings should match the poolId
        vaultHoldings.forEach(holding => {
          expect(holding.poolId).toBe(poolId);
          if (holding.tokenId) {
            expect(holding.tokenId).toBe(tokenId);
          }
        });
        
        console.log(`Found ${vaultHoldings.length} holdings for vault ${poolId}/${tokenId}`);
      } else {
        console.log('No active vaults found to test filtering');
      }
    }, 15000);

    it('should properly handle sorting and pagination', async () => {
      const holdings = await client.getHoldings({
        limit: 10,
        orderBy: 'assetAmount',
        orderDirection: 'desc',
      });

      expect(Array.isArray(holdings)).toBe(true);
      expect(holdings.length).toBeLessThanOrEqual(10);
      
      // Verify descending order if we have multiple holdings
      if (holdings.length > 1) {
        for (let i = 1; i < holdings.length; i++) {
          const prevAmount = BigInt(holdings[i - 1].assetAmount);
          const currAmount = BigInt(holdings[i].assetAmount);
          
          // Should be in descending order
          expect(prevAmount >= currAmount).toBe(true);
        }
      }
    }, 10000);

    it('should handle API errors gracefully', async () => {
      // Test with an invalid query that should cause an error
      const clientWithBadUrl = new CentrifugeAPIClient({
        apiUrl: 'https://api.centrifuge.io/invalid',
        timeout: 5000,
      });

      await expect(
        clientWithBadUrl.getHoldings({})
      ).rejects.toThrow();
    }, 10000);
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      // Make multiple requests in parallel
      const promises = [
        client.getHoldings({ limit: 3 }),
        client.getVaults({ limit: 3 }),
        client.getHoldings({ limit: 2 }),
      ];

      const results = await Promise.all(promises);
      
      // All should succeed
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    }, 15000);

    it.skip('should respect timeout settings', async () => {
      // Skip this test as we cannot reliably test timeout with real API
      // The API might respond faster than our timeout, making the test flaky
      const fastTimeoutClient = new CentrifugeAPIClient({
        apiUrl: 'https://api.centrifuge.io',
        timeout: 1, // 1ms timeout - should fail
      });

      await expect(
        fastTimeoutClient.getHoldings({})
      ).rejects.toThrow('Request timeout after 1ms');
    });
  });
});