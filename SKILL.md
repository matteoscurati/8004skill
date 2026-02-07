---
name: 8004skill
description: Use when the user asks to register, search, update, or inspect on-chain agents, manage reputation feedback, agent wallets, or verify identity on EVM chains via ERC-8004.
metadata: {"npm":{"package":"8004skill","postInstall":"npm install --omit=dev"},"openclaw":{"emoji":"🔗","homepage":"https://github.com/matteoscurati/8004skill","os":["darwin","linux"],"requires":{"bins":["node","npx"]},"install":[{"id":"brew","kind":"brew","formula":"node","bins":["node","npx"],"label":"Install Node.js (brew)"}]}}
---

# 8004skill - ERC-8004 Agent Economy

ERC-8004 defines three registries on EVM chains: **Identity** (ERC-721 NFTs with IPFS/HTTP metadata), **Reputation** (on-chain feedback), and **Validation** (third-party attestations). Agent ID format: `{chainId}:{tokenId}`.

Reference files (read as needed):
- `{baseDir}/reference/security.md` — security rules, WalletConnect model, env vars (read before any write operation)
- `{baseDir}/reference/chains.md` — supported chains, RPC endpoints
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

Chain selection is **mandatory** for every operation. Resolve before executing any script:

1. **Agent ID prefix**: derive chain from `11155111:42` → chain `11155111`, look up RPC from `{baseDir}/reference/chains.md`.
2. **Config file**: if `~/.8004skill/config.json` has `activeChain`, use it — confirm to user which chain is active.
3. **Ask the user**: if neither applies, ask the user to choose from supported chains. Do not default silently.

---

## Operations Menu

| # | Operation | Type | WC Required |
|---|-----------|------|-------------|
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

**Write prerequisites** — Config loaded → WalletConnect session (run `wc-pair.ts` if needed) → preflight check (`check-env.ts`) → user confirmation. All signing via WalletConnect v2 — the agent never holds private keys.

**Pairing display** — when a script emits `{ "status": "pairing", "uri": "wc:..." }` on stderr, show the URI in a fenced code block. Tell user: "Scan the QR code or copy the URI and paste in your wallet app."

**Secret handling** — see security.md. Never accept/display private keys, mnemonics, or passwords in chat. Warn immediately if accidentally pasted.

### Trust Labels

Derive from reputation `count` and `averageValue` (first match wins):
Untrusted 🔴 (count>=5, avg<-50) · Caution 🟠 (avg<0) · Highly Trusted ⭐ (count>=20, avg>=80) · Trusted 🟢 (count>=10, avg>=70) · Established 🟢 (count>=5, avg>=50) · Emerging 🔵 (count>0, count<5) · No Data ⚪ (count=0)
Format: {emoji} {label} -- {averageValue}/100 ({count} reviews)

### Common Errors

These errors apply across write operations — only operation-specific errors are listed per operation:
- **insufficient funds**: Need native token for gas. Suggest faucets for testnets.
- **No connected account**: WalletConnect session not active. Run `wc-pair.ts`.
- **User rejected**: User declined transaction in wallet app.
- **Agent not found**: Verify agent ID and chain.
- **RPC errors**: Suggest a different RPC endpoint.
- **Timeout (120s)**: Transaction submitted but mining slow. Provide txHash.

---

## Operation 1: Configure

**Triggered by**: "configure 8004", "set up chain", "change RPC", "set IPFS provider", first-time use.

### Steps

1. **Read existing config** from `~/.8004skill/config.json` (if exists). Show current settings.

2. **Ask which chain**. Show supported chains from `{baseDir}/reference/chains.md`:
   - Ethereum Mainnet (1) — full SDK support
   - Ethereum Sepolia (11155111) — full SDK support, recommended for testing
   - Polygon Mainnet (137) — partial SDK support (subgraph built-in, registry via env vars)

3. **Ask for RPC URL**. Suggest public defaults from `{baseDir}/reference/chains.md`.
   If Polygon (137): warn that registry addresses must be set via env vars.

4. **Ask about IPFS provider** (optional): `pinata` (needs `PINATA_JWT`), `filecoinPin` (needs `FILECOIN_PRIVATE_KEY`), `node` (needs `IPFS_NODE_URL`), or none.
   Env vars can be set in shell or `~/.8004skill/.env` (see `.env.example`). Shell takes precedence.

5. **WalletConnect project ID** (optional). Default provided; users can set their own via `WC_PROJECT_ID` env var or config.

6. **Save config** to `~/.8004skill/config.json` (chmod 600):
   ```json
   { "activeChain": <chainId>, "rpcUrl": "<rpcUrl>", "ipfs": "<provider or null>", "wcProjectId": "<projectId or omit>", "registrations": {} }
   ```

7. **Pair wallet** (recommended for write ops): `npx tsx {baseDir}/scripts/wc-pair.ts --chain-id <chainId>`

8. **Run preflight check**: `npx tsx {baseDir}/scripts/check-env.ts`

### Error Handling
- Config directory can't be created: warn and continue (in-memory for session).
- "Project not found": WalletConnect project ID invalid. Verify at cloud.walletconnect.com.

---

## Operation 2: Register Agent

**Triggered by**: "register agent", "create agent", "mint agent NFT".

> **Best practices**: Read [Registration.md](https://github.com/erc-8004/best-practices/blob/main/Registration.md) and [ERC8004SPEC.md](https://github.com/erc-8004/best-practices/blob/main/src/ERC8004SPEC.md). Four Golden Rules: (1) clear name, detailed description with capabilities/pricing; (2) at least one endpoint (MCP or A2A); (3) OASF skills/domains; (4) ERC-8004 registration details in metadata.

### Prerequisites
Write prerequisites + IPFS provider configured.

### Input

Ask step by step: **name** (required), **description** (required), **MCP endpoint** (optional), **A2A endpoint** (optional), **image URL** (optional), **active status** (default: true), **OASF skills** (comma-separated slugs, optional), **OASF domains** (optional), **x402 support** (default: false), **IPFS provider** (from config, or HTTP URI alternative).

> **OASF taxonomy**: Use [agntcy/oasf](https://github.com/agntcy/oasf) as slug source. Proactively suggest relevant skills/domains.

### Confirmation
Show: Chain, Signer, Name, Description, endpoints, OASF, x402, IPFS provider, estimated gas (~150k). Ask: "Proceed?"

### Execution

```
npx tsx {baseDir}/scripts/register.ts \
  --chain-id <chainId> --rpc-url <rpcUrl> --name "<name>" --description "<description>" \
  --ipfs <provider> [--mcp-endpoint <url>] [--a2a-endpoint <url>] [--active true|false] \
  [--image <url>] [--skills "slug1,slug2"] [--domains "slug1,slug2"] \
  [--validate-oasf true|false] [--x402 true] [--http-uri <uri>]
```

### Result
Show: agentId (`{chainId}:{tokenId}`), txHash (link to explorer), metadata URI. Save to config `registrations.<chainId>`.

### Error Handling
- IPFS errors: Check corresponding env var is set and valid.

---

## Operation 3: Load Agent

**Triggered by**: "load agent", "show agent", "get agent details".

### Execution

```
npx tsx {baseDir}/scripts/load-agent.ts --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl>
```

Input: **Agent ID** (`chainId:tokenId`). Show: name, agentId, description, active status, endpoints, MCP tools, A2A skills, wallet, owners. Offer Update Agent if user wants to edit.

---

## Operation 4: Search Agents

**Triggered by**: "search agents", "find agents", "discover agents", "agents that do X".

Chain selection required for subgraph search. Semantic search works without RPC.

### Input

1. **Search query** (natural language) — semantic search
2. Or **structured filters**: name, MCP-only/A2A-only, active only, chain
3. **Advanced filters**: See `SearchFilters` in sdk-api.md. Pass as `--<filter-name> <value>` flags.
4. **Result limit** (default: 10, semantic search via `--limit`)

### Execution

**Semantic**: `npx tsx {baseDir}/scripts/search.ts --query "<query>" [--chain-id <chainId>] [--mcp-only] [--a2a-only] [--limit <n>]`

**Subgraph**: `npx tsx {baseDir}/scripts/search.ts --chain-id <chainId> --rpc-url <rpcUrl> [--<filter> <value>]`

### Result
Table: #, Agent ID, Name, MCP, A2A, Description. Offer follow-ups: load details, check reputation, connect.

### Error Handling
- Search service unavailable: Fall back to subgraph search if RPC configured.
- No results: Suggest broadening query.

---

## Operation 5: Give Feedback

**Triggered by**: "give feedback", "rate agent", "review agent".

> **Best practices**: Read [Reputation.md](https://github.com/erc-8004/best-practices/blob/main/Reputation.md). Standard tags: `starred`, `reachable`, `uptime`, `successRate`, `responseTime`, `revenues`, `tradingYield`. Star-to-scale: 1★=20, 2★=40, 3★=60, 4★=80, 5★=100; negative uses values below 0.

### Input

**Agent ID**, **rating** (-100 to 100, decimals allowed), **tags** (optional, up to 2), **text** (optional, needs IPFS), **endpoint** (optional).

### Confirmation
Show: Target Agent, Rating, Tags, Text, Signer, Chain. Ask: "Submit?"

### Execution

```
npx tsx {baseDir}/scripts/feedback.ts \
  --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> --value <value> \
  [--tag1 <tag>] [--tag2 <tag>] [--text "<text>"] [--endpoint <url>] \
  [--capability <cap>] [--tool-name <tool>] [--skill <skill>] [--task <task>] [--ipfs <provider>]
```

### Result
Show: txHash, reviewer address, rating, tags.

### Revoke / Respond

**Revoke**: `npx tsx {baseDir}/scripts/feedback.ts --action revoke --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> --feedback-index <index>`

**Respond**: `npx tsx {baseDir}/scripts/respond-feedback.ts --agent-id <agentId> --client-address <reviewer> --feedback-index <index> --response-uri <uri> --response-hash <hash> --chain-id <chainId> --rpc-url <rpcUrl>`

Both require confirmation. Revoke result: txHash. Respond result: txHash, agentId, feedbackIndex, responseUri.

### Error Handling
- Value out of range: Must be -100 to 100.
- Invalid feedback index: Must be non-negative integer.

---

## Operation 6: Inspect Agent (Reputation + Connect)

**Triggered by**: "check reputation", "inspect agent", "how good is agent X".

### Execution

```
npx tsx {baseDir}/scripts/connect.ts --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl>
```
```
npx tsx {baseDir}/scripts/reputation.ts --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> [--tags "t1,t2"] [--capabilities "c"] [--skills "s"] [--tasks "t"] [--names "n"] [--include-revoked true] [--min-value N] [--max-value N]
```

### Result
Show: agent name/ID, active status, trust label with rating, recent feedback table (Reviewer, Rating, Tags, Text), OASF skills/domains, web/email endpoints. If MCP endpoint: show URL, tools, config snippet. If A2A: show agent card URL and skills.

---

## Operation 7: Wallet Management

**Triggered by**: "set wallet", "get wallet", "unset wallet", "agent wallet".

For `set`/`unset`: write prerequisites apply. For `set`: standard signing via WC, or `--signature` for pre-signed EIP-712.

**Get:** `npx tsx {baseDir}/scripts/wallet.ts --action get --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl>`

**Set:** `npx tsx {baseDir}/scripts/wallet.ts --action set --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> --wallet-address <addr> [--signature <sig>]`

**Unset:** `npx tsx {baseDir}/scripts/wallet.ts --action unset --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl>`

Confirmation (set/unset): Show action, agent, wallet address, signer. Result: wallet address or txHash.

### Error Handling
- "Wallet already set to this address": No transaction needed.
- Ownership errors: Only agent owner can set/unset.

---

## Operation 8: Verify Identity

**Triggered by**: "verify agent", "prove identity", "sign challenge".

### Sign (prove own identity)

Input: **Agent ID**, **message** (optional — auto-generates `erc8004:verify:{agentId}:{nonce}:{timestamp}`).
Confirmation: Show agent, signer, on-chain wallet, wallet match, message.

```
npx tsx {baseDir}/scripts/verify.ts --action sign --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> [--message "<msg>"]
```

Result: signature, signer, wallet match, message.

### Verify (check another agent)

Input: **Agent ID**, **signature** (0x hex), **message**.

```
npx tsx {baseDir}/scripts/verify.ts --action verify --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> --signature <sig> --message "<msg>"
```

Result: verified (true/false), agent, on-chain wallet, active status, reputation with trust label. If false: signature doesn't match registered wallet.

### Error Handling
- No wallet set: Use Operation 7 first.
- Invalid signature format: Must be 0x-prefixed hex.

---

## Operation 9: Whoami

**Triggered by**: "whoami", "my agents", "who am I".

Resolve agent ID from: config `registrations`, user-provided ID, or wallet address search.

### Execution

Run sequentially: `load-agent.ts`, `reputation.ts`, `wallet.ts --action get`. If WC session active: also `verify.ts --action sign`.

### Result

Card: **Agent** (name + ID), **Status**, **Trust** (label), **Wallet**, **Owners**, **Endpoints** (MCP/A2A/Web), **Identity Proof** (verified or "connect wallet via wc-pair.ts").

---

## Update Agent (sub-flow)

**Triggered by**: "update agent", "edit agent", "change agent name", "add MCP endpoint".

Write prerequisites + IPFS provider. Best practices same as Register (Operation 2).

Input: **Agent ID** + fields to change (name, description, endpoints, OASF, active, image, x402, trust, metadata). Show old → new. Ask to proceed.

```
npx tsx {baseDir}/scripts/update-agent.ts \
  --agent-id <agentId> --chain-id <chainId> --rpc-url <rpcUrl> --ipfs <provider> \
  [--name "<name>"] [--description "<desc>"] [--image <url>] \
  [--mcp-endpoint <url>] [--a2a-endpoint <url>] [--ens-endpoint <name.eth>] [--active true|false] \
  [--remove-mcp] [--remove-a2a] [--remove-ens] \
  [--trust "reputation,crypto-economic,tee-attestation"] \
  [--skills "s1,s2"] [--domains "d1,d2"] [--remove-skills "s1"] [--remove-domains "d1"] \
  [--validate-oasf true|false] [--x402 true|false] \
  [--metadata '{"key":"value"}'] [--del-metadata "k1,k2"] [--http-uri <uri>]
```
