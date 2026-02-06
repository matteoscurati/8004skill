# Architecture

Technical architecture of the 8004skill project -- an AI agent skill for the ERC-8004 on-chain agent economy.

## Table of Contents

- [Overview](#overview)
- [Runtime Flow](#runtime-flow)
- [Script Architecture](#script-architecture)
- [Data Flow](#data-flow)
- [Configuration and Environment](#configuration-and-environment)
- [Security Model](#security-model)
- [ERC-8004 Protocol Summary](#erc-8004-protocol-summary)
- [Reference Documentation](#reference-documentation)

---

## Overview

8004skill bridges natural language interaction with on-chain ERC-8004 protocol operations. Users talk to the AI agent; the agent translates intent into CLI script invocations; scripts call `agent0-sdk` which reads/writes EVM smart contracts and IPFS.

```
User <---> AI Agent <---> TypeScript Scripts <---> agent0-sdk <---> EVM Chain / IPFS
              |                                                       |
          SKILL.md                                            ERC-8004 Registries
       (wizard defs)                                   (Identity, Reputation, Validation)
```

Key properties:

- **ESM-only** TypeScript project. Node >= 22. Executed via `npx tsx`.
- **Runtime dependencies**: `agent0-sdk` (bundles viem, IPFS clients, subgraph client), `@walletconnect/ethereum-provider`, `qrcode-terminal`.
- **No build step at runtime** -- tsx compiles on the fly. `tsc` is for type checking only.
- **Stateless scripts** -- each invocation is a standalone process. State lives in `~/.8004skill/config.json` and environment variables.

---

## Runtime Flow

### Sequence

```
+------------------+     1. reads      +------------------+
|    AI Agent      | <-----------------+    SKILL.md      |
|  (LLM runtime)  |                    | (9 ops + Update) |
+--------+---------+                   +------------------+
         |
         | 2. presents menus, gathers inputs conversationally
         v
+------------------+
|      User        |
+------------------+
         |
         | 3. provides name, description, chain, etc.
         v
+--------+---------+
|    AI Agent      |  4. builds CLI command internally
|                  |     (never shown to user)
+--------+---------+
         |
         | 5. executes: npx tsx scripts/<name>.ts --flag value ...
         v
+--------+---------+     6. calls      +------------------+
|  TypeScript      | ----------------> |   agent0-sdk     |
|  Script          |                   +--------+---------+
+--------+---------+                            |
         |                                      | 7. RPC / subgraph / IPFS / search API
         |                                      v
         |                             +------------------+
         |                             |   EVM Chain      |
         |                             |   IPFS           |
         |                             |   Subgraph       |
         |                             +------------------+
         |
         | 8. JSON result -> stdout
         |    progress/errors -> stderr
         v
+--------+---------+
|    AI Agent      |  9. parses JSON, presents readable output
+--------+---------+
         |
         v
+------------------+
|      User        |
+------------------+
```

### I/O Contract

All scripts follow the same I/O protocol:

| Channel | Format | Content |
|---------|--------|---------|
| stdout | JSON | Final result (parsed by the agent) |
| stderr | JSON | Progress updates (`{"status":"submitted","txHash":"0x..."}`) and errors (`{"error":"...","details":"..."}`) |
| exit 0 | -- | Success |
| exit 1 | -- | Failure (error already written to stderr) |

---

## Script Architecture

### Directory Layout

```
scripts/
  check-env.ts       # Environment preflight (WC session status, env vars)
  register.ts        # Register new agent on-chain
  load-agent.ts      # Load agent details
  update-agent.ts    # Update agent metadata
  search.ts          # Semantic + subgraph search
  feedback.ts        # Submit/revoke feedback on-chain
  respond-feedback.ts # Respond to feedback on-chain
  reputation.ts      # Reputation summary + feedback list
  connect.ts         # Agent discovery and inspection
  wallet.ts          # EIP-712 wallet management
  verify.ts          # EIP-191 identity signing and verification
  wc-pair.ts         # WalletConnect pairing / session status
  wc-disconnect.ts   # WalletConnect session disconnect
  lib/
    shared.ts        # CLI parsing, validation, SDK config helpers
    walletconnect.ts # WalletConnect session manager (FileSystemStorage, provider init)
```

### Shared Library (`scripts/lib/shared.ts`)

Every script imports from `shared.ts`. It provides:

| Export | Purpose |
|--------|---------|
| `SCRIPT_VERSION` | Version constant for script identification. |
| `parseArgs()` | Converts `--flag value` argv into `Record<string, string>`. Boolean flags (no value) become `"true"`. |
| `requireArg(args, key, label)` | Exits with error if `args[key]` is missing. Returns the value. |
| `parseChainId(raw)` | Parses chain ID string to number. Exits if invalid. |
| `requireChainId(raw)` | Exits if `raw` is undefined, then delegates to `parseChainId`. Used by all scripts that need a mandatory `--chain-id`. |
| `validateAgentId(id)` | Validates `chainId:tokenId` format via regex `/^\d+:\d+$/`. |
| `validateAddress(addr, name)` | Validates `0x`-prefixed 40-hex-char Ethereum address. |
| `validateSignature(sig)` | Validates `0x`-prefixed hex signature format. |
| `validateIpfsProvider(raw)` | Validates against allowed set: `pinata`, `filecoinPin`, `node`. |
| `parseDecimalInRange(raw, name, min, max)` | Parses and validates a decimal number within a range. |
| `splitCsv(raw)` | Splits a comma-separated string into a trimmed array. |
| `buildSdkConfig(opts)` | Builds `SDKConfig` object from CLI args and env vars. Accepts `walletProvider`, `subgraphUrl`, `registryOverrides`. |
| `getOverridesFromEnv(chainId)` | Reads `SUBGRAPH_URL`, `REGISTRY_ADDRESS_*` from env. Returns SDK override config. |
| `loadWalletProvider(chainId)` | Restores WalletConnect session or triggers new pairing (QR code). Returns EIP-1193 provider. |
| `fetchWithRetry(url, init, opts?)` | HTTP fetch with exponential backoff, `Retry-After` header support, and abort signal. |
| `exitWithError(message, details?)` | Writes JSON error to stderr and calls `process.exit(1)`. |
| `handleError(err)` | Catch-all for unhandled errors. Delegates to `exitWithError`. |
| `outputJson(data)` | Writes `JSON.stringify(data, null, 2)` to stdout. |
| `emitWalletPrompt()` | Emits `{"status":"awaiting_wallet"}` to stderr before a signing request. |
| `tryCatch(fn)` | Wraps an async call, returns `{ value?, error? }` for non-fatal lookups. |
| `extractIpfsConfig(args)` | Extracts IPFS provider, Pinata JWT, Filecoin key, and node URL from args/env. |
| `validateIpfsEnv(config)` | Validates that the required IPFS env var is set before wallet approval. |
| `validateConfig(config)` | Validates a config object and returns warnings (non-blocking). |
| `buildAgentDetails(agent, regFile, extras?)` | Builds a standardized agent detail object from an Agent/AgentSummary and its registration file. |
| `submitAndWait(handle, opts?)` | Logs `{status:'submitted', txHash}` to stderr, waits for mining, returns `{result, txHash}`. |

### Script Pattern

Every script follows this structure:

```typescript
#!/usr/bin/env npx tsx

import { SDK } from 'agent0-sdk';
import { parseArgs, requireArg, /* ... */ handleError } from './lib/shared.js';

async function main() {
  // 1. Parse CLI args
  const args = parseArgs();

  // 2. Validate required args
  const agentId = requireArg(args, 'agent-id', 'agent to load');
  validateAgentId(agentId);

  // 3. Build SDK config
  const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl }));

  // 4. Call SDK methods
  const agent = await sdk.loadAgent(agentId);

  // 5. Output JSON to stdout
  console.log(JSON.stringify(result, null, 2));
}

// 6. Catch-all error handler
main().catch(handleError);
```

Write operations add:
- `loadWalletProvider(chainId)` to restore or initiate WalletConnect session
- `walletProvider` passed to `buildSdkConfig()` for signing
- Progress reporting to stderr (`{"status":"submitted","txHash":"0x..."}`)
- `waitMined({ timeoutMs: 120_000 })` on transaction handles

### Read vs Write Scripts

```
                  +---------------------------+
                  |      Read Scripts         |
                  |  (no wallet needed)       |
                  +---------------------------+
                  | check-env.ts              |  Environment status
                  | load-agent.ts             |  Agent details
                  | search.ts                 |  Semantic + subgraph search
                  | reputation.ts             |  Reputation + feedback list
                  | connect.ts                |  Agent discovery / inspection
                  | wallet.ts --action get    |  Read wallet address
                  | verify.ts --action verify |  Verify identity signature
                  +---------------------------+

                  +---------------------------+
                  |      Write Scripts        |
                  |  (WalletConnect required) |
                  +---------------------------+
                  | register.ts               |  Mint agent NFT
                  | update-agent.ts           |  Update metadata URI
                  | feedback.ts               |  Submit on-chain feedback
                  | respond-feedback.ts       |  Respond to feedback
                  | wallet.ts --action set    |  Set wallet
                  | wallet.ts --action unset  |  Unset wallet
                  | verify.ts --action sign   |  Sign identity proof
                  +---------------------------+

                  +---------------------------+
                  |    Session Management     |
                  +---------------------------+
                  | wc-pair.ts                |  Pair wallet / check status
                  | wc-disconnect.ts          |  Disconnect session
                  +---------------------------+
```

Write scripts all follow the same transaction lifecycle:

```
loadWalletProvider() -> SDK init with walletProvider -> build tx -> submit ->
  stderr: {"status":"submitted","txHash":"0x..."} ->
  user approves in wallet app ->
  waitMined(120s) -> stdout: result JSON
```

### Script-specific Notes

- **check-env.ts** -- Only script that does not use `agent0-sdk` SDK class. Reports WalletConnect session status, connected address, and configured env vars.
- **search.ts** -- Dual-mode: semantic search (POST to `https://agent0-semantic-search.dawid-pisarczyk.workers.dev/api/v1/search`, no SDK needed) or subgraph search (SDK `searchAgents`). Routes based on presence of `--query` flag.
- **wallet.ts** -- Tri-modal (`--action get|set|unset`). The `set` action signs via WalletConnect, or accepts a `--signature` flag with a pre-generated EIP-712 signature.
- **update-agent.ts** -- Loads existing agent, applies mutations, re-publishes. Validates at least one mutation flag is present.
- **connect.ts** -- Combines agent details + reputation summary in a single response. Used for the "Inspect Agent" operation.

---

## Data Flow

### Registration (write)

```
User Input                CLI Args                    SDK Calls              Chain / IPFS
----------                --------                    ---------              ------------
name, description   ->   --name, --description  ->   sdk.createAgent()
mcp endpoint        ->   --mcp-endpoint         ->   agent.setMCP()         (fetches MCP manifest)
a2a endpoint        ->   --a2a-endpoint         ->   agent.setA2A()         (fetches agent card)
IPFS provider       ->   --ipfs pinata          ->   agent.registerIPFS()   -> upload to IPFS
                                                                             -> mint ERC-721 NFT
                                                      handle.waitMined()    <- tx confirmation

stdout: { agentId: "11155111:42", txHash: "0x...", uri: "ipfs://..." }
```

### Search (read)

```
                    Semantic Path                          Subgraph Path
                    -------------                          --------------
--query "..."  ->   POST semantic search API               --name "..."  ->  sdk.searchAgents()
                    (vector similarity)                    (indexed query via The Graph)
                         |                                       |
                         v                                       v
                    JSON array of AgentSummary objects
```

### Feedback (write)

```
--agent-id, --value, --tag1, --tag2
         |
         v
[optional] --text  ->  sdk.prepareFeedbackFile()  ->  upload to IPFS
         |
         v
sdk.giveFeedback(agentId, value, tag1, tag2, endpoint, feedbackFile)
         |
         v
Reputation Registry contract  ->  on-chain feedback signal
```

### Wallet Set (write)

```
WalletConnect session (owner)
         |
         v
  SDK init with walletProvider
         |
         v
    agent.setWallet(address)   (or --signature for pre-signed EIP-712)
         |
         v
    User approves in wallet app
         |
         v
    Identity Registry: setAgentWallet(agentId, wallet, sig, deadline)
```

### Full I/O Cycle

```
~/.8004skill/config.json ----+
                              |
Environment variables --------+--> Script Process
                              |        |
--flag value CLI args --------+        |
                                       v
                              +-- agent0-sdk --+
                              |                |
                              v                v
                         EVM Chain         IPFS / Search API
                              |                |
                              +-------+--------+
                                      |
                                      v
                              stdout: JSON result
                              stderr: progress / errors
```

---

## Configuration and Environment

### User Config File

Location: `~/.8004skill/config.json` (permissions: `chmod 600`)

```json
{
  "activeChain": 11155111,
  "rpcUrl": "https://rpc.sepolia.org",
  "ipfs": "pinata",
  "wcProjectId": "optional-walletconnect-project-id",
  "registrations": {
    "11155111": {
      "agentId": "11155111:42",
      "txHash": "0xabc...",
      "registeredAt": "2025-01-15T10:30:00Z"
    }
  }
}
```

The config directory `~/.8004skill/` is created with `chmod 700`. The agent manages this file -- scripts do not read it directly. The agent reads the config, extracts values, and passes them as CLI flags. WalletConnect session state is stored separately at `~/.8004skill/wc-storage.json` (chmod 600).

### Environment Variables

See [reference/security.md](../reference/security.md#environment-variables-reference) for the canonical environment variables table.

### How Config Flows to Scripts

The agent reads `~/.8004skill/config.json` and passes values as CLI args:

```
config.activeChain  ->  --chain-id 11155111
config.rpcUrl       ->  --rpc-url https://rpc.sepolia.org
config.ipfs         ->  --ipfs pinata
```

Environment variables (`PINATA_JWT`, `SUBGRAPH_URL`, etc.) pass through the process environment directly to the scripts.

---

## Security Model

### Principles

See [reference/security.md](../reference/security.md) for the full security model, including WalletConnect protections, untrusted content policies, and env var handling.

### Threat Surface

```
+---------------------+-----------------------------------+--------------------+
| Layer               | Threat                            | Mitigation         |
+---------------------+-----------------------------------+--------------------+
| WC session file     | Session hijacking if attacker     | chmod 600,         |
|                     | accesses wc-storage.json          | symlink checks,    |
|                     |                                   | user still approves|
|                     |                                   | each tx in wallet  |
+---------------------+-----------------------------------+--------------------+
| Config file         | Unauthorized read                 | chmod 600          |
+---------------------+-----------------------------------+--------------------+
| Cloud-synced dirs   | Session file replicated to cloud  | Preflight warning  |
+---------------------+-----------------------------------+--------------------+
| On-chain writes     | Unintended transactions           | Preflight check +  |
|                     |                                   | user confirmation  |
|                     |                                   | + wallet approval  |
+---------------------+-----------------------------------+--------------------+
| RPC endpoint        | Man-in-the-middle                 | HTTPS endpoints    |
+---------------------+-----------------------------------+--------------------+
| EIP-712 wallet set  | Replay / expired signature        | 300s deadline      |
+---------------------+-----------------------------------+--------------------+
```

### Write Operation Guard Sequence

```
1. The agent reads config
2. The agent runs check-env.ts
3. The agent shows signer address to user
4. The agent gathers all inputs
5. The agent shows full transaction summary
6. The agent asks: "Proceed?"
7. User confirms
8. The agent executes write script
```

If the user does not confirm, the operation is aborted. No transaction is submitted.

---

## ERC-8004 Protocol Summary

### Three Registries

```
+---------------------------+     +---------------------------+     +---------------------------+
|    Identity Registry      |     |   Reputation Registry     |     |   Validation Registry     |
|        (ERC-721)          |     |                           |     |                           |
+---------------------------+     +---------------------------+     +---------------------------+
| - Agent as NFT (tokenId)  |     | - Feedback signals        |     | - Third-party attestations|
| - Owner = minter          |     | - Rating: -100 to 100     |     | - Validator signatures    |
| - Metadata URI (IPFS/HTTP)|     | - Up to 2 tags per entry  |     | - Trust anchors           |
| - On-chain key-value store|     | - Optional text (IPFS)    |     |                           |
| - Agent wallet (EIP-712)  |     | - Endpoint-specific       |     |                           |
+---------------------------+     +---------------------------+     +---------------------------+
```

All contract addresses start with `0x8004` (deployed via CREATE2 with vanity prefix).

### Agent ID Format

- **Full**: `eip155:{chainId}:{identityRegistryAddress}:{tokenId}`
- **Short** (used by all scripts): `{chainId}:{tokenId}` (e.g., `11155111:42`)

Validated by `shared.ts` regex: `/^\d+:\d+$/`

### Agent Metadata (Registration File)

Stored on IPFS or HTTP. Contains:

- `name`, `description`, `image`
- `endpoints[]` -- each with `type` (MCP, A2A, ENS, OASF), `value` (URL), and `meta`
- `trustModels[]` -- `reputation`, `crypto-economic`, `tee-attestation`
- `owners[]`, `operators[]`
- `active`, `x402support`
- `metadata` (arbitrary key-value)
- `updatedAt` (unix timestamp)

### Feedback

- Rating value: number from -100 to 100, decimals allowed (e.g. 85, 99.77, -3.2; stored as int128 value + uint8 valueDecimals on-chain)
- Tags: up to 2 free-text tags per feedback entry
- Text: optional detailed feedback stored on IPFS as a feedback file
- Endpoint: optional, for endpoint-specific feedback
- Revocable by the original reviewer

### Wallet (EIP-712)

Setting an agent wallet requires a typed signature from the target wallet:

- Domain: `{ name: "ERC8004IdentityRegistry", version: "1", chainId, verifyingContract }`
- Type: `AgentWalletSet { agentId: uint256, newWallet: address, owner: address, deadline: uint256 }`
- Deadline: must be within 300 seconds of current chain time

### Supported Chains

18 deployed chains (10 mainnet + 8 testnet) plus 4 planned:

| Chain | Chain ID | Status |
|-------|----------|--------|
| Ethereum Mainnet | 1 | Production |
| Polygon Mainnet | 137 | Production |
| Base | 8453 | Production |
| BSC | 56 | Production |
| Monad | 143 | Production |
| Scroll | 534352 | Production |
| Gnosis | 100 | Production |
| Arbitrum | 42161 | Production |
| Celo | 42220 | Production |
| Taiko | 167000 | Production |
| Ethereum Sepolia | 11155111 | Testnet (default) |
| Base Sepolia | 84532 | Testnet |
| BSC Chapel | 97 | Testnet |
| Monad Testnet | 10143 | Testnet |
| Scroll Testnet | 534351 | Testnet |
| Arbitrum Sepolia | 421614 | Testnet |
| Celo Alfajores | 44787 | Testnet |
| Polygon Amoy | 80002 | Testnet |
| Linea Sepolia | 59141 | Planned |
| Hedera Testnet | 296 | Planned |
| HyperEVM Testnet | 998 | Planned |
| SKALE Base Sepolia | 1351057110 | Planned |

The SDK has built-in registry addresses for Mainnet (1) and Sepolia (11155111). Polygon (137) has a built-in subgraph URL but requires registry address overrides. All other chains require `registryOverrides` in SDK config. See `reference/chains.md` for contract addresses, subgraph URLs, and RPC endpoints.

---

## Reference Documentation

The `reference/` directory contains four files used by the agent at runtime to answer questions and configure scripts.

### `reference/chains.md`

Contract addresses, subgraph URLs, and public RPC endpoints for all supported chains. The agent reads this when:

- Presenting chain selection during configuration
- Suggesting RPC endpoints
- Linking transaction hashes to block explorers

### `reference/sdk-api.md`

Complete `agent0-sdk` API surface: `SDK` class constructor, methods, `Agent` class properties and methods, `TransactionHandle`, search filters, and enums. The agent uses this as context for understanding script capabilities.

### `reference/agent-schema.md`

ERC-8004 data structures: registration file format, agent summary (from subgraph), feedback structure, feedback file (off-chain), reputation summary, on-chain metadata, and the EIP-712 wallet signature scheme. Scripts produce output conforming to these structures.

### `reference/security.md`

Security rules, WalletConnect security model, and untrusted content policies. The agent reads this to enforce:

- Never showing raw CLI commands to users
- Always confirming before write operations
- Never accepting, displaying, or storing private keys
- WalletConnect session file protections
- Treating untrusted content (user-provided URLs, IPFS data, agent metadata) safely

### How Scripts Use Reference Data

Scripts do not read reference files directly. The relationship is:

```
reference/chains.md       -> The agent reads -> passes --chain-id, --rpc-url to scripts
reference/sdk-api.md      -> The agent reads -> understands what scripts can do
reference/agent-schema.md -> The agent reads -> formats script JSON output for user
reference/security.md     -> The agent reads -> enforces security rules during operations
```

The SDK itself has built-in chain configs. Reference docs serve as human-readable documentation that the agent uses for contextual understanding and user-facing explanations.
