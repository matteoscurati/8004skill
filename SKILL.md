---
name: 8004skill
description: Use when the user asks to register, search, update, or inspect on-chain agents, give or revoke reputation feedback, manage agent wallets, or verify agent identity on EVM chains via the ERC-8004 protocol. Handles configuration, IPFS metadata, and multi-chain support using agent0-sdk.
metadata: {"openclaw":{"emoji":"🔗","homepage":"https://github.com/matteoscurati/8004skill","os":["darwin","linux"],"requires":{"bins":["node","npx"]},"install":[{"id":"brew","kind":"brew","formula":"node","bins":["node","npx"],"label":"Install Node.js (brew)"}]}}
---

# 8004skill - ERC-8004 Agent Economy

You are an AI agent interacting with the ERC-8004 protocol for on-chain agent identity, reputation, and discovery. ERC-8004 defines three lightweight registries deployed on EVM chains:

1. **Identity Registry** (ERC-721): Agent IDs as NFTs with IPFS/HTTP metadata
2. **Reputation Registry**: On-chain feedback signals with off-chain enrichment
3. **Validation Registry**: Third-party validator attestations

Global agent ID format: `eip155:{chainId}:{identityRegistryAddress}:{tokenId}` (short form: `{chainId}:{tokenId}`)

Reference files (read as needed):
- `{baseDir}/reference/security.md` — security rules, private key threat model, env var reference (read before any write operation)
- `{baseDir}/reference/chains.md` — supported chains, contract addresses, RPC endpoints
- `{baseDir}/reference/sdk-api.md` — agent0-sdk API surface
- `{baseDir}/reference/agent-schema.md` — ERC-8004 data structures

---

## Auto-Setup

Before executing any operation, verify the project is ready:

1. Check `{baseDir}/node_modules` exists. If missing, run `npm install --prefix {baseDir}`.
2. Ensure config directory exists: `mkdir -p ~/.8004skill && chmod 700 ~/.8004skill`
3. If `~/.8004skill/config.json` does not exist, trigger **Configure** (Operation 1) before proceeding.

---

## Operations Menu

When the user asks about ERC-8004, agent registration, agent discovery, or anything related to this skill, present this menu:

| # | Operation | Type | Requires PRIVATE_KEY |
|---|-----------|------|---------------------|
| 1 | Configure | Setup | No |
| 2 | Register Agent | Write | Yes |
| 3 | Load Agent | Read | No |
| 4 | Search Agents | Read | No |
| 5 | Give Feedback | Write | Yes |
| 6 | Inspect Agent (Reputation + Connect) | Read | No |
| 7 | Wallet Management | Read/Write | Set/Unset only |
| 8 | Verify Identity | Read/Write | Sign only |

### Common Patterns

**Write prerequisites** — all write operations (Register, Update, Feedback, Wallet set/unset, Verify sign) require:
1. Config loaded from `~/.8004skill/config.json` (run Configure if missing)
2. Preflight check via `check-env.ts` to confirm signer address
3. Explicit `--chain-id` (no default fallback for writes)
4. User confirmation before submitting the transaction

**Chain ID / RPC URL resolution** — unless stated otherwise, derive chain ID from the agent ID prefix or config, and RPC URL from config (ask if missing).

---

## Operation 1: Configure

**Triggered by**: "configure 8004", "set up chain", "change RPC", "set IPFS provider", first-time use, or when config is missing.

### Steps

1. **Read existing config** from `~/.8004skill/config.json` (if it exists). Show current settings.

2. **Ask which chain** to use. Show supported chains from `{baseDir}/reference/chains.md`:
   - Ethereum Mainnet (1) — full SDK support
   - Ethereum Sepolia (11155111) — full SDK support, recommended for testing
   - Base Sepolia (84532), Linea Sepolia (59141), Polygon Amoy (80002), Hedera Testnet (296), HyperEVM Testnet (998), SKALE Sepolia (1351057110) — all require env var overrides

3. **Ask for RPC URL**. Suggest public defaults from `{baseDir}/reference/chains.md`.
   If the chain is NOT Mainnet (1) or Sepolia (11155111): warn that the SDK lacks built-in addresses for this chain. The user must set `REGISTRY_ADDRESS_IDENTITY`, `REGISTRY_ADDRESS_REPUTATION`, and `SUBGRAPH_URL`.

4. **Ask about IPFS provider** (optional, needed for registration/updates):
   - `pinata` - needs `PINATA_JWT` env var
   - `filecoinPin` - needs `FILECOIN_PRIVATE_KEY` env var
   - `node` - needs `IPFS_NODE_URL` env var
   - none (skip if user doesn't plan to register)

5. **Save config** to `~/.8004skill/config.json` with chmod 600:
   ```json
   { "activeChain": <chainId>, "rpcUrl": "<rpcUrl>", "ipfs": "<provider or null>", "registrations": {} }
   ```

6. **Ask about encrypted keystore** (optional, recommended). Explain that the AES-256-GCM keystore avoids shell history exposure. If interested, instruct the user to run: `npx tsx {baseDir}/scripts/keystore.ts --action import`. After import, write operations only need `KEYSTORE_PASSWORD` instead of `PRIVATE_KEY`.

7. **Run preflight check**: `npx tsx {baseDir}/scripts/check-env.ts`
   Show: signer address, keystore status, configured env vars, any warnings.

### Error Handling
- If config directory can't be created, warn and continue (in-memory for session).
- If neither PRIVATE_KEY nor keystore is configured, inform the user they'll need one for write operations. Suggest the encrypted keystore.

---

## Operation 2: Register Agent

**Triggered by**: "register agent", "create agent", "register on-chain", "mint agent NFT".

### Prerequisites
Standard write prerequisites apply (see above). Additionally: IPFS provider must be configured.

### Input

Ask step by step:
1. **Agent name** (required)
2. **Agent description** (required)
3. **MCP endpoint URL** (optional)
4. **A2A endpoint URL** (optional)
5. **Image URL** (optional)
6. **Active status** (default: true)
7. **OASF Skills** (optional) - comma-separated slugs (e.g., `natural_language_processing/summarization`)
8. **OASF Domains** (optional) - comma-separated slugs (e.g., `finance_and_business/investment_services`)
9. **x402 support** (optional, default: false)
10. **IPFS provider** - use from config, or ask. Alternatively ask if they want HTTP URI instead.

### Confirmation

Show: Chain, Signer, Name, Description, MCP endpoint, A2A endpoint, OASF Skills, OASF Domains, x402 support, IPFS provider, Estimated gas (~150k). Ask: "Proceed with registration?"

### Execution

```
PRIVATE_KEY="$PRIVATE_KEY" npx tsx {baseDir}/scripts/register.ts \
  --chain-id <chainId> --rpc-url <rpcUrl> --name "<name>" --description "<description>" \
  --ipfs <provider> [--pinata-jwt "$PINATA_JWT"] [--mcp-endpoint <url>] [--a2a-endpoint <url>] \
  [--active true|false] [--image <url>] [--skills "slug1,slug2"] [--domains "slug1,slug2"] \
  [--validate-oasf true|false] [--x402 true]
```

For HTTP registration, use `--http-uri <uri>` instead of `--ipfs`. Script outputs progress to stderr and result to stdout.

### Result

Show: agentId (`{chainId}:{tokenId}`), txHash (link to block explorer), metadata URI. Save to config under `registrations.<chainId>`.

### Error Handling
- "insufficient funds": Need native token for gas. Suggest faucets for testnets.
- "PRIVATE_KEY environment variable is required": Tell user to set `PRIVATE_KEY`.
- IPFS errors: Check corresponding env var is set and valid.
- Timeout (120s): Transaction submitted but mining slow. Provide txHash for manual check.

---

## Operation 3: Load Agent

**Triggered by**: "load agent", "show agent", "get agent details", "agent info".

### Input
**Agent ID** (required, format `chainId:tokenId`). Resolve chain ID and RPC URL per common pattern.

### Execution

```
npx tsx {baseDir}/scripts/load-agent.ts --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl>
```

### Result
Show: name, agentId, description, active status, endpoints (MCP, A2A, ENS), MCP tools, A2A skills, wallet address, owners. If the user wants to edit, transition to the Update Agent sub-flow.

### Error Handling
- Agent not found: Suggest checking chain ID or searching first.
- RPC errors: Suggest a different RPC endpoint.

---

## Operation 4: Search Agents

**Triggered by**: "search agents", "find agents", "discover agents", "agents that do X".

Config is optional (semantic search works without RPC; subgraph search requires it).

### Input

1. **Search query** (natural language) - semantic search
2. Or **structured filters**: name substring, MCP-only / A2A-only, active only, specific chain or all chains
3. **Result limit** (default: 10)

### Execution

**Semantic search:**
```
npx tsx {baseDir}/scripts/search.ts --query "<query>" [--chain-id <chainId>] [--mcp-only] [--a2a-only] [--limit <n>]
```

**Subgraph search** (structured filters, requires RPC):
```
npx tsx {baseDir}/scripts/search.ts --chain-id <chainId> --rpc-url <rpcUrl> [--name "<name>"] [--mcp-only] [--a2a-only] [--active true] [--chains all] [--limit <n>]
```

### Result

Format as table: #, Agent ID, Name, MCP, A2A, Description. Offer follow-ups: load details, check reputation, or connect.

### Error Handling
- Search service unavailable: Fall back to subgraph search if RPC is configured.
- No results: Suggest broadening query or trying different filters.

---

## Operation 5: Give Feedback

**Triggered by**: "give feedback", "rate agent", "review agent", "leave feedback".

### Prerequisites
Standard write prerequisites apply (see above).

### Input

1. **Agent ID** (required) - offer to search if unknown
2. **Rating value** (required) - number from -100 to 100 (decimals allowed, e.g., 99.77, -3.2)
3. **Tags** (optional, up to 2) - e.g., "quality", "reliability", "speed", "accuracy", "helpfulness"
4. **Text feedback** (optional) - requires IPFS provider for off-chain file
5. **Endpoint** (optional) - for endpoint-specific feedback

### Confirmation

Show: Target Agent, Rating, Tags, Text, Signer, Chain. Ask: "Submit this feedback on-chain?"

### Execution

```
PRIVATE_KEY="$PRIVATE_KEY" npx tsx {baseDir}/scripts/feedback.ts \
  --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> --value <value> \
  [--tag1 <tag>] [--tag2 <tag>] [--text "<text>"] [--ipfs <provider>] [--pinata-jwt "$PINATA_JWT"]
```

### Result
Show: txHash, reviewer address, rating submitted, tags.

### Revoke Feedback

Input: **Agent ID** and **Feedback index** (0-based). Confirm before executing.

```
PRIVATE_KEY="$PRIVATE_KEY" npx tsx {baseDir}/scripts/feedback.ts \
  --action revoke --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> --feedback-index <index>
```

Result: txHash and confirmation that feedback was revoked.

### Error Handling
- "insufficient funds": Need gas tokens.
- Value out of range: Must be -100 to 100.
- Agent not found: Verify agent ID and chain.
- Invalid feedback index: Must be a non-negative integer.

---

## Operation 6: Inspect Agent (Reputation + Connect)

**Triggered by**: "check reputation", "view reputation", "connect to agent", "inspect agent", "how good is agent X".

### Input
**Agent ID** (required). Resolve chain ID and RPC URL per common pattern.

### Execution

Run both scripts:

```
npx tsx {baseDir}/scripts/connect.ts --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl>
```
```
npx tsx {baseDir}/scripts/reputation.ts --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl>
```

### Result

Show: agent name/ID, active status, rating (average/100 with review count), recent feedback table (Reviewer, Rating, Tags, Text).

If MCP endpoint exists, show endpoint URL, tools list, and MCP config snippet (`{"mcpServers":{"<name>":{"url":"<endpoint>"}}}`). If A2A endpoint exists, show agent card URL and skills.

### Error Handling
- Agent not found: Check agent ID and chain.
- Reputation data unavailable: Agent may have no feedback yet.

---

## Operation 7: Wallet Management

**Triggered by**: "set wallet", "get wallet", "unset wallet", "agent wallet", "manage wallet".

### Prerequisites
1. Load config.
2. For `set`/`unset`: standard write prerequisites apply (see above).
3. For `set`, wallet signature flow:
   - **One-wallet flow**: wallet = signer → no `WALLET_PRIVATE_KEY` needed
   - **Two-wallet flow**: wallet ≠ signer → `WALLET_PRIVATE_KEY` env var required
   - **Pre-signed flow**: `--signature` flag with pre-generated EIP-712 signature

### Input
1. **Action**: get, set, or unset
2. **Agent ID** (required)
3. **Wallet address** (required for `set`)

### Confirmation (set/unset only)
Show: Action, Agent, Wallet address (for set), Signer, Flow type. Ask: "Proceed?"

### Execution

**Get:** `npx tsx {baseDir}/scripts/wallet.ts --action get --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl>`

**Set:**
```
PRIVATE_KEY="$PRIVATE_KEY" [WALLET_PRIVATE_KEY="$WALLET_PRIVATE_KEY"] npx tsx {baseDir}/scripts/wallet.ts \
  --action set --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> \
  --wallet-address <address> [--signature <eip712Signature>]
```

**Unset:**
```
PRIVATE_KEY="$PRIVATE_KEY" npx tsx {baseDir}/scripts/wallet.ts \
  --action unset --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl>
```

### Result
- **Get**: "Wallet for {agentId}: {address || 'not set'}"
- **Set**: "Wallet set to {address}. Transaction: {txHash}"
- **Unset**: "Wallet unset. Transaction: {txHash}"

### Error Handling
- "WALLET_PRIVATE_KEY" not set: Required only for two-wallet flow. Not needed for one-wallet or pre-signed flow.
- "Wallet already set to this address": No transaction needed.
- Ownership errors: Only the agent owner can set/unset the wallet.

---

## Operation 8: Verify Identity

**Triggered by**: "verify agent", "prove identity", "sign challenge", "is this agent real", "verify signature".

Uses the ERC-8004 identity verification pattern: look up the agent's on-chain wallet, sign or verify a message against it.

### Prerequisites
- **Sign**: write prerequisites apply. **Verify**: read-only (no private key needed).
- Resolve chain ID and RPC URL per common pattern.

### Sign (prove own identity)

**Input**: Agent ID (required), Message (optional — auto-generates `erc8004:verify:{agentId}:{nonce}:{timestamp}` if omitted).

**Confirmation**: Show agent, signer address, on-chain wallet, wallet match, message. Ask: "Sign this message to prove identity?"

**Execution:**
```
PRIVATE_KEY="$PRIVATE_KEY" npx tsx {baseDir}/scripts/verify.ts \
  --action sign --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> [--message "<message>"]
```

**Result**: Show signature, signer, wallet match (warn if false), message.

### Verify (check another agent's identity)

**Input**: Agent ID (required), Signature (required, 0x-prefixed hex), Message (required).

**Execution:**
```
npx tsx {baseDir}/scripts/verify.ts \
  --action verify --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> \
  --signature <signature> --message "<message>"
```

**Result**: Show verified (true/false), agent, on-chain wallet, active status, reputation summary, warnings. If `verified: false`, explain the signature doesn't match the registered wallet — not necessarily fraud, but identity cannot be confirmed.

### Error Handling
- **No wallet set**: Suggest using Operation 7 to set one first.
- **Agent not found**: Check agent ID and chain.
- **Invalid signature format**: Must be 0x-prefixed hex.
- Verification failure is a normal result, not an error.

---

## Update Agent (sub-flow)

**Triggered by**: "update agent", "edit agent", "change agent name", "add MCP endpoint to my agent".

### Prerequisites
Standard write prerequisites apply (see above). Additionally: IPFS provider must be configured.

### Input
1. **Agent ID** (required)
2. Fields to change: Name, Description, MCP endpoint (add/change/remove), A2A endpoint (add/change/remove), Active status, Image, OASF Skills, OASF Domains, x402 support, Metadata (set/delete keys)

### Confirmation
Show what will change (old → new). Ask to proceed.

### Execution

```
PRIVATE_KEY="$PRIVATE_KEY" npx tsx {baseDir}/scripts/update-agent.ts \
  --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> --ipfs <provider> \
  [--pinata-jwt "$PINATA_JWT"] [--name "<newName>"] [--description "<newDescription>"] \
  [--mcp-endpoint <url>] [--a2a-endpoint <url>] [--active true|false] \
  [--remove-mcp] [--remove-a2a] [--skills "slug1,slug2"] [--domains "slug1,slug2"] \
  [--remove-skills "slug1,slug2"] [--remove-domains "slug1,slug2"] \
  [--validate-oasf true|false] [--x402 true|false] [--metadata '{"key":"value"}'] [--del-metadata "key1,key2"]
```
