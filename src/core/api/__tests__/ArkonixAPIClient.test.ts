import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArkonixAPIClient } from '../ArkonixAPIClient';

// Mock fetch
global.fetch = vi.fn();

function mockJsonOnce(body: unknown, ok = true, status = 200) {
  (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  });
}

function lastUrl(): string {
  const calls = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
  return calls[calls.length - 1][0] as string;
}

describe('ArkonixAPIClient', () => {
  let client: ArkonixAPIClient;

  beforeEach(() => {
    client = new ArkonixAPIClient({ baseUrl: 'https://api.arkonix.xyz' });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('trims a trailing slash from baseUrl', async () => {
    const c = new ArkonixAPIClient({ baseUrl: 'https://api.arkonix.xyz/' });
    mockJsonOnce({
      vault_address: '0xVAULT',
      total_transactions: 0,
      transactions: [],
    });
    await c.getVaultTransactions('0xVAULT', { userAddress: '0xUSER' });
    expect(lastUrl()).toBe(
      'https://api.arkonix.xyz/public/vaults/0xVAULT/transactions?user_address=0xUSER',
    );
  });

  describe('getVaultTransactions', () => {
    it('builds the URL with user_address, transaction_type, limit, offset', async () => {
      mockJsonOnce({ vault_address: '0xVAULT', total_transactions: 0, transactions: [] });
      await client.getVaultTransactions('0xVAULT', {
        userAddress: '0xUSER',
        transactionType: 'ALL',
        limit: 50,
        offset: 10,
      });
      expect(lastUrl()).toBe(
        'https://api.arkonix.xyz/public/vaults/0xVAULT/transactions?user_address=0xUSER&transaction_type=ALL&limit=50&offset=10',
      );
    });

    it('omits the query string entirely when no params are given', async () => {
      mockJsonOnce({ vault_address: '0xVAULT', total_transactions: 0, transactions: [] });
      await client.getVaultTransactions('0xVAULT');
      expect(lastUrl()).toBe('https://api.arkonix.xyz/public/vaults/0xVAULT/transactions');
    });

    it('normalizes snake_case rows to camelCase', async () => {
      mockJsonOnce({
        vault_address: '0xVAULT',
        total_transactions: 2,
        transactions: [
          {
            type: 'DEPOSIT',
            user_address: '0xUSER',
            amount: 100.5,
            shares: 99.1,
            share_price: 1.014,
            tx_hash: '0xabc',
            block_number: 123,
            timestamp: '2026-01-01T00:00:00Z',
          },
          {
            type: 'REDEEM_REQUEST',
            user_address: '0xUSER',
            amount: 0,
            shares: 5,
            share_price: 1.02,
            tx_hash: null,
            block_number: null,
            timestamp: null,
          },
        ],
      });

      const result = await client.getVaultTransactions('0xVAULT', { userAddress: '0xUSER' });

      expect(result.vaultAddress).toBe('0xVAULT');
      expect(result.totalTransactions).toBe(2);
      expect(result.transactions[0]).toEqual({
        type: 'DEPOSIT',
        userAddress: '0xUSER',
        amount: 100.5,
        shares: 99.1,
        sharePrice: 1.014,
        txHash: '0xabc',
        blockNumber: 123,
        timestamp: '2026-01-01T00:00:00Z',
      });
      // pending request row: null tx_hash/block/timestamp preserved as null
      expect(result.transactions[1].txHash).toBeNull();
      expect(result.transactions[1].blockNumber).toBeNull();
      expect(result.transactions[1].type).toBe('REDEEM_REQUEST');
    });

    it('tolerates a missing transactions array', async () => {
      mockJsonOnce({ vault_address: '0xVAULT', total_transactions: 0 });
      const result = await client.getVaultTransactions('0xVAULT', { userAddress: '0xUSER' });
      expect(result.transactions).toEqual([]);
    });
  });

  describe('getAssetDistribution', () => {
    it('keys off share-class id and normalizes weights', async () => {
      mockJsonOnce({
        share_class_id: '0xSC',
        symbol: 'aUSDC',
        name: 'Arkonix USDC',
        total_value_usd: 1_000_000,
        tokens: [
          { symbol: 'USDC', amount_human: 600000, value_usd: 600000, pct_of_tvl: 60 },
          { symbol: 'DAI', amount_human: 400000, value_usd: 400000, pct_of_tvl: 40 },
        ],
      });

      const result = await client.getAssetDistribution('0xSC');

      expect(lastUrl()).toBe('https://api.arkonix.xyz/public/share-classes/0xSC/holdings');
      expect(result.totalValueUsd).toBe(1_000_000);
      expect(result.assets).toHaveLength(2);
      expect(result.assets[0]).toEqual({
        symbol: 'USDC',
        amountHuman: 600000,
        valueUsd: 600000,
        pctOfTvl: 60,
      });
      // defaults when backend omits them
      expect(result.partial).toBe(false);
      expect(result.partialReasons).toEqual([]);
    });

    it('surfaces partial + reasons when present', async () => {
      mockJsonOnce({
        share_class_id: '0xSC',
        symbol: null,
        name: null,
        total_value_usd: 0,
        tokens: [],
        partial: true,
        partial_reasons: ['price feed unavailable for asset X'],
      });
      const result = await client.getAssetDistribution('0xSC');
      expect(result.partial).toBe(true);
      expect(result.partialReasons).toEqual(['price feed unavailable for asset X']);
      expect(result.assets).toEqual([]);
    });
  });

  describe('getShareClassFees', () => {
    it('normalizes the fee config', async () => {
      mockJsonOnce({
        share_class_id: '0xSC',
        symbol: 'aUSDC',
        fee_recipient: '0xFEE',
        is_initialized: true,
        config: {
          management_fee_bps: 100,
          performance_fee_bps: 1000,
          management_fee_pct: '1.00',
          performance_fee_pct: '10.00',
        },
      });

      const result = await client.getShareClassFees('0xSC');

      expect(lastUrl()).toBe('https://api.arkonix.xyz/public/share-classes/0xSC/fees');
      expect(result.feeRecipient).toBe('0xFEE');
      expect(result.isInitialized).toBe(true);
      expect(result.config).toEqual({
        managementFeeBps: 100,
        performanceFeeBps: 1000,
        managementFeePct: '1.00',
        performanceFeePct: '10.00',
      });
    });

    it('preserves a null config for an uninitialized fee manager', async () => {
      mockJsonOnce({
        share_class_id: '0xSC',
        symbol: null,
        fee_recipient: null,
        is_initialized: false,
        config: null,
      });
      const result = await client.getShareClassFees('0xSC');
      expect(result.isInitialized).toBe(false);
      expect(result.config).toBeNull();
    });
  });

  describe('error handling', () => {
    it('throws a not-found error on 404', async () => {
      mockJsonOnce({}, false, 404);
      await expect(client.getShareClassFees('0xSC')).rejects.toThrow(/not found/);
    });

    it('throws a bad-request error on 400', async () => {
      mockJsonOnce({}, false, 400);
      await expect(client.getAssetDistribution('bad-id')).rejects.toThrow(/bad request/);
    });
  });
});
