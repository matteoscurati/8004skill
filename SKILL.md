---
name: 8004skill
description: Use when the user asks to register, search, update, or inspect on-chain agents, give or revoke reputation feedback, manage agent wallets, or verify agent identity on EVM chains via the ERC-8004 protocol. Handles configuration, IPFS metadata, and multi-chain support using agent0-sdk.
metadata: {"npm":{"package":"8004skill","postInstall":"npm install --omit=dev"},"openclaw":{"emoji":"🔗","homepage":"https://github.com/matteoscurati/8004skill","os":["darwin","linux"],"requires":{"bins":["node","npx"]},"install":[{"id":"brew","kind":"brew","formula":"node","bins":["node","npx"],"label":"Install Node.js (brew)"}]}}
---

# 8004skill - ERC-8004 Agent Economy

You are an AI agent interacting with the ERC-8004 protocol for on-chain agent identity, reputation, and discovery. ERC-8004 defines three lightweight registries deployed on EVM chains:

1. **Identity Registry** (ERC-721): Agent IDs as NFTs with IPFS/HTTP metadata
2. **Reputation Registry**: On-chain feedback signals with off-chain enrichment
3. **Validation Registry**: Third-party validator attestations

Global agent ID format: `eip155:{chainId}:{identityRegistryAddress}:{tokenId}` (short form: `{chainId}:{tokenId}`)

Reference files (read as needed):
- `{baseDir}/reference/security.md` — security rules, WalletConnect security model, env var reference (read before any write operation)
- `{baseDir}/reference/chains.md` — supported chains, contract addresses, RPC endpoints
- `{baseDir}/reference/sdk-api.md` — agent0-sdk API surface
- `{baseDir}/reference/agent-schema.md` — ERC-8004 data structures

---

## Auto-Setup

Before executing any operation, verify the project is ready:

1. Check `{baseDir}/node_modules` exists. If missing, run `npm install --prefix {baseDir}`.
2. Ensure config directory exists: `mkdir -p ~/.8004skill && chmod 700 ~/.8004skill`
3. If `~/.8004skill/config.json` does not exist **and** the user requests a **write** operation, trigger **Configure** (Operation 1) before proceeding. Read-only operations work without config.

---

## Chain Resolution

Chain selection is **mandatory** for every operation (read and write). Resolve the chain before executing any script:

1. **Agent ID prefix**: If the user provides an agent ID like `11155111:42`, derive the chain ID from the prefix (`11155111`) and look up the RPC from `{baseDir}/reference/chains.md`.
2. **Config file**: If `~/.8004skill/config.json` exists and has `activeChain`, use it — but confirm to the user which chain is active (e.g., "Using Sepolia (11155111) from your config").
3. **Ask the user**: If neither of the above applies, ask the user to choose from the supported chains listed in `{baseDir}/reference/chains.md`. Do not default silently.

---

## Operations Menu

When the user asks about ERC-8004, agent registration, agent discovery, or anything related to this skill, present this menu:

| # | Operation | Type | Requires WalletConnect |
|---|-----------|------|----------------------|
| 1 | Configure | Setup | No |
| 2 | Register Agent | Write | Yes |
| 3 | Load Agent | Read | No |
| 4 | Search Agents | Read | No |
| 5 | Give Feedback | Write | Yes |
| 6 | Inspect Agent (Reputation + Connect) | Read | No |
| 7 | Wallet Management | Read/Write | Set/Unset only |
| 8 | Verify Identity | Read/Write | Sign only |
| 9 | Whoami | Read | No (Sign optional) |

### Common Patterns

**Write prerequisites** — all write operations (Register, Update, Feedback, Wallet set/unset, Verify sign) require:
1. Config loaded from `~/.8004skill/config.json` (run Configure if missing)
2. Active WalletConnect session (run `wc-pair.ts` if no session)
3. Preflight check via `check-env.ts` to confirm connected wallet address
4. User confirmation before submitting the transaction

**WalletConnect signing** — all write operations use WalletConnect v2 to sign transactions. The agent never holds private keys — signing happens in the user's wallet app (MetaMask, Rainbow, etc.). The user will receive a push notification or pop-up in their wallet app to review and approve each transaction.

**Pairing display** — when a script emits `{ "status": "pairing", "uri": "wc:..." }` on stderr, extract the `uri` field and present it to the user in a fenced code block. Tell the user: "Scan the QR code in the tool output, or copy the URI below and paste it in your wallet app (MetaMask → WalletConnect → Paste URI)." The QR code may be truncated in collapsed tool output, so always include the URI text as a fallback.

**Secret handling (mandatory):**
- **NEVER** ask, accept, or prompt the user to type/paste a private key, mnemonic, seed phrase, or password in the chat. Refuse immediately if offered — chat history is stored and secrets would be permanently exposed.
- **NEVER** display or echo a private key or password in any response.
- If a user accidentally pastes a secret, warn them immediately that it is now in the session history and should be considered compromised. Instruct them to rotate the key.

### Trust Labels

Derive a trust label from reputation `count` and `averageValue`. Evaluate top-to-bottom; first match wins:

| Label | Condition | Emoji |
|-------|-----------|-------|
| Untrusted | count >= 5, avg < -50 | 🔴 |
| Caution | avg < 0 | 🟠 |
| Highly Trusted | count >= 20, avg >= 80 | ⭐ |
| Trusted | count >= 10, avg >= 70 | 🟢 |
| Established | count >= 5, avg >= 50 | 🟢 |
| Emerging | count > 0, count < 5 | 🔵 |
| No Data | count = 0 | ⚪ |

Format: {emoji} {label} -- {averageValue}/100 ({count} reviews)

---

## Operation 1: Configure

**Triggered by**: "configure 8004", "set up chain", "change RPC", "set IPFS provider", first-time use, or when config is missing.

### Steps

1. **Read existing config** from `~/.8004skill/config.json` (if it exists). Show current settings.

2. **Ask which chain** to use. Show supported chains from `{baseDir}/reference/chains.md`:
   - Ethereum Mainnet (1) — full SDK support
   - Polygon Mainnet (137) — built-in subgraph, requires registry overrides
   - Base (8453), BSC (56), Monad (143), Scroll (534352), Gnosis (100), Arbitrum (42161), Celo (42220), Taiko (167000) — mainnets, require env var overrides
   - Ethereum Sepolia (11155111) — full SDK support, recommended for testing
   - Base Sepolia (84532), BSC Chapel (97), Monad Testnet (10143), Scroll Testnet (534351), Arbitrum Sepolia (421614), Celo Alfajores (44787), Polygon Amoy (80002) — testnets, require env var overrides
   - Planned (not yet deployed): Linea Sepolia (59141), Hedera Testnet (296), HyperEVM Testnet (998), SKALE Base Sepolia (1351057110)

3. **Ask for RPC URL**. Suggest public defaults from `{baseDir}/reference/chains.md`.
   If the chain is NOT Mainnet (1) or Sepolia (11155111): warn that the SDK lacks built-in registry addresses for this chain. The user must set `REGISTRY_ADDRESS_IDENTITY` and `REGISTRY_ADDRESS_REPUTATION`. Polygon (137) has a built-in subgraph URL but still requires registry overrides. All other chains also need `SUBGRAPH_URL`.

4. **Ask about IPFS provider** (optional, needed for registration/updates):
   - `pinata` - needs `PINATA_JWT` env var
   - `filecoinPin` - needs `FILECOIN_PRIVATE_KEY` env var
   - `node` - needs `IPFS_NODE_URL` env var
   - none (skip if user doesn't plan to register)

   Environment variables can be set in the shell or in `~/.8004skill/.env` (see `.env.example` for a template). Shell variables take precedence.

5. **Ask about WalletConnect project ID** (optional). The skill ships with a default project ID, but users can provide their own from [cloud.walletconnect.com](https://cloud.walletconnect.com) (free). Can be set via `WC_PROJECT_ID` env var or stored in config.

6. **Save config** to `~/.8004skill/config.json` with chmod 600:
   ```json
   { "activeChain": <chainId>, "rpcUrl": "<rpcUrl>", "ipfs": "<provider or null>", "wcProjectId": "<projectId or omit for default>", "registrations": {} }
   ```

7. **Pair wallet** (recommended for write operations). Run: `npx tsx {baseDir}/scripts/wc-pair.ts --chain-id <chainId>`. A QR code will appear in the terminal — the user scans it with their wallet app (MetaMask, Rainbow, etc.) to establish a session. Sessions last ~7 days.

8. **Run preflight check**: `npx tsx {baseDir}/scripts/check-env.ts`
   Show: WalletConnect session status, connected address, configured env vars, any warnings.

### Error Handling
- If config directory can't be created, warn and continue (in-memory for session).
- If no WalletConnect session is active, inform the user they'll need to pair a wallet for write operations. Run `wc-pair.ts`.
- "Project not found": The WalletConnect project ID is invalid or revoked. Ask the user to verify their project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com) and update it via the Configure operation or `WC_PROJECT_ID` env var.

---

## Operation 2: Register Agent

**Triggered by**: "register agent", "create agent", "register on-chain", "mint agent NFT".

> **Best practices**: Read [Registration.md](https://github.com/erc-8004/best-practices/blob/main/Registration.md) and [ERC8004SPEC.md](https://github.com/erc-8004/best-practices/blob/main/src/ERC8004SPEC.md) before collecting inputs. Follow the Four Golden Rules: (1) write a clear name, encourage an image, write a detailed description with capabilities and pricing; (2) encourage at least one endpoint (MCP or A2A); (3) strongly recommend OASF skills/domains; (4) include ERC-8004 registration details in metadata.

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

> **OASF taxonomy**: Use [agntcy/oasf](https://github.com/agntcy/oasf) as the canonical slug source. Proactively suggest relevant skills/domains based on the agent's description.

9. **x402 support** (optional, default: false)
10. **IPFS provider** - use from config, or ask. Alternatively ask if they want HTTP URI instead.

### Confirmation

Show: Chain, Signer, Name, Description, MCP endpoint, A2A endpoint, OASF Skills, OASF Domains, x402 support, IPFS provider, Estimated gas (~150k). Ask: "Proceed with registration?"

### Execution

```
npx tsx {baseDir}/scripts/register.ts \
  --chain-id <chainId> --rpc-url <rpcUrl> --name "<name>" --description "<description>" \
  --ipfs <provider> [--mcp-endpoint <url>] [--a2a-endpoint <url>] \
  [--active true|false] [--image <url>] [--skills "slug1,slug2"] [--domains "slug1,slug2"] \
  [--validate-oasf true|false] [--x402 true]
```

For HTTP registration, use `--http-uri <uri>` instead of `--ipfs`. Script outputs progress to stderr and result to stdout.

### Result

Show: agentId (`{chainId}:{tokenId}`), txHash (link to block explorer), metadata URI. Save to config under `registrations.<chainId>`.

### Error Handling
- "insufficient funds": Need native token for gas. Suggest faucets for testnets.
- "No connected account": WalletConnect session not active. Run `wc-pair.ts` to connect.
- "User rejected": User declined the transaction in their wallet app.
- IPFS errors: Check corresponding env var is set and valid.
- Timeout (120s): Transaction submitted but mining slow. Provide txHash for manual check.

---

## Operation 3: Load Agent

**Triggered by**: "load agent", "show agent", "get agent details", "agent info".

### Input
**Agent ID** (required, format `chainId:tokenId`). Chain selection required (see Chain Resolution above).

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

Chain selection required for subgraph search (see Chain Resolution above). Semantic search works without RPC; chain ID is optional for filtering.

### Input

1. **Search query** (natural language) - semantic search
2. Or **structured filters**: name substring, MCP-only / A2A-only, active only, specific chain or all chains
3. **Advanced filters** (optional):
   - OASF: `--oasf-skills`, `--oasf-domains`, `--has-oasf`
   - Endpoints: `--has-web`, `--has-endpoints`, `--has-registration-file`, `--web-contains`, `--mcp-contains`, `--a2a-contains`, `--ens-contains`, `--did-contains`
   - Capabilities: `--mcp-tools`, `--mcp-prompts`, `--mcp-resources`, `--a2a-skills`, `--supported-trust`
   - Identity: `--description`, `--agent-ids` (CSV), `--owners` (CSV), `--operators` (CSV), `--wallet-address`
   - Status: `--x402-support`, `--keyword`
   - Time: `--registered-from` / `--registered-to`, `--updated-from` / `--updated-to`
   - Metadata: `--has-metadata-key`, `--metadata-key` + `--metadata-value`
   - Feedback: `--has-feedback`, `--has-no-feedback`, `--min-feedback-value` / `--max-feedback-value`, `--min-feedback-count` / `--max-feedback-count`, `--feedback-reviewers` (CSV), `--feedback-endpoint`, `--has-feedback-response`, `--feedback-tag`, `--feedback-tag1` / `--feedback-tag2`, `--include-revoked-feedback`
   - Sort & semantic: `--sort "field:dir"`, `--semantic-min-score`, `--semantic-top-k`
4. **Result limit** (default: 10, semantic search only via `--limit`)

### Execution

**Semantic search:**
```
npx tsx {baseDir}/scripts/search.ts --query "<query>" [--chain-id <chainId>] [--mcp-only] [--a2a-only] [--limit <n>]
```

**Subgraph search** (structured filters, requires RPC):
```
npx tsx {baseDir}/scripts/search.ts --chain-id <chainId> --rpc-url <rpcUrl> [--name "<name>"] [--mcp-only] [--a2a-only] [--active true] [--chains all] [--has-oasf true] [--oasf-skills "slug1,slug2"] [--oasf-domains "slug1,slug2"] [--has-web true] [--has-endpoints true] [--keyword "text"] [--description "semantic text"] [--owners "0x..."] [--wallet-address "0x..."] [--has-feedback true] [--min-feedback-value 50] [--sort "name:asc"] [--semantic-min-score 0.7] [--semantic-top-k 50]
```

### Result

Format as table: #, Agent ID, Name, MCP, A2A, Description. Offer follow-ups: load details, check reputation, or connect.

### Error Handling
- Search service unavailable: Fall back to subgraph search if RPC is configured.
- No results: Suggest broadening query or trying different filters.

---

## Operation 5: Give Feedback

**Triggered by**: "give feedback", "rate agent", "review agent", "leave feedback".

> **Best practices**: Read [Reputation.md](https://github.com/erc-8004/best-practices/blob/main/Reputation.md) before guiding the user. Standard tags: `starred`, `reachable`, `uptime`, `successRate`, `responseTime`, `revenues`, `tradingYield` — suggest appropriate ones based on context. Star-to-scale: 1★=20, 2★=40, 3★=60, 4★=80, 5★=100; negative feedback uses values below 0. Remind the user to submit from their registered agentWallet.

### Prerequisites
Standard write prerequisites apply (see above).

### Input

1. **Agent ID** (required) - offer to search if unknown
2. **Rating value** (required) - number from -100 to 100 (decimals allowed, e.g., 99.77, -3.2)
3. **Tags** (optional, up to 2) - e.g., `starred`, `reachable`, `uptime`, `successRate`, `responseTime`, `revenues`, `tradingYield`, or custom tags like "quality", "reliability"
4. **Text feedback** (optional) - requires IPFS provider for off-chain file
5. **Endpoint** (optional) - for endpoint-specific feedback

### Confirmation

Show: Target Agent, Rating, Tags, Text, Signer, Chain. Ask: "Submit this feedback on-chain?"

### Execution

```
npx tsx {baseDir}/scripts/feedback.ts \
  --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> --value <value> \
  [--tag1 <tag>] [--tag2 <tag>] [--text "<text>"] [--endpoint <url>] \
  [--capability <cap>] [--tool-name <tool>] [--skill <skill>] [--task <task>] \
  [--ipfs <provider>]
```

### Result
Show: txHash, reviewer address, rating submitted, tags.

### Revoke Feedback

Input: **Agent ID** and **Feedback index** (0-based). Confirm before executing.

```
npx tsx {baseDir}/scripts/feedback.ts \
  --action revoke --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> --feedback-index <index>
```

Result: txHash and confirmation that feedback was revoked.

### Respond to Feedback

Input: **Agent ID**, **Client Address** (reviewer), **Feedback Index** (0-based), **Response URI** (IPFS or HTTP), **Response Hash** (content hash). Confirm before executing.

```
npx tsx {baseDir}/scripts/respond-feedback.ts \
  --agent-id <agentId> --client-address <reviewerAddress> --feedback-index <index> \
  --response-uri <uri> --response-hash <hash> --chain-id <chainId> --rpc-url <rpcUrl>
```

Result: txHash, agentId, feedbackIndex, responseUri.

### Error Handling
- "insufficient funds": Need gas tokens.
- Value out of range: Must be -100 to 100.
- Agent not found: Verify agent ID and chain.
- Invalid feedback index: Must be a non-negative integer.

---

## Operation 6: Inspect Agent (Reputation + Connect)

**Triggered by**: "check reputation", "view reputation", "connect to agent", "inspect agent", "how good is agent X".

> **Interpreting reputation**: See [Reputation.md](https://github.com/erc-8004/best-practices/blob/main/Reputation.md) for tag types, the 0-100 scale, and feedback context.

### Input
**Agent ID** (required). Chain selection required (see Chain Resolution above).

### Execution

Run both scripts:

```
npx tsx {baseDir}/scripts/connect.ts --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl>
```
```
npx tsx {baseDir}/scripts/reputation.ts --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> [--tags "starred,reachable"] [--capabilities "nlp"] [--skills "summarize"] [--tasks "task1"] [--names "agent1"] [--include-revoked true] [--min-value 50] [--max-value 100]
```

### Result

Show: agent name/ID, active status, trust label with rating (e.g., "🟢 Trusted — 82/100 (15 reviews)"), recent feedback table (Reviewer, Rating, Tags, Text). Also show OASF skills/domains and web/email endpoints when available from search results.

If MCP endpoint exists, show endpoint URL, tools list, and MCP config snippet (`{"mcpServers":{"<name>":{"url":"<endpoint>"}}}`). If A2A endpoint exists, show agent card URL and skills.

### Error Handling
- Agent not found: Check agent ID and chain.
- Reputation data unavailable: Agent may have no feedback yet.

---

## Operation 7: Wallet Management

**Triggered by**: "set wallet", "get wallet", "unset wallet", "agent wallet", "manage wallet".

### Prerequisites
1. Load config. For `get`: chain selection required (see Chain Resolution above).
2. For `set`/`unset`: standard write prerequisites apply (see above).
3. For `set`, wallet signature flow:
   - **Standard flow**: signing via WalletConnect
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
npx tsx {baseDir}/scripts/wallet.ts \
  --action set --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> \
  --wallet-address <address> [--signature <eip712Signature>]
```

**Unset:**
```
npx tsx {baseDir}/scripts/wallet.ts \
  --action unset --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl>
```

### Result
- **Get**: "Wallet for {agentId}: {address || 'not set'}"
- **Set**: "Wallet set to {address}. Transaction: {txHash}"
- **Unset**: "Wallet unset. Transaction: {txHash}"

### Error Handling
- "No connected account": WalletConnect session not active. Run `wc-pair.ts` to connect.
- "User rejected": User declined the transaction in their wallet app.
- "Wallet already set to this address": No transaction needed.
- Ownership errors: Only the agent owner can set/unset the wallet.

---

## Operation 8: Verify Identity

**Triggered by**: "verify agent", "prove identity", "sign challenge", "is this agent real", "verify signature".

Uses the ERC-8004 identity verification pattern: look up the agent's on-chain wallet, sign or verify a message against it.

### Prerequisites
- **Sign**: write prerequisites apply (WalletConnect session required). **Verify**: read-only. Chain selection required (see Chain Resolution above).

### Sign (prove own identity)

**Input**: Agent ID (required), Message (optional — auto-generates `erc8004:verify:{agentId}:{nonce}:{timestamp}` if omitted).

**Confirmation**: Show agent, signer address, on-chain wallet, wallet match, message. Ask: "Sign this message to prove identity?"

**Execution:**
```
npx tsx {baseDir}/scripts/verify.ts \
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

**Result**: Show verified (true/false), agent, on-chain wallet, active status, reputation summary with trust label (e.g., "🟢 Trusted — 82/100 (15 reviews)"), warnings. If `verified: false`, explain the signature doesn't match the registered wallet — not necessarily fraud, but identity cannot be confirmed.

### Error Handling
- **No wallet set**: Suggest using Operation 7 to set one first.
- **Agent not found**: Check agent ID and chain.
- **Invalid signature format**: Must be 0x-prefixed hex.
- Verification failure is a normal result, not an error.

---

## Operation 9: Whoami

**Triggered by**: "whoami", "my agents", "who am I", "my identity", "my agent status".

Chain selection required (see Chain Resolution above).

### Input

Resolve agent ID from one of:
1. Config `registrations` -- if config exists, show registered agents and let user pick
2. User provides agent ID directly
3. User provides wallet address -- search for agents owned by that address

If no registrations in config and no agent ID provided, ask the user for an agent ID or wallet address.

### Execution

Run sequentially:
1. `load-agent.ts`
2. `reputation.ts`
3. `wallet.ts --action get`

If a WalletConnect session is active, also run:
4. `verify.ts --action sign`

### Result

Present as a single card:
- **Agent**: {name} ({agentId})
- **Status**: Active / Inactive
- **Trust**: {trustLabel}
- **Wallet**: {address} or "not set"
- **Owners**: {owners}
- **Endpoints**: MCP `<url>` / none, A2A `<url>` / none, Web `<url>` / none
- **Identity Proof**: if signed, "Verified (wallet match: {walletMatch})"; otherwise "Not signed (connect wallet via wc-pair.ts to prove ownership)"

### Error Handling
- Agent not found: Check agent ID and chain.

---

## Update Agent (sub-flow)

**Triggered by**: "update agent", "edit agent", "change agent name", "add MCP endpoint to my agent".

> **Best practices**: Same as Operation 2 — follow the Four Golden Rules from [Registration.md](https://github.com/erc-8004/best-practices/blob/main/Registration.md) and use [agntcy/oasf](https://github.com/agntcy/oasf) for OASF slugs.

### Prerequisites
Standard write prerequisites apply (see above). Additionally: IPFS provider must be configured.

### Input
1. **Agent ID** (required)
2. Fields to change: Name, Description, MCP endpoint (add/change/remove), A2A endpoint (add/change/remove), ENS name (add/remove), Trust model configuration, Active status, Image, OASF Skills, OASF Domains, x402 support, Metadata (set/delete keys)

### Confirmation
Show what will change (old → new). Ask to proceed.

### Execution

```
npx tsx {baseDir}/scripts/update-agent.ts \
  --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> --ipfs <provider> \
  [--name "<newName>"] [--description "<newDescription>"] [--image <url>] \
  [--mcp-endpoint <url>] [--a2a-endpoint <url>] [--ens-endpoint <name.eth>] [--active true|false] \
  [--remove-mcp] [--remove-a2a] [--remove-ens] \
  [--trust "reputation,crypto-economic,tee-attestation"] \
  [--skills "slug1,slug2"] [--domains "slug1,slug2"] \
  [--remove-skills "slug1,slug2"] [--remove-domains "slug1,slug2"] \
  [--validate-oasf true|false] [--x402 true|false] [--metadata '{"key":"value"}'] [--del-metadata "key1,key2"] \
  [--http-uri <uri>]
```
