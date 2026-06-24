# Arkonix Vault SDK

Universal **React / React Native** SDK for **ERC-7540** async vault deposit & redeem,
plus financial data (NAV, returns, share price) for Arkonix-deployed vaults. Published to
npm as `@arkonix.xyz/arkonix-vault-sdk`. Built on **viem** + **@tanstack/react-query**.

The north-star use case: a partner has only a **vault address** and wants to build their
own UI — deposit, redeem, NAV, and returns must all be reachable from that address alone.

## Commands

> Note: the typecheck script is `type-check` (hyphenated), not `typecheck`.

- Install: `pnpm install`
- Build: `pnpm build` (tsup → `dist/`, CJS + ESM + `.d.ts`)
- Test: `pnpm test` (vitest); watch: `pnpm test:watch`; coverage: `pnpm test:coverage`
- Integration tests: `pnpm test:integration` (hit live APIs — not run in unit CI)
- Typecheck: `pnpm type-check` (`tsc --noEmit`)
- Lint: `pnpm lint` (ESLint 9 flat config, `eslint.config.js`); autofix: `pnpm lint:fix`
- Dev (watch build): `pnpm dev`

Run `pnpm type-check && pnpm test` before opening a PR.

## Architecture

The SDK has two consumption modes that share one core:

```
src/
├── index.ts              # PUBLIC API surface — single source of truth for exports
├── core/                 # Standalone, no React required
│   ├── blockchain/       # VaultReader (reads), VaultActions (orchestrated tx),
│   │                     #   VaultTxBuilder (raw calldata)
│   ├── api/              # ArkonixAPIClient (NAV/returns/price — Arkonix backend),
│   │                     #   CentrifugeAPIClient (holdings/vaults — GraphQL)
│   └── wallet/          # WebWalletAdapter, RNWalletAdapter
├── hooks/               # React hooks layer wrapping core (deposit, redeem, financials…)
├── provider/            # VaultProvider + VaultContext (config, client, walletAdapter)
├── types/              # Public TypeScript types
└── constants/          # ABIs, chains, token addresses
```

- **Standalone mode**: import `VaultReader` / `VaultActions` / `VaultTxBuilder` /
  `ArkonixAPIClient` and pass your own viem `PublicClient`. No provider needed.
- **Hooks mode**: wrap the vault UI (not the whole app) in `VaultProvider` and use the
  `use*` hooks. Reuse the consumer's existing `QueryClientProvider` if they have one.

## Domain model (ERC-7540)

Vaults follow the Centrifuge model: `Pool → ShareClass → Vault`. A vault is identified
by its on-chain **address**; it has a `poolId` and a `vaultKind`.

`VaultType` union: `'ASYNC' | 'SYNC_DEPOSIT_ASYNC_REDEEM'`
mapped from on-chain `vaultKind` — **0 → `ASYNC`, otherwise `SYNC_DEPOSIT_ASYNC_REDEEM`**.

Request → epoch → claim lifecycle:

```
DEPOSIT (ASYNC):            requestDeposit(assets) → [epoch] → deposit(assets) mints shares
DEPOSIT (SYNC_DEPOSIT...):  deposit(assets) mints shares immediately (ERC-4626)
REDEEM (both):             requestRedeem(shares) → [epoch] → redeem(shares) returns assets
CANCEL:                    cancel{Deposit,Redeem}Request() → [epoch] → claimCancel...()
```

- `requestId` is always `0` (one request per user per vault).
- Epoch execution is performed off-chain by the Arkonix operator.
- Poll `useVaultUserState` (auto-refresh ~10s) to detect pending → claimable transitions.

## Financial data (NAV / returns / share price)

These do **not** come from the vault contract — they come from the **Arkonix backend's
public, unauthenticated endpoints**, keyed by vault address or share-class id. The SDK
wraps them in `ArkonixAPIClient` (core) and `useVaultFinancials` / `useReturnHistory` /
`useTvlHistory` / `useSharePriceHistory` (hooks). Configure via `config.arkonixAPI.baseUrl`.
Return fields are `return7d` / `return30d` / `return90d` (cumulative %) and `returnAllTime`
(annualized since inception for ≥30d-old vaults, else cumulative). All percent, nullable —
`null` ≠ `0`. JSON keys are `return_*_pct`; endpoint path is still `/apy-history`.

## Code style

- Strict TypeScript (`strict`, `noUncheckedIndexedAccess`). Avoid `any`; prefer `unknown`
  + narrowing. The viem result-casting pattern (`result as bigint`) is the existing idiom.
- Named exports only — no default exports. Everything public flows through `src/index.ts`.
- 2-space indent, single quotes, semicolons.
- Amounts use `parseUnits`/`formatUnits` with the **correct decimals** — asset decimals
  for asset amounts, share decimals for shares. These differ (e.g. USDC=6, shares=18).
- Comments: default to none. Only explain a non-obvious WHY (an invariant, a contract a
  caller must follow). Don't narrate what the code does or reference the current PR/task.

## Adding a feature

A new vault capability must be threaded through every layer or it drifts. Use the
`/add-vault-feature` skill, which encodes the checklist: ABI → TxBuilder → Reader →
Actions → types → hook → **export in index.ts** (most-missed step) → README → tests.

## Repo etiquette

- Branch off `main`; never commit directly to `main`.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
- Keep `README.md` in lockstep with `src/index.ts` — this repo has drifted before. The
  `docs-sync` agent verifies parity.
- Publishing to npm is tag-driven CI (`v*.*.*`) and human-approved — never publish locally.

See @README.md for full usage and @package.json for the complete script list.
