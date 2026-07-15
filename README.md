# @arkonix.xyz/arkonix-vault-sdk

Universal React/React Native SDK for ERC-7540 vault deposit and redeem operations.

## Installation

```bash
npm install @arkonix.xyz/arkonix-vault-sdk viem @tanstack/react-query
# or
pnpm add @arkonix.xyz/arkonix-vault-sdk viem @tanstack/react-query
```

`viem` and `@tanstack/react-query` are required dependencies (installed via the command above). **Peer dependencies:** `react >= 18.0.0`. `react-native` (`>=0.70.0`) is an optional peer dependency — only needed for React Native apps.

## Setup

The SDK supports two usage patterns: **React hooks** (with a scoped provider) or **standalone** (no wrapper needed).

### Option A: React Hooks (Recommended)

Wrap only the vault section of your app — **not the entire app**:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VaultProvider } from "@arkonix.xyz/arkonix-vault-sdk";

const queryClient = new QueryClient();

function App() {
  return (
    <YourExistingApp>
      {/* Only wrap vault components, not your whole app */}
      <QueryClientProvider client={queryClient}>
        <VaultProvider
          config={{
            chainId: 42161, // Arbitrum
            rpcUrl: "https://arb1.arbitrum.io/rpc",
          }}
        >
          <VaultWidget />
        </VaultProvider>
      </QueryClientProvider>
    </YourExistingApp>
  );
}
```

> **Note:** If your app already uses `@tanstack/react-query`, reuse your existing `QueryClientProvider` — no need for a second one.

#### React Native Integration

Pass a custom `walletAdapter` that bridges to your existing wallet library:

```tsx
import { VaultProvider, type WalletAdapter } from "@arkonix.xyz/arkonix-vault-sdk";

function MyVaultProvider({ children }: { children: React.ReactNode }) {
  // Bridge to your existing wallet (WalletConnect, Privy, etc.)
  const walletAdapter: WalletAdapter = useMemo(() => ({
    platform: "native" as const,
    isConnected: () => !!myWallet.address,
    getAddress: async () => myWallet.address ?? null,
    connect: async () => { /* your wallet connect logic */ },
    disconnect: async () => { /* your wallet disconnect logic */ },
    sendTransaction: async (tx) => {
      return await myWallet.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value,
      });
    },
  }), [myWallet]);

  return (
    <VaultProvider
      config={{ chainId: 42161, rpcUrl: "https://arb1.arbitrum.io/rpc" }}
      walletAdapter={walletAdapter}
    >
      {children}
    </VaultProvider>
  );
}
```

#### wagmi / RainbowKit Integration

If you already use wagmi, pass a custom `walletAdapter` to reuse your existing wallet connection:

```tsx
import { useWalletClient, useAccount } from "wagmi";
import { VaultProvider, type WalletAdapter } from "@arkonix.xyz/arkonix-vault-sdk";

function WagmiVaultProvider({ children }: { children: React.ReactNode }) {
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const walletAdapter: WalletAdapter = useMemo(() => ({
    platform: "web" as const,
    isConnected: () => !!address,
    getAddress: async () => address ?? null,
    connect: async () => { throw new Error("Use RainbowKit connect button"); },
    disconnect: async () => {},
    sendTransaction: async (tx) => {
      if (!walletClient) throw new Error("Wallet not connected");
      return walletClient.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value,
      });
    },
  }), [walletClient, address]);

  return (
    <VaultProvider
      config={{ chainId: 42161, rpcUrl: "https://arb1.arbitrum.io/rpc" }}
      walletAdapter={walletAdapter}
    >
      {children}
    </VaultProvider>
  );
}
```

### Option B: Standalone (No Wrapper)

Use `VaultReader`, `VaultActions`, and `VaultTxBuilder` directly with your own viem client — no provider needed:

```typescript
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
import { VaultReader, VaultActions } from "@arkonix.xyz/arkonix-vault-sdk";

const client = createPublicClient({ chain: arbitrum, transport: http(rpcUrl) });
const vaultAddress = "0x...";

// Your wallet's sendTransaction — bridge to WalletConnect, Privy, ethers, etc.
const sendTransaction = async (tx) => {
  return await myWallet.sendTransaction({ to: tx.to, data: tx.data, value: tx.value });
};

// Read vault metadata (asset, share token, decimals, type, TVL)
const meta = await VaultReader.getMetadata(client, vaultAddress);

// Read user position
const state = await VaultReader.getUserState(
  client, vaultAddress, userAddress, meta.vaultType, meta.assetDecimals
);

// Deposit (handles allowance check + approve + deposit in one call)
const { depositHash } = await VaultActions.deposit(
  client, sendTransaction, vaultAddress,
  "100",             // amount in human-readable form
  userAddress,
  meta.asset,        // deposit asset address
  meta.assetDecimals,
  meta.vaultType,    // SYNC or ASYNC
);

// Request redeem
const { txHash } = await VaultActions.requestRedeem(
  client, sendTransaction, vaultAddress,
  "10",              // shares in human-readable form
  userAddress,
  meta.shareDecimals,
);

// After epoch executes, claim the redeem
if (state.hasClaimableRedeem) {
  await VaultActions.claimRedeem(
    client, sendTransaction, vaultAddress, state.claimableRedeemShares, userAddress
  );
}
```

## Usage

### 1. Read Vault Metadata

Start with just a vault address. `useVaultMetadata` reads everything else on-chain:

```tsx
import { useVaultMetadata } from "@arkonix.xyz/arkonix-vault-sdk";

function VaultInfo({ vaultAddress }: { vaultAddress: `0x${string}` }) {
  const { data: meta, isLoading } = useVaultMetadata(vaultAddress);

  if (isLoading || !meta) return <div>Loading...</div>;

  return (
    <div>
      <p>Asset: {meta.assetSymbol} ({meta.asset})</p>
      <p>Share Token: {meta.shareSymbol} ({meta.share})</p>
      <p>Type: {meta.vaultType}</p> {/* "SYNC" or "ASYNC" */}
      <p>TVL: {formatUnits(meta.totalAssets, meta.assetDecimals)}</p>
    </div>
  );
}
```

### 2. Read User Position

Once you have the metadata, read the user's on-chain state:

```tsx
import { useVaultMetadata, useVaultUserState } from "@arkonix.xyz/arkonix-vault-sdk";

function UserPosition({ vaultAddress }: { vaultAddress: `0x${string}` }) {
  const { data: meta } = useVaultMetadata(vaultAddress);

  const state = useVaultUserState(
    vaultAddress,
    meta?.share,          // share token address (from metadata)
    meta?.assetDecimals,  // deposit asset decimals (from metadata)
    meta?.vaultType,      // "SYNC" or "ASYNC" (from metadata)
  );

  if (state.isLoading) return <div>Loading...</div>;

  return (
    <div>
      <p>Position Value: ${state.positionValueFormatted}</p>
      {state.hasPendingRedeem && (
        <p>Pending Redeem: {state.pendingRedeemAssetsFormatted} {meta?.assetSymbol}</p>
      )}
      {state.hasClaimableRedeem && (
        <p>Claimable: {state.claimableRedeemAssetsFormatted} {meta?.assetSymbol}</p>
      )}
    </div>
  );
}
```

### 3. Deposit

```tsx
import { useDeposit, useVaultMetadata } from "@arkonix.xyz/arkonix-vault-sdk";

function DepositForm({ vaultAddress }: { vaultAddress: `0x${string}` }) {
  const { data: meta } = useVaultMetadata(vaultAddress);
  const [amount, setAmount] = useState("");

  const { deposit, txState, error, reset } = useDeposit(
    vaultAddress,
    meta?.asset,          // deposit asset address
    meta?.assetDecimals,  // decimals
    meta?.vaultType,      // SYNC: vault.deposit(), ASYNC: vault.requestDeposit()
  );

  return (
    <div>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" />
      <button onClick={() => deposit(amount)} disabled={txState !== "idle"}>
        {txState === "approving" ? "Approving..." :
         txState === "pending" ? "Depositing..." :
         txState === "confirming" ? "Confirming..." :
         txState === "success" ? "Done!" : "Deposit"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}
```

### 4. Request Redeem

Redemptions are async (ERC-7540): request -> wait for epoch -> claim.

```tsx
import { useRequestRedeem, useClaimRedeem, useVaultUserState } from "@arkonix.xyz/arkonix-vault-sdk";

function RedeemFlow({ vaultAddress, meta }) {
  const state = useVaultUserState(vaultAddress, meta.share, meta.assetDecimals, meta.vaultType);
  const { requestRedeem, txState: reqState } = useRequestRedeem(vaultAddress);
  const { claimRedeem, txState: claimState } = useClaimRedeem(vaultAddress);

  return (
    <div>
      {/* Step 1: Request redeem (user has shares) */}
      {state.shareBalance > 0n && (
        <button onClick={() => requestRedeem("10", meta.shareDecimals)}>
          Request Redeem 10 Shares
        </button>
      )}

      {/* Step 2: Wait for epoch execution (shown when pending) */}
      {state.hasPendingRedeem && (
        <p>Pending redeem: ~{state.pendingRedeemAssetsFormatted} {meta.assetSymbol}</p>
      )}

      {/* Step 3: Claim (shown when claimable after epoch) */}
      {state.hasClaimableRedeem && (
        <button onClick={() => claimRedeem(state.claimableRedeemShares)}>
          Claim {state.claimableRedeemAssetsFormatted} {meta.assetSymbol}
        </button>
      )}
    </div>
  );
}
```

### 5. Cancel Redeem

A single `useCancelRedeem(vaultAddress)` hook returns both `cancelRedeem()` and
`claimCancelRedeem()`. (For async deposits, `useCancelDeposit` mirrors this.)

```tsx
import { useCancelRedeem, useVaultUserState } from "@arkonix.xyz/arkonix-vault-sdk";

function CancelRedeem({ vaultAddress, meta }) {
  const state = useVaultUserState(vaultAddress, meta.share, meta.assetDecimals, meta.vaultType);
  const { cancelRedeem, claimCancelRedeem } = useCancelRedeem(vaultAddress);

  return (
    <div>
      {/* Cancel a pending redeem request */}
      {state.hasPendingRedeem && (
        <button onClick={cancelRedeem}>Cancel Redeem</button>
      )}

      {/* Claim shares back after the cancellation is processed by the epoch */}
      {state.hasClaimableCancelRedeem && (
        <button onClick={claimCancelRedeem}>Claim Cancelled Shares</button>
      )}
    </div>
  );
}
```

### 6. NAV, Returns & Share Price

NAV (TVL), returns, and share price are **not on-chain** — they come from the Arkonix
backend's public API. Configure a base URL once, then read everything from the vault
address alone. This is the address-only entry point for a partner UI.

```tsx
<VaultProvider
  config={{
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    arkonixAPI: { baseUrl: "https://api.arkonix.xyz" },
  }}
>
  <VaultDashboard vaultAddress="0x..." />
</VaultProvider>;
```

```tsx
import {
  useVaultFinancials,
  useReturnHistory,
} from "@arkonix.xyz/arkonix-vault-sdk";

function VaultDashboard({ vaultAddress }: { vaultAddress: `0x${string}` }) {
  const { data: fin, isLoading } = useVaultFinancials(vaultAddress);

  // History endpoints are keyed by share-class id, which the snapshot returns.
  const { data: history } = useReturnHistory(fin?.shareClassId, { days: 90 });

  if (isLoading || !fin) return <div>Loading…</div>;

  return (
    <div>
      <p>NAV (TVL): ${fin.tvlUsd.toLocaleString()}</p>
      <p>Share price: {fin.sharePrice ?? "—"}</p>
      {/* return* is nullable — null means "not enough history", which is NOT 0% */}
      <p>Return (7d): {fin.return7d != null ? `${fin.return7d}%` : "—"}</p>
      <p>Return (30d): {fin.return30d != null ? `${fin.return30d}%` : "—"}</p>
      <p>Return (all-time, annualized): {fin.returnAllTime != null ? `${fin.returnAllTime}%` : "—"}</p>
      {history && <SparklineChart points={history.points} />}
    </div>
  );
}
```

> **Return semantics:** all `return*` fields are percentages (`12.5` = 12.5%) and
> **nullable** — `null` means there isn't enough valid price history for that window
> (common on young vaults). Never treat `null` as `0`.
> - `return7d` / `return30d` / `return90d` are **cumulative** % over the window (a
>   −7% month reads `-7`, not annualized). They can't explode.
> - `returnAllTime` is the **only annualized** field anywhere in the API — annualized
>   since inception for vaults with ≥30 days of history, otherwise cumulative.
>   Bounded ~[−99, +1000].
> - Headline `return*` are daily-cached; the `points` series is live (~15-min), so
>   the chart's last point will NOT equal `returnAllTime`. To chart the all-time
>   **cumulative** curve, use the per-point `cumulativeReturnSinceInceptionPct`
>   (absolute since launch), not the window-relative `cumulativeReturnPct`.
> - Both per-point fields are **cumulative** — there is **no per-point annualized
>   series**. Don't try to chart annualized APY over time from `points`; the single
>   annualized figure is `returnAllTime`.

You can also use the client standalone (no React):

```typescript
import { ArkonixAPIClient } from "@arkonix.xyz/arkonix-vault-sdk";

const api = new ArkonixAPIClient({ baseUrl: "https://api.arkonix.xyz" });
const fin = await api.getVaultFinancials("0x...");
const history = await api.getReturnHistory(fin.shareClassId, { days: 30 });

// A user's transaction activity (deposits/redeems/claims + pending requests)
const activity = await api.getVaultTransactions("0x...", { userAddress: "0xUser" });

// Asset distribution with backend-computed weights, and the fee breakdown.
// Both are keyed by share-class id, which the financials snapshot returns.
const distribution = await api.getAssetDistribution(fin.shareClassId);
const fees = await api.getShareClassFees(fin.shareClassId);
```

## ERC-7540 Flow

Understanding the request/claim pattern:

```
DEPOSIT (SYNC vault):
  User calls deposit(assets) -> shares minted immediately

DEPOSIT (ASYNC vault):
  User calls requestDeposit(assets) -> assets locked, pending
  Epoch executes (off-chain) -> assets become claimable
  User calls deposit(claimableAssets) -> shares minted

REDEEM (both vault types):
  User calls requestRedeem(shares) -> shares locked, pending
  Epoch executes (off-chain) -> shares become claimable
  User calls redeem(claimableShares) -> assets returned

CANCEL REDEEM:
  User calls cancelRedeemRequest() -> cancellation pending
  Epoch executes -> cancellation processed
  User calls claimCancelRedeemRequest() -> shares returned
```

- `requestId` is always `0` (single request per user per vault)
- Epoch execution is handled by the vault operator (Arkonix)
- Poll `useVaultUserState` (auto-refreshes every 10s) to detect state transitions

## Hooks Reference

| Hook | Purpose |
|------|---------|
| `useVaultMetadata(vaultAddress)` | Read asset, share token, decimals, vault type from on-chain |
| `useVaultUserState(vault, share, decimals, type)` | Read user's position, pending/claimable states |
| `useDeposit(vault, asset, decimals, type)` | Approve + deposit (SYNC_DEPOSIT) or requestDeposit (ASYNC) |
| `useClaimDeposit(vault)` | Claim shares after an async deposit is processed |
| `useRequestRedeem(vault)` | Request async redeem |
| `useClaimRedeem(vault)` | Claim completed redeem |
| `useCancelRedeem(vault)` | `cancelRedeem()` + `claimCancelRedeem()` |
| `useCancelDeposit(vault, type)` | `cancelDeposit()` + `claimCancelDeposit()` (ASYNC only; pass `type` to fail early on others) |
| `useVaultFinancials(vault)` | **NAV/TVL, share price, all returns** from the Arkonix API |
| `useReturnHistory(shareClassId, { days })` | Return headlines + per-point return series |
| `useTvlHistory(shareClassId, { days })` | TVL (NAV) time series |
| `useSharePriceHistory(vault)` | On-chain share-price event history |
| `useVaultTransactions(vault, { userAddress })` | A user's deposit/redeem/claim activity + pending requests (disabled until `userAddress` is set) |
| `useVaultAssetDistribution(shareClassId)` | Per-asset holdings with **backend-computed weights** (`pctOfTvl`) |
| `useShareClassFees(shareClassId)` | Management + performance fee rates (returns are already net of these) |
| `useUserAddress()` | Get connected wallet address |
| `useVaultContext()` | Access config, walletAdapter, publicClient |

## Standalone API Reference

### VaultActions (orchestrated flows)

| Method | Purpose |
|--------|---------|
| `VaultActions.deposit(client, sendTx, vault, amount, user, asset, decimals, type)` | Full deposit: allowance check + approve + deposit |
| `VaultActions.claimDeposit(client, sendTx, vault, assets, user)` | Claim shares after an async deposit is processed |
| `VaultActions.requestRedeem(client, sendTx, vault, shares, user, decimals)` | Request async redeem |
| `VaultActions.claimRedeem(client, sendTx, vault, shares, user)` | Claim completed redeem |
| `VaultActions.cancelRedeem(client, sendTx, vault, user)` | Cancel pending redeem |
| `VaultActions.claimCancelRedeem(client, sendTx, vault, user)` | Claim shares after cancelling a redeem |
| `VaultActions.cancelDeposit(client, sendTx, vault, user)` | Cancel pending deposit (ASYNC only) |
| `VaultActions.claimCancelDeposit(client, sendTx, vault, user)` | Claim assets after cancelling a deposit (ASYNC only) |

### VaultReader (read-only)

| Method | Purpose |
|--------|---------|
| `VaultReader.getMetadata(client, vault)` | Read vault metadata (asset, share, decimals, type, TVL) |
| `VaultReader.getUserState(client, vault, user, type, decimals)` | Read user position + pending/claimable states |
| `VaultReader.getAllowance(client, token, owner, spender)` | Read ERC20 allowance |
| `VaultReader.getBalance(client, token, account)` | Read ERC20 balance |
| `VaultReader.getMaxDeposit(client, vault, receiver)` | Max depositable amount |
| `VaultReader.getMaxRedeem(client, vault, owner)` | Max redeemable shares |
| `VaultReader.convertToAssets(client, vault, shares)` | Convert shares to asset value |
| `VaultReader.convertToShares(client, vault, assets)` | Convert assets to share value |

### VaultTxBuilder (low-level calldata)

| Method | Purpose |
|--------|---------|
| `VaultTxBuilder.buildDepositTx(vault, assets, receiver, type)` | Build deposit calldata |
| `VaultTxBuilder.buildApproveTx(token, spender, amount)` | Build ERC20 approve calldata |
| `VaultTxBuilder.buildRequestRedeemTx(vault, shares, controller, owner)` | Build redeem request calldata |
| `VaultTxBuilder.buildClaimRedeemTx(vault, shares, receiver, controller)` | Build claim redeem calldata |
| `VaultTxBuilder.buildClaimDepositTx(vault, assets, receiver)` | Build claim deposit calldata (ERC-4626 deposit) |
| `VaultTxBuilder.buildCancelRedeemTx(vault, controller)` | Build cancel redeem calldata |
| `VaultTxBuilder.buildClaimCancelRedeemTx(vault, receiver, controller)` | Build claim cancel redeem calldata |
| `VaultTxBuilder.buildCancelDepositTx(vault, controller)` | Build cancel deposit calldata |
| `VaultTxBuilder.buildClaimCancelDepositTx(vault, receiver, controller)` | Build claim cancel deposit calldata |

## Types

```typescript
interface VaultMetadata {
  asset: Address;           // Deposit asset address (e.g. USDC)
  share: Address;           // Share token address
  assetDecimals: number;    // e.g. 6 for USDC
  shareDecimals: number;    // e.g. 18
  assetSymbol: string;      // e.g. "USDC"
  shareSymbol: string;
  poolId: bigint;
  vaultKind: number;        // on-chain: 0 → ASYNC, otherwise SYNC_DEPOSIT_ASYNC_REDEEM
  vaultType: VaultType;
  totalAssets: bigint;
}

interface VaultUserState {
  isLoading: boolean;

  // Position
  shareBalance: bigint;
  positionValueFormatted: string;

  // Deposit flow (ASYNC vaults only)
  hasPendingDeposit: boolean;
  pendingDepositAssets: bigint;
  pendingDepositFormatted: string;
  hasClaimableDeposit: boolean;
  claimableDepositAssets: bigint;
  claimableDepositFormatted: string;

  // Redeem flow (both vault types)
  hasPendingRedeem: boolean;
  pendingRedeemShares: bigint;
  pendingRedeemAssetsFormatted: string;
  hasClaimableRedeem: boolean;
  claimableRedeemShares: bigint;
  claimableRedeemAssetsFormatted: string;

  // Cancel redeem
  hasPendingCancelRedeem: boolean;
  claimableCancelRedeemShares: bigint;
  hasClaimableCancelRedeem: boolean;

  // Cancel deposit (ASYNC vaults only)
  hasPendingCancelDeposit: boolean;
  claimableCancelDepositAssets: bigint;
  claimableCancelDepositFormatted: string;
  hasClaimableCancelDeposit: boolean;
}

type TxState = 'idle' | 'approving' | 'pending' | 'confirming' | 'success' | 'error';

// 'ASYNC': requestDeposit + requestRedeem are both async.
// 'SYNC_DEPOSIT_ASYNC_REDEEM': deposit is synchronous (ERC-4626), redeem is async.
type VaultType = 'ASYNC' | 'SYNC_DEPOSIT_ASYNC_REDEEM';
```

### Transactions, Asset Distribution & Fees

```typescript
// A user's activity is either a settled DEPOSIT/WITHDRAWAL, or an unsettled
// *_REQUEST still awaiting the epoch (a claim settles as WITHDRAWAL).
type VaultTransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'DEPOSIT_REQUEST'
  | 'REDEEM_REQUEST';

interface VaultTransaction {
  type: VaultTransactionType;
  userAddress: string;
  amount: number;           // asset amount, human-readable; 0 where not applicable
  shares: number;           // share amount, human-readable; 0 where not applicable
  sharePrice: number;       // NAV per share at the time of the transaction
  txHash: string | null;    // null for a request row still awaiting its tx
  blockNumber: number | null;
  timestamp: string | null; // ISO-8601
}

interface VaultTransactions {
  vaultAddress: string;
  totalTransactions: number; // may exceed transactions.length when paginated
  transactions: VaultTransaction[];
}

interface VaultTransactionsQueryParams {
  userAddress?: string;                          // restrict to one user (controller)
  transactionType?: VaultTransactionType | 'ALL'; // default 'ALL'
  limit?: number;
  offset?: number;
}

interface VaultHoldingAsset {
  symbol: string;
  amountHuman: number; // already decimal-adjusted
  valueUsd: number;
  pctOfTvl: number;    // backend-computed; don't re-derive from valueUsd / totalValueUsd
}

interface VaultAssetDistribution {
  shareClassId: string;
  symbol: string | null;
  name: string | null;
  totalValueUsd: number;
  assets: VaultHoldingAsset[];
  partial: boolean;         // true when some holdings could not be priced/included
  partialReasons: string[];
}

interface ShareClassFeeConfig {
  managementFeeBps: number;   // 100 bps = 1%
  performanceFeeBps: number;
  managementFeePct: string;   // e.g. "1.00"
  performanceFeePct: string;  // e.g. "10.00"
}

interface ShareClassFees {
  shareClassId: string;
  symbol: string | null;
  feeRecipient: string | null;
  isInitialized: boolean;      // false when the fee manager isn't initialized yet
  config: ShareClassFeeConfig | null; // null = uninitialized, not "no fees"
}
```

> `useVaultFinancials` returns are already **net of** the fees in `ShareClassFees` —
> use the fee types only to display the breakdown, not to re-derive returns.

## Centrifuge API Integration

The SDK includes full integration with the Centrifuge GraphQL API for querying vault holdings and portfolio data.

### Configuration

Add Centrifuge API configuration to your VaultProvider:

```tsx
<VaultProvider
  config={{
    chainId: 42161,
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    // Optional: Configure Centrifuge API
    centrifugeAPI: {
      apiUrl: "https://api.centrifuge.io", // Default
      timeout: 30000, // Optional timeout in ms
    }
  }}
>
  <YourApp />
</VaultProvider>
```

### Query Holdings

Get vault holdings filtered by pool ID and token ID:

```tsx
import { useVaultHoldings, usePoolHoldings } from "@arkonix.xyz/arkonix-vault-sdk";

function VaultHoldings() {
  // Get holdings for a specific vault (pool + token)
  const { data: vaultHoldings, isLoading } = useVaultHoldings(
    "pool-123", 
    "token-456"
  );

  // Get all holdings for a pool
  const { data: poolHoldings } = usePoolHoldings("pool-123");

  // Advanced query with filters
  const { data: customHoldings } = useCentrifugeHoldings({
    poolId: "pool-123",
    tokenId: "token-456",
    limit: 100,
    orderBy: "assetAmount",
    orderDirection: "desc",
  });

  return (
    <div>
      {vaultHoldings?.map(holding => (
        <div key={holding.id}>
          <p>Asset: {holding.asset?.symbol}</p>
          <p>Amount: {holding.assetAmount}</p>
          <p>Price: {holding.assetPrice}</p>
        </div>
      ))}
    </div>
  );
}
```

### Query Vaults

Find vaults across the Centrifuge ecosystem:

```tsx
import { useActiveVaults, usePoolVaults } from "@arkonix.xyz/arkonix-vault-sdk";

function VaultList() {
  // Get all active vaults
  const { data: activeVaults } = useActiveVaults();

  // Get vaults for a specific pool
  const { data: poolVaults } = usePoolVaults("pool-123");

  // Custom vault query
  const { data: customVaults } = useCentrifugeVaults({
    poolId: "pool-123",
    tokenId: "token-456",
    isActive: true,
    assetAddress: "0x...", // Filter by deposit asset
  });

  return (
    <div>
      {activeVaults?.map(vault => (
        <div key={vault.id}>
          <p>Vault: {vault.id}</p>
          <p>Pool: {vault.poolId}</p>
          <p>Token: {vault.tokenId}</p>
          <p>Network: {vault.blockchain?.network}</p>
        </div>
      ))}
    </div>
  );
}
```

### Standalone API Client

Use the CentrifugeAPIClient directly without React:

```typescript
import { CentrifugeAPIClient } from "@arkonix.xyz/arkonix-vault-sdk";

const client = new CentrifugeAPIClient({
  apiUrl: "https://api.centrifuge.io",
  timeout: 30000,
});

// Query holdings
const holdings = await client.getHoldings({
  poolId: "pool-123",
  tokenId: "token-456",
  limit: 100,
});

// Get vault holdings
const vaultHoldings = await client.getVaultHoldings("pool-123", "token-456");

// Get pool holdings
const poolHoldings = await client.getPoolHoldings("pool-123");

// Query vaults
const vaults = await client.getVaults({
  isActive: true,
  limit: 50,
});
```

### Testing the API Integration

Test the Centrifuge API directly:

```bash
# Install tsx if needed
npm install -g tsx

# Create a test file: test-api.ts
cat > test-api.ts << 'EOF'
import { CentrifugeAPIClient } from "@arkonix.xyz/arkonix-vault-sdk";

async function test() {
  const client = new CentrifugeAPIClient();
  
  // Test fetching holdings
  const holdings = await client.getHoldings({ limit: 5 });
  console.log("Holdings:", holdings);
  
  // Test fetching vaults
  const vaults = await client.getVaults({ isActive: true, limit: 5 });
  console.log("Vaults:", vaults);
  
  // If we have a vault, test vault-specific queries
  if (vaults.length > 0) {
    const vault = vaults[0];
    const vaultHoldings = await client.getVaultHoldings(
      vault.poolId, 
      vault.tokenId
    );
    console.log("Vault holdings:", vaultHoldings);
  }
}

test().catch(console.error);
EOF

# Run the test
tsx test-api.ts
```

### Available Query Parameters

**Holdings Query:**
- `poolId` - Filter by pool ID
- `tokenId` - Filter by token ID (share class)
- `centrifugeId` - Filter by Centrifuge chain ID
- `assetId` - Filter by asset ID
- `assetAddress` - Filter by asset contract address
- `limit` - Max results (default 100, max 1000)
- `orderBy` - Sort field
- `orderDirection` - 'asc' or 'desc'

**Vaults Query:**
- `poolId` - Filter by pool ID
- `tokenId` - Filter by token ID
- `centrifugeId` - Filter by Centrifuge chain ID
- `id` - Filter by vault contract address
- `isActive` - Filter by active status
- `assetAddress` - Filter by deposit asset
- `limit` - Max results (default 100, max 1000)
- `orderBy` - Sort field
- `orderDirection` - 'asc' or 'desc'

## Development

```bash
pnpm install
pnpm build        # Build CJS + ESM + types
pnpm test         # Run tests
pnpm type-check   # TypeScript check
pnpm dev          # Watch mode
```

## License

Licensed under the [Business Source License 1.1](./LICENSE) (BUSL-1.1).

- **Non-production use** (evaluation, testing, development): Free
- **Production use**: Requires a commercial license — contact [info@arkonix.xyz](mailto:info@arkonix.xyz)
- **Change Date**: 2030-02-18 — converts to Apache 2.0 after this date
