# @arkonix.xyz/arkonix-vault-sdk

Universal React/React Native SDK for ERC-7540 vault deposit and redeem operations.

## Installation

```bash
npm install @arkonix.xyz/arkonix-vault-sdk viem @tanstack/react-query
# or
pnpm add @arkonix.xyz/arkonix-vault-sdk viem @tanstack/react-query
```

**Peer dependencies:** `react >= 18.0.0`

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

Use `VaultTxBuilder` and ABIs directly with your own viem client — no provider needed:

```typescript
import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";
import {
  VaultTxBuilder,
  SYNC_DEPOSIT_VAULT_ABI,
  ERC20_ABI,
} from "@arkonix.xyz/arkonix-vault-sdk";

const client = createPublicClient({ chain: arbitrum, transport: http(rpcUrl) });

// Read vault state
const [asset, totalAssets] = await Promise.all([
  client.readContract({ address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: "asset" }),
  client.readContract({ address: vaultAddress, abi: SYNC_DEPOSIT_VAULT_ABI, functionName: "totalAssets" }),
]);

// Build tx calldata — send with your own wallet/signer
const tx = VaultTxBuilder.buildDepositTx(vaultAddress, amount, userAddress, "SYNC");
// tx = { to, data, value }
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
      {state.hasPending && (
        <p>Pending Redeem: {state.pendingAssetsFormatted} {meta?.assetSymbol}</p>
      )}
      {state.hasClaimable && (
        <p>Claimable: {state.claimableAssetsFormatted} {meta?.assetSymbol}</p>
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
      {state.hasPending && (
        <p>Pending redeem: ~{state.pendingAssetsFormatted} {meta.assetSymbol}</p>
      )}

      {/* Step 3: Claim (shown when claimable after epoch) */}
      {state.hasClaimable && (
        <button onClick={() => claimRedeem(state.claimableShares)}>
          Claim {state.claimableAssetsFormatted} {meta.assetSymbol}
        </button>
      )}
    </div>
  );
}
```

### 5. Cancel Redeem

```tsx
import { useCancelRedeem, useClaimCancelRedeem } from "@arkonix.xyz/arkonix-vault-sdk";

function CancelRedeem({ vaultAddress, state }) {
  const { cancelRedeem } = useCancelRedeem(vaultAddress);
  const { claimCancelRedeem } = useClaimCancelRedeem(vaultAddress);

  return (
    <div>
      {/* Cancel a pending redeem request */}
      {state.hasPending && (
        <button onClick={cancelRedeem}>Cancel Redeem</button>
      )}

      {/* Claim shares back after cancel is processed */}
      {state.hasClaimableCancelRedeem && (
        <button onClick={claimCancelRedeem}>Claim Cancelled Shares</button>
      )}
    </div>
  );
}
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
| `useDeposit(vault, asset, decimals, type)` | Approve + deposit (SYNC) or requestDeposit (ASYNC) |
| `useRequestRedeem(vault)` | Request async redeem |
| `useClaimRedeem(vault)` | Claim completed redeem |
| `useCancelRedeem(vault)` | Cancel pending redeem request |
| `useClaimCancelRedeem(vault)` | Claim shares after cancel |
| `useUserAddress()` | Get connected wallet address |
| `useVaultContext()` | Access config, walletAdapter, publicClient |

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
  vaultKind: number;        // 0 = SYNC, 1 = ASYNC
  vaultType: 'SYNC' | 'ASYNC';
  totalAssets: bigint;
}

interface VaultUserState {
  shareBalance: bigint;
  positionValueFormatted: string;
  pendingShares: bigint;
  pendingAssetsFormatted: string;
  claimableShares: bigint;
  claimableAssetsFormatted: string;
  hasPending: boolean;
  hasClaimable: boolean;
  pendingCancelRedeem: boolean;
  claimableCancelRedeemShares: bigint;
  hasClaimableCancelRedeem: boolean;
  // ASYNC vault only:
  pendingDepositAssets: bigint;
  pendingDepositFormatted: string;
  claimableDepositAssets: bigint;
  claimableDepositFormatted: string;
  hasPendingDeposit: boolean;
  hasClaimableDeposit: boolean;
  isLoading: boolean;
}

type TxState = 'idle' | 'approving' | 'pending' | 'confirming' | 'success' | 'error';
type VaultType = 'SYNC' | 'ASYNC';
```

## VaultTxBuilder Methods

All static methods return `{ to, data, value }` — send with any wallet or signer.

| Method | Description |
|--------|-------------|
| `buildDepositTx(vault, assets, receiver, vaultType)` | SYNC: `deposit()`, ASYNC: `requestDeposit()` |
| `buildApproveTx(token, spender, amount)` | ERC20 approve |
| `buildRequestRedeemTx(vault, shares, controller, owner)` | Request async redeem |
| `buildClaimRedeemTx(vault, shares, receiver, controller)` | Claim completed redeem |
| `buildCancelRedeemTx(vault, controller)` | Cancel pending redeem |
| `buildClaimCancelRedeemTx(vault, receiver, controller)` | Claim shares after cancel |

## Development

```bash
pnpm install
pnpm build        # Build CJS + ESM + types
pnpm test         # Run tests
pnpm type-check   # TypeScript check
pnpm dev          # Watch mode
```

## License

MIT
