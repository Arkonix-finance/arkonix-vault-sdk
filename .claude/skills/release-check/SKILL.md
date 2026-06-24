---
name: release-check
description: Pre-release validation for the SDK — verifies build, types, tests, exports, and README parity before publishing to npm. Use when preparing a release or checking release readiness.
argument-hint: "[version]"
allowed-tools: Read, Grep, Bash(pnpm *), Bash(git status *), Bash(git log *)
---

# Release Readiness Check

Validate `@arkonix.xyz/arkonix-vault-sdk` is ready to publish version $0 (or the current `package.json` version if none given).

## Current state
!`git status --short`
!`git log -1 --oneline`

## Steps
1. Run `pnpm type-check` and `pnpm test` — both must pass.
2. Run `pnpm build` — confirm `dist/` has CJS (`index.cjs`), ESM (`index.js`), and types (`index.d.ts`, `index.d.cts`).
3. Confirm `package.json` `version`, `main`, `module`, `types`, `exports` (if present), and `files` are correct.
4. Verify README parity: every hook/method/type in `README.md` is actually exported from `src/index.ts` (invoke the `docs-sync` agent if unsure).
5. Confirm no `console.log`, `.only(`, or `debugger` left in `src/`.
6. Confirm `CHANGELOG.md` (if present) has an entry for this version.

## Output
Report a PASS/FAIL checklist. On any FAIL, list exactly what to fix. Do not publish — publishing is a manual, human-approved step.
