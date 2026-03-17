# Centrifuge API Integration

This module provides integration with the Centrifuge GraphQL API for querying vault holdings and portfolio data.

## Features

- Query holdings filtered by pool ID and token ID
- Query vault information with various filters
- Full GraphQL support with type-safe responses
- React hooks for easy data fetching
- Configurable API client with timeout support

## Configuration

### Via VaultProvider

```typescript
import { VaultProvider } from 'arkonix-vault-sdk';

const config = {
  chainId: 1,
  rpcUrl: 'https://...',
  // Optional Centrifuge API configuration
  centrifugeAPI: {
    apiUrl: 'https://api.centrifuge.io', // Default
    timeout: 30000, // Optional, in milliseconds
  }
};

<VaultProvider config={config}>
  {/* Your app */}
</VaultProvider>
```

### Standalone Client

```typescript
import { CentrifugeAPIClient } from 'arkonix-vault-sdk';

const client = new CentrifugeAPIClient({
  apiUrl: 'https://api.centrifuge.io',
  timeout: 30000,
});
```

## API Methods

### Query Holdings

```typescript
// Get holdings with filters
const holdings = await client.getHoldings({
  poolId: 'pool-123',
  tokenId: 'token-456',
  limit: 100,
  orderBy: 'assetAmount',
  orderDirection: 'desc',
});

// Get holdings for a specific vault (pool + token)
const vaultHoldings = await client.getVaultHoldings('pool-123', 'token-456');

// Get all holdings for a pool
const poolHoldings = await client.getPoolHoldings('pool-123');
```

### Query Vaults

```typescript
// Get vaults with filters
const vaults = await client.getVaults({
  poolId: 'pool-123',
  tokenId: 'token-456',
  isActive: true,
  limit: 50,
});
```

## React Hooks

### Holdings Hooks

```typescript
import { 
  useCentrifugeHoldings, 
  useVaultHoldings, 
  usePoolHoldings 
} from 'arkonix-vault-sdk';

function MyComponent() {
  // Query holdings with custom parameters
  const { data: holdings, isLoading, error } = useCentrifugeHoldings({
    poolId: 'pool-123',
    tokenId: 'token-456',
  });

  // Query specific vault holdings
  const { data: vaultHoldings } = useVaultHoldings('pool-123', 'token-456');

  // Query all pool holdings
  const { data: poolHoldings } = usePoolHoldings('pool-123');
}
```

### Vault Hooks

```typescript
import { 
  useCentrifugeVaults, 
  usePoolVaults, 
  useActiveVaults 
} from 'arkonix-vault-sdk';

function MyComponent() {
  // Query vaults with filters
  const { data: vaults } = useCentrifugeVaults({
    poolId: 'pool-123',
    isActive: true,
  });

  // Query all vaults for a pool
  const { data: poolVaults } = usePoolVaults('pool-123');

  // Query only active vaults
  const { data: activeVaults } = useActiveVaults();
}
```

### Access Client from Context

```typescript
import { useCentrifugeAPIClient } from 'arkonix-vault-sdk';

function MyComponent() {
  // Get client from context (may be undefined)
  const client = useCentrifugeAPIClient();
  
  // Or always get a client (creates one if needed)
  const clientOrCreate = useCentrifugeAPIClientOrCreate();
}
```

## Type Definitions

### Holdings

```typescript
interface CentrifugeHolding {
  id: string;
  centrifugeId: string;
  poolId: string;
  tokenId?: string;
  assetId: string;
  assetAmount: string;
  assetPrice?: string;
  assetAddress: string;
  asset?: {
    name: string;
    symbol: string;
    decimals: number;
    address: string;
  };
}
```

### Vaults

```typescript
interface CentrifugeVault {
  id: string; // Vault contract address
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
```

## Query Parameters

### Holdings Query

- `poolId`: Filter by pool ID
- `tokenId`: Filter by token ID (share class)
- `centrifugeId`: Filter by Centrifuge chain ID
- `assetId`: Filter by asset ID
- `assetAddress`: Filter by asset contract address
- `limit`: Maximum results (default 100, max 1000)
- `orderBy`: Sort field
- `orderDirection`: 'asc' or 'desc'

### Vaults Query

- `poolId`: Filter by pool ID
- `tokenId`: Filter by token ID
- `centrifugeId`: Filter by Centrifuge chain ID
- `id`: Filter by vault contract address
- `isActive`: Filter by active status
- `assetAddress`: Filter by deposit asset address
- `limit`: Maximum results (default 100, max 1000)
- `orderBy`: Sort field
- `orderDirection`: 'asc' or 'desc'

## Error Handling

The client provides detailed error messages for:
- Network errors
- GraphQL errors
- Timeout errors
- Invalid responses

```typescript
try {
  const holdings = await client.getHoldings({ poolId: 'invalid' });
} catch (error) {
  if (error.message.includes('GraphQL errors')) {
    // Handle GraphQL error
  } else if (error.message.includes('timeout')) {
    // Handle timeout
  } else {
    // Handle other errors
  }
}
```