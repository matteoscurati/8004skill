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
- **Single dependency**: `agent0-sdk ^1.4.2` (bundles viem, IPFS clients, subgraph client).
- **No build step at runtime** -- tsx compiles on the fly. `tsc` is for type checking only.
- **Stateless scripts** -- each invocation is a standalone process. State lives in `~/.8004skill/config.json` and environment variables.

---

## Runtime Flow

### Sequence

```
+------------------+     1. reads      +------------------+
|    AI Agent      | <-----------------+    SKILL.md      |
|  (LLM runtime)  |                    | (8 ops + Update) |
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

### Step-by-step

1. **SKILL.md load** -- The agent reads the skill definition which declares 8 operations plus an Update Agent sub-flow as wizard flows with input schemas, CLI templates, and output formatting rules.
2. **Intent mapping** -- The agent matches user input ("register my agent") to an operation (Operation 2: Register Agent).
3. **Input gathering** -- The agent walks the user through required/optional fields conversationally (name, description, chain, endpoints).
4. **Command construction** -- The agent assembles the CLI invocation internally. Raw commands are never exposed to the user.
5. **Script execution** -- The agent runs `npx tsx scripts/<name>.ts --flag value` in a subprocess. Environment variables (PRIVATE_KEY, PINATA_JWT) are passed through the process environment.
6. **SDK interaction** -- The script instantiates `agent0-sdk` with the provided config and calls the appropriate methods.
7. **On-chain/off-chain** -- SDK handles RPC calls, subgraph queries, IPFS uploads, and the semantic search API.
8. **Output** -- Scripts write JSON results to stdout and progress/errors to stderr.
9. **Presentation** -- The agent parses the JSON and formats it as readable text for the user.

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
  check-env.ts       # Environment preflight (no SDK, uses viem directly)
  register.ts        # Register new agent on-chain
  load-agent.ts      # Load agent details
  update-agent.ts    # Update agent metadata
  search.ts          # Semantic + subgraph search
  feedback.ts        # Submit feedback on-chain
  reputation.ts      # Reputation summary + feedback list
  connect.ts         # Agent discovery and inspection
  wallet.ts          # EIP-712 wallet management
  verify.ts          # EIP-191 identity signing and verification
  keystore.ts        # Interactive encrypted keystore management (user-run, not by agent)
  lib/
    shared.ts        # CLI parsing, validation, SDK config helpers
    keystore.ts      # Encrypted keystore library (AES-256-GCM, PBKDF2)
```

### Shared Library (`scripts/lib/shared.ts`)

Every script imports from `shared.ts`. It provides:

| Export | Purpose |
|--------|---------|
| `parseArgs()` | Converts `--flag value` argv into `Record<string, string>`. Boolean flags (no value) become `"true"`. |
| `requireArg(args, key, label)` | Exits with error if `args[key]` is missing. Returns the value. |
| `parseChainId(raw, fallback)` | Parses chain ID string to number. Default fallback: `11155111` (Sepolia). |
| `parseIntStrict(raw, name)` | Strict integer parse. Exits on NaN. |
| `validateAgentId(id)` | Validates `chainId:tokenId` format via regex `/^\d+:\d+$/`. |
| `validateAddress(addr, name)` | Validates `0x`-prefixed 40-hex-char Ethereum address. |
| `validateIpfsProvider(raw)` | Validates against allowed set: `pinata`, `filecoinPin`, `node`. |
| `buildSdkConfig(opts)` | Builds `SDKConfig` object from CLI args and env vars. Validates IPFS provider dependencies. |
| `exitWithError(message, details?)` | Writes JSON error to stderr and calls `process.exit(1)`. |
| `handleError(err)` | Catch-all for unhandled errors. Delegates to `exitWithError`. |

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
  const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, privateKey, ... }));

  // 4. Call SDK methods
  const agent = await sdk.loadAgent(agentId);

  // 5. Output JSON to stdout
  console.log(JSON.stringify(result, null, 2));
}

// 6. Catch-all error handler
main().catch(handleError);
```

Write operations add:
- PRIVATE_KEY check before SDK instantiation
- Progress reporting to stderr (`{"status":"submitted","txHash":"0x..."}`)
- `waitMined({ timeoutMs: 120_000 })` on transaction handles

### Read vs Write Scripts

```
                  +---------------------------+
                  |      Read Scripts         |
                  |  (no PRIVATE_KEY needed)  |
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
                  |  (PRIVATE_KEY required)   |
                  +---------------------------+
                  | register.ts               |  Mint agent NFT
                  | update-agent.ts           |  Update metadata URI
                  | feedback.ts               |  Submit on-chain feedback
                  | wallet.ts --action set    |  Set wallet (+ WALLET_PRIVATE_KEY)
                  | wallet.ts --action unset  |  Unset wallet
                  | verify.ts --action sign   |  Sign identity proof
                  +---------------------------+
```

Write scripts all follow the same transaction lifecycle:

```
PRIVATE_KEY check -> SDK init -> build tx -> submit ->
  stderr: {"status":"submitted","txHash":"0x..."} ->
  waitMined(120s) -> stdout: result JSON
```

### Script-specific Notes

- **check-env.ts** -- Only script that does not use `agent0-sdk` SDK class. Imports `privateKeyToAddress` from `viem/accounts` directly to derive the signer address.
- **search.ts** -- Dual-mode: semantic search (POST to `https://search.ag0.xyz/api/v1/search`, no SDK needed) or subgraph search (SDK `searchAgents`). Routes based on presence of `--query` flag.
- **wallet.ts** -- Tri-modal (`--action get|set|unset`). The `set` action requires both PRIVATE_KEY (owner) and WALLET_PRIVATE_KEY (for EIP-712 typed signature).
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
--query "..."  ->   POST search.ag0.xyz/api/v1/search     --name "..."  ->  sdk.searchAgents()
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
PRIVATE_KEY (owner)  +  WALLET_PRIVATE_KEY (wallet)
         |                        |
         v                        v
  SDK init with owner    EIP-712 typed signature
         |                        |
         +-------+-------+-------+
                 |
                 v
    agent.setWallet(address, { newWalletPrivateKey })
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
  "registrations": {
    "11155111": {
      "agentId": "11155111:42",
      "txHash": "0xabc...",
      "registeredAt": "2025-01-15T10:30:00Z"
    }
  }
}
```

The config directory `~/.8004skill/` is created with `chmod 700`. The agent manages this file -- scripts do not read it directly. The agent reads the config, extracts values, and passes them as CLI flags.

### Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `PRIVATE_KEY` | register, update-agent, feedback, wallet set/unset | Agent owner private key (0x-prefixed hex) |
| `PINATA_JWT` | register, update-agent, feedback | JWT for Pinata IPFS pinning |
| `FILECOIN_PRIVATE_KEY` | register, update-agent, feedback | Private key for Filecoin pinning |
| `IPFS_NODE_URL` | register, update-agent, feedback | URL of local IPFS node API |
| `WALLET_PRIVATE_KEY` | wallet set | Private key of the wallet to be set (for EIP-712 signature) |
| `SEARCH_API_URL` | search | Override semantic search endpoint (default: `https://search.ag0.xyz/api/v1/search`) |
| `GRAPH_API_KEY` | SDK (subgraph) | The Graph API key for subgraph queries |

### How Config Flows to Scripts

The agent reads `~/.8004skill/config.json` and passes values as CLI args:

```
config.activeChain  ->  --chain-id 11155111
config.rpcUrl       ->  --rpc-url https://rpc.sepolia.org
config.ipfs         ->  --ipfs pinata
```

Environment variables pass through the process environment directly. Some can also be provided as CLI args (e.g., `--pinata-jwt`), with CLI taking precedence.

---

## Security Model

### Principles

1. **No plaintext secrets on disk.** Private keys are passed via environment variables or stored in an encrypted keystore (`~/.8004skill/keystore.json`, AES-256-GCM with PBKDF2-derived keys). Plaintext keys are never written to disk.
2. **Preflight check.** `check-env.ts` runs before every write operation to confirm signer address with the user.
3. **Explicit confirmation.** All on-chain writes require user approval -- the agent shows transaction details and asks before executing.
4. **Opaque execution.** Raw CLI commands are never shown to the user. The agent builds and executes them internally.
5. **Restrictive permissions.** Config directory is `chmod 700`, config file and keystore are `chmod 600`.
6. **Signal hardening.** Write scripts call `initSecurityHardening()` at startup to install signal handlers that wipe sensitive env vars (`PRIVATE_KEY`, `WALLET_PRIVATE_KEY`) on interruption.

### Threat Surface

```
+---------------------+-----------------------------------+-------------------+
| Layer               | Threat                            | Mitigation        |
+---------------------+-----------------------------------+-------------------+
| Environment vars    | Key leakage via process listing   | Short-lived       |
|                     |                                   | processes +       |
|                     |                                   | signal wipe       |
+---------------------+-----------------------------------+-------------------+
| Encrypted keystore  | Brute-force / unauthorized read   | AES-256-GCM,     |
|                     |                                   | PBKDF2, chmod 600 |
+---------------------+-----------------------------------+-------------------+
| Config file         | Unauthorized read                 | chmod 600         |
+---------------------+-----------------------------------+-------------------+
| Script output       | Key in stdout/stderr              | Scripts never     |
|                     |                                   | echo keys         |
+---------------------+-----------------------------------+-------------------+
| On-chain writes     | Unintended transactions           | Preflight check + |
|                     |                                   | user confirmation |
+---------------------+-----------------------------------+-------------------+
| RPC endpoint        | Man-in-the-middle                 | HTTPS endpoints   |
+---------------------+-----------------------------------+-------------------+
| EIP-712 wallet set  | Replay / expired signature        | 300s deadline     |
+---------------------+-----------------------------------+-------------------+
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

- Rating value: integer from -100 to 100 (stored as int128 with 2 decimal places on-chain)
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

| Chain | Chain ID | Status |
|-------|----------|--------|
| Ethereum Mainnet | 1 | Production |
| Ethereum Sepolia | 11155111 | Testnet (default) |
| Base Sepolia | 84532 | Testnet |
| Linea Sepolia | 59141 | Testnet |
| Polygon Amoy | 80002 | Testnet |
| Hedera Testnet | 296 | Testnet |
| HyperEVM Testnet | 998 | Testnet |
| SKALE Sepolia | 1351057110 | Testnet |

The SDK has built-in defaults for Mainnet and Sepolia. Other chains require `registryOverrides` in SDK config.

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

Security rules for key handling, confirmation requirements, and untrusted content policies. The agent reads this to enforce:

- Never showing raw CLI commands to users
- Always confirming before write operations
- Never logging or echoing private keys
- Treating untrusted content (user-provided URLs, IPFS data) safely

### How Scripts Use Reference Data

Scripts do not read reference files directly. The relationship is:

```
reference/chains.md       -> The agent reads -> passes --chain-id, --rpc-url to scripts
reference/sdk-api.md      -> The agent reads -> understands what scripts can do
reference/agent-schema.md -> The agent reads -> formats script JSON output for user
reference/security.md     -> The agent reads -> enforces security rules during operations
```

The SDK itself has built-in chain configs. Reference docs serve as human-readable documentation that the agent uses for contextual understanding and user-facing explanations.
