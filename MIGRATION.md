# Migration Guide — `@arkonix.xyz/arkonix-vault-sdk` → 2.2.x

This release adds a financial-data layer (NAV / returns / share price) and a cancel
flow, and **renames the misleading `apy_*` fields to `return_*`**. There are three
breaking changes; everything else is additive.

> **Coordination:** the `apy_*` → `return_*` rename is a **hard cutover** — the SDK
> reads only the new keys and the backend renames the JSON in the same release. Make
> sure you're pointed at the updated backend before shipping the SDK bump.

---

## TL;DR — what breaks

| # | Change | Who's affected |
|---|--------|----------------|
| 1 | `apy*` return fields renamed to `return*`; `useApyHistory` → `useReturnHistory` | Anyone reading APY/return data |
| 2 | `useCancelDeposit(vault)` now requires a second `vaultType` arg | Anyone using cancel-deposit (new in this release; likely no one yet) |
| 3 | The values formerly called "APY" are now **returns** — different math | Anyone displaying these numbers |

If you weren't using the financial-data hooks or cancel-deposit yet, **nothing breaks** —
this is purely additive for you.

---

## 1. `apy_*` → `return_*` rename (the big one)

The fields named `apy*` never carried an APY after the backend's return rework. They've
been renamed to say what they actually are.

### Field renames

| Old (≤ 2.1.x) | New (2.2.x) | Meaning |
|---|---|---|
| `apy7d` | `return7d` | **cumulative** % return over 7d |
| `apy30d` | `return30d` | **cumulative** % return over 30d |
| `apy90d` | `return90d` | **cumulative** % return over 90d |
| `apyAllTime` | `returnAllTime` | **annualized** since inception (≥30d old), else cumulative |

These appear on both `useVaultFinancials(...).data` and `useReturnHistory(...).data`.

### Type / hook / client renames

| Old | New |
|---|---|
| `useApyHistory(scId, { days })` | `useReturnHistory(scId, { days })` |
| `ApyHistory` (type) | `ReturnHistory` |
| `ApyHistoryPoint` (type) | `ReturnHistoryPoint` |
| `ArkonixAPIClient.getApyHistory(...)` | `ArkonixAPIClient.getReturnHistory(...)` |

> The HTTP endpoint path is still `/apy-history` — only the SDK surface and JSON
> field names changed. No action needed on your end for the path.

### Before → after

```tsx
// BEFORE (2.1.x)
import { useVaultFinancials, useApyHistory } from "@arkonix.xyz/arkonix-vault-sdk";

const { data: fin } = useVaultFinancials(vaultAddress);
const { data: apy } = useApyHistory(fin?.shareClassId, { days: 90 });

<p>APY 7d: {fin.apy7d}%</p>
<p>APY all-time: {fin.apyAllTime}%</p>
```

```tsx
// AFTER (2.2.x)
import { useVaultFinancials, useReturnHistory } from "@arkonix.xyz/arkonix-vault-sdk";

const { data: fin } = useVaultFinancials(vaultAddress);
const { data: history } = useReturnHistory(fin?.shareClassId, { days: 90 });

<p>Return 7d: {fin.return7d}%</p>
<p>Return (all-time, annualized): {fin.returnAllTime}%</p>
```

### Find-and-replace cheatsheet

Safe, mechanical replacements (case-sensitive):

```
useApyHistory        → useReturnHistory
getApyHistory        → getReturnHistory
ApyHistoryPoint      → ReturnHistoryPoint
ApyHistory           → ReturnHistory   (run AFTER ApyHistoryPoint)
.apy7d               → .return7d
.apy30d              → .return30d
.apy90d              → .return90d
.apyAllTime          → .returnAllTime
```

> Order matters: replace `ApyHistoryPoint` before `ApyHistory`, or you'll get
> `ReturnHistoryPoint` mangled. TypeScript will flag every missed site at compile time.

---

## 2. Returns are NOT APYs — fix your labels & math

This is a **semantic** change, not just a rename. Update any UI copy and any client-side
math that assumed annualized yield.

- **`return7d` / `return30d` / `return90d` are cumulative**, not annualized.
  A −7% month reads `-7`, **not** `-60`. Don't re-annualize them, and don't label
  them "APY".
- **`returnAllTime` is the only annualized field** — annualized since inception for
  vaults ≥30 days old, otherwise cumulative. Bounded to roughly **[−99, +1000]**.
- **All `return*` values are percentages** (`12.5` = 12.5%), and **`number | null`**.
  `null` means "not enough valid history for this window" (common on young vaults).
  **Never coerce `null` to `0`** and never average `null`s as zeros.

```tsx
// Handle null explicitly — don't render "0%" for an unknown return.
<p>Return 7d: {fin.return7d != null ? `${fin.return7d}%` : "—"}</p>
```

### Charting

- Headline `return*` fields are **daily-cached**; the `points[]` series is the **live
  ~15-min** share-price series. The chart's last point will **not** equal
  `returnAllTime` — that's expected (chart is a cumulative path, the headline is
  annualized).
- **New per-point field** on `ReturnHistoryPoint`: **`cumulativeReturnSinceInceptionPct`**
  (`number | null`). This is net-new to the SDK's point model in 2.2.x. Use it — not the
  window-relative `cumulativeReturnPct` — to chart the **all-time cumulative** curve.
- **Both per-point fields are cumulative. There is no per-point annualized series.**
  Don't try to chart "annualized APY over time" from `points` — annualizing a few days
  of early history is noisy and explosive, which is why it isn't provided. The only
  annualized figure in the API is the top-level `returnAllTime` headline.

```tsx
const { data: history } = useReturnHistory(fin?.shareClassId, { days: 365 });
const points = history?.points.map(p => ({
  t: p.timestamp,
  // window-relative (resets per `days`)
  windowReturn: p.cumulativeReturnPct,
  // absolute, cumulative since launch — use for the all-time chart line
  allTimeReturn: p.cumulativeReturnSinceInceptionPct,
}));
```

---

## 3. `useCancelDeposit` now requires `vaultType`

To prevent a silent on-chain revert (SYNC_DEPOSIT_ASYNC_REDEEM vaults don't support
cancel-deposit), the hook now requires the vault type.

```tsx
// BEFORE
const { cancelDeposit } = useCancelDeposit(vaultAddress);

// AFTER — pass meta.vaultType (from useVaultMetadata)
const { data: meta } = useVaultMetadata(vaultAddress);
const { cancelDeposit } = useCancelDeposit(vaultAddress, meta?.vaultType);
```

If `vaultType` is anything other than `'ASYNC'` (or is undefined), `cancelDeposit()` /
`claimCancelDeposit()` fail early with a clear error instead of reverting on-chain.

> This hook is **new in this release**, so in practice there's likely nothing to migrate
> — just be aware of the required arg.

---

## Deprecations (still work — plan ahead)

Nothing below breaks in this release; each still compiles and runs. They carry a
`@deprecated` JSDoc tag (you'll see a strikethrough in your editor) and are **planned
for removal in v3.0.0**.

### Centrifuge holdings → Arkonix asset distribution

The Centrifuge-keyed holdings hooks/methods are superseded by an Arkonix-native source
that is keyed by **share-class id** (not Centrifuge `poolId`/`tokenId`) and returns
**pre-computed `pctOfTvl` weights** — the numbers a dashboard actually needs.

| Deprecated | Replacement |
|---|---|
| `useVaultHoldings(poolId, tokenId)` | `useVaultAssetDistribution(shareClassId)` |
| `usePoolHoldings(poolId)` | `useVaultAssetDistribution(shareClassId)` |
| `useCentrifugeHoldings({ poolId, tokenId })` | `useVaultAssetDistribution(shareClassId)` |
| `CentrifugeAPIClient.getVaultHoldings(poolId, tokenId)` | `ArkonixAPIClient.getAssetDistribution(shareClassId)` |
| `CentrifugeAPIClient.getPoolHoldings(poolId)` | `ArkonixAPIClient.getAssetDistribution(shareClassId)` |

> **Not a mechanical rename.** Three things change: the **key** (share-class id, from
> `useVaultFinancials(...).data.shareClassId`), the **return shape**
> (`VaultAssetDistribution` with an `assets[]` array of `{ symbol, amountHuman, valueUsd,
> pctOfTvl }`, vs. raw `CentrifugeHoldingEscrow[]`), and the **backend** (Arkonix REST vs.
> Centrifuge GraphQL). The old hooks gave you raw amounts and no weights.

```tsx
// BEFORE — Centrifuge-keyed, no weights (you computed them yourself)
const { data: holdings } = useVaultHoldings(poolId, tokenId);

// AFTER — vault-scoped via share-class id, weights included
const { data: fin } = useVaultFinancials(vaultAddress);
const { data: dist } = useVaultAssetDistribution(fin?.shareClassId);
dist?.assets.forEach(a => console.log(a.symbol, a.pctOfTvl)); // pctOfTvl already computed
```

**Not deprecated:** the vault-*discovery* hooks (`useCentrifugeVaults`, `usePoolVaults`,
`useActiveVaults`) and the base `CentrifugeAPIClient.getHoldings(...)` filter query —
these have no Arkonix equivalent and are unaffected.

---

## New & additive (no migration needed)

You can adopt these whenever you like:

- **`config.arkonixAPI.baseUrl`** on `VaultProvider` — enables the financial-data hooks.
  Without it, those hooks stay disabled and error clearly if called.
  ```tsx
  <VaultProvider config={{ chainId, rpcUrl, arkonixAPI: { baseUrl: "https://api.arkonix.xyz" } }}>
  ```
- **Financial-data hooks:** `useVaultFinancials`, `useReturnHistory`, `useTvlHistory`,
  `useSharePriceHistory` — NAV/TVL, returns, share price, and history from a vault address.
- **Cancel flow:** `useCancelRedeem`, `useCancelDeposit` (+ `claimCancel*`), and the
  matching `VaultActions` / `VaultTxBuilder` methods.
- **`useClaimDeposit`** is now exported (was implemented but unexported in 2.1.x).
- **`ArkonixAPIClient`** for non-React usage.
- Expanded chain support: Ethereum, Base, Arbitrum, BSC, HyperEVM.

---

## Migration checklist

- [ ] Bump `@arkonix.xyz/arkonix-vault-sdk` to `2.2.x`.
- [ ] Confirm the backend serving your `arkonixAPI.baseUrl` has the `return_*` rename deployed.
- [ ] Run the find-and-replace cheatsheet (§1); let TypeScript surface the rest.
- [ ] Update UI copy: "APY" → "Return" where it's a 7/30/90d figure; keep "APY" only
      for `returnAllTime` if you label it as annualized.
- [ ] Remove any client-side re-annualization of the 7/30/90d values.
- [ ] Verify `null` handling — render a placeholder, never `0%`.
- [ ] If charting the all-time **cumulative** curve, use `cumulativeReturnSinceInceptionPct`
      (there is no per-point annualized series; `returnAllTime` is the only annualized figure).
- [ ] If you use cancel-deposit, pass `vaultType` (§3).
- [ ] `tsc` / build clean → ship.

## Questions

Ping the SDK team. Full field semantics live in `README.md` (§6, "NAV, Returns &
Share Price") and the exported TypeScript types.
