---
name: add-vault-feature
description: Scaffold a new vault capability across every layer of the SDK consistently — core, hook, types, exports, README, and tests. Use when adding a new on-chain action or read method so nothing is missed.
argument-hint: "<feature-name> (e.g. cancelDeposit)"
allowed-tools: Read, Grep, Glob, Edit
---

# Add a Vault Feature: $0

This SDK has a layered architecture. A new feature must be added consistently across ALL layers, in this order, or it will drift. Use the existing redeem flow (`requestRedeem`) as the reference pattern.

## Checklist for "$0"

1. **ABI** (`src/constants/abis.ts`) — add the contract function entry if not already present (correct name, inputs, outputs, stateMutability).
2. **TxBuilder** (`src/core/blockchain/VaultTxBuilder.ts`) — add `build${0}Tx(...)` returning a `TransactionRequest` via `encodeFunctionData`. Match argument order to the ABI.
3. **Reader** (`src/core/blockchain/VaultReader.ts`) — if the feature has read state, add the view-function reads (and surface them in `VaultUserState` / `getUserState`).
4. **Actions** (`src/core/blockchain/VaultActions.ts`) — add the orchestrated method (validate inputs, send tx, `waitForTransactionReceipt`).
5. **Types** (`src/types/`) — extend `VaultUserState` / add result types as needed.
6. **Hook** (`src/hooks/use${0}.ts`) — wrap `VaultActions`/`VaultTxBuilder` with `useWriteTransaction`, following the `useRequestRedeem` pattern (txState, error, reset).
7. **Export** (`src/index.ts`) — export the hook, any new types, and new core methods. THIS STEP IS THE ONE MOST OFTEN MISSED.
8. **README** (`README.md`) — add a usage example and table rows for the new hook/method. Keep it in sync (the `docs-sync` agent verifies this).
9. **Tests** (`tests/`) — add unit tests mirroring the existing core tests.

After scaffolding, run `pnpm type-check && pnpm test` (or hand off to the `sdk-test-runner` agent).
