# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

8004skill is a Claude Code skill for the ERC-8004 on-chain agent economy protocol. It provides a conversational wizard interface (defined in SKILL.md) that runs TypeScript CLI scripts to register agents, discover peers, manage reputation, and enable agent-to-agent interactions across EVM chains. The declared runtime dependency is `agent0-sdk`. Note: `check-env.ts` directly imports from `viem/accounts` (a transitive dependency of `agent0-sdk`).

## Commands

```bash
npm run typecheck    # Type-check without emitting (tsc --noEmit)
npm run build        # Compile to dist/ (tsc)
```

Scripts are executed at runtime via `npx tsx scripts/<script>.ts --flag value` (`tsx` is a devDependency; run `npm install` first). There are no tests or linters configured.

## Architecture

### How the skill works

1. Claude Code reads `SKILL.md` which defines 8 main operations plus an Update Agent sub-flow (configure, register, load, search, feedback, inspect, wallet, verify, update)
2. The user interacts via natural language; Claude presents menus and gathers inputs conversationally
3. Claude builds CLI commands internally and runs them via `npx tsx scripts/<name>.ts`
4. Scripts output JSON to stdout (results) and progress/error messages to stderr (errors also as JSON via `exitWithError`, which calls `process.exit(1)`)
5. Claude parses the JSON and presents results in a readable format

### Script layout

All scripts live in `scripts/` and follow the same pattern: parse CLI args → validate → build SDK config → call agent0-sdk → output JSON. Scripts are either **read-only** (`load-agent.ts`, `search.ts`, `reputation.ts`, `connect.ts`, `check-env.ts`) or **write operations** requiring a private key (`register.ts`, `update-agent.ts`, `feedback.ts`). Write scripts use `loadPrivateKey()` which resolves keys from `PRIVATE_KEY` env var or the encrypted keystore. `wallet.ts` handles both read (`get`) and write (`set`, `unset`) actions. `verify.ts` handles both read (`verify`) and write (`sign`) actions, using `viem` for EIP-191 signing/verification against on-chain wallets. `keystore.ts` is an interactive CLI for managing the encrypted keystore (import, export, list, delete, verify) — run directly by the user, not by Claude. `check-env.ts` is an exception: it takes no CLI args, does not use the SDK, and imports `privateKeyToAddress` directly from `viem/accounts`.

`scripts/lib/shared.ts` is the shared utility module providing `parseArgs()`, `requireArg()`, `parseChainId()`, `parseIntStrict()`, validators (`validateAgentId`, `validateAddress`, `validateSignature`, `validateIpfsProvider`), `buildSdkConfig()`, `loadPrivateKey()`, error handlers (`exitWithError`, `handleError`), and `initSecurityHardening()` which write scripts call at startup to install signal handlers that wipe sensitive env vars on interruption. `scripts/lib/keystore.ts` provides the encrypted keystore library (AES-256-GCM encryption, PBKDF2 key derivation, file I/O). `check-env.ts` detects OpenClaw environments and cloud-synced directories, emitting security warnings in its JSON output.

### Reference docs

`reference/` contains three markdown files used by the skill at runtime:
- `chains.md` — supported EVM chains, contract addresses, RPC endpoints
- `sdk-api.md` — agent0-sdk API surface (classes, methods, types)
- `agent-schema.md` — ERC-8004 data structures (registration files, feedback, reputation)

### Configuration

User config is stored at `~/.8004skill/config.json` (directory: chmod 700, file: chmod 600) with fields: `activeChain`, `rpcUrl`, `ipfs`, `registrations`. An optional encrypted keystore lives at `~/.8004skill/keystore.json` (chmod 600), storing AES-256-GCM encrypted private keys with PBKDF2-derived keys.

### Key conventions

- Agent ID format: `chainId:tokenId` (e.g., `11155111:42`)
- All write operations must show a confirmation summary and get explicit user approval before executing
- Private keys are either passed via environment variables (`PRIVATE_KEY`, `WALLET_PRIVATE_KEY`) or stored in an encrypted keystore (`~/.8004skill/keystore.json`). Plaintext keys are never stored on disk.
- Raw CLI commands are never shown to the user
- ESM throughout (`"type": "module"` in package.json)
- Node.js >= 22.0.0 required (enforced via `engine-strict=true`)
