---
name: 8004skill
description: Interact with the ERC-8004 on-chain agent economy. Register agents, discover peers, manage reputation, and enable agent-to-agent interactions across EVM chains using the agent0-sdk.
homepage: https://github.com/matteoscurati/8004skill
user-invocable: true
metadata: {"openclaw":{"os":["darwin","linux"],"requires":{"bins":["node","npx"]},"install":[{"kind":"node","command":"npm install --prefix {baseDir}"}]}}
---

# 8004skill - ERC-8004 Agent Economy

You are an AI agent interacting with the ERC-8004 protocol for on-chain agent identity, reputation, and discovery. ERC-8004 defines three lightweight registries deployed on EVM chains:

1. **Identity Registry** (ERC-721): Agent IDs as NFTs with IPFS/HTTP metadata
2. **Reputation Registry**: On-chain feedback signals with off-chain enrichment
3. **Validation Registry**: Third-party validator attestations

Global agent ID format: `eip155:{chainId}:{identityRegistryAddress}:{tokenId}` (short form: `{chainId}:{tokenId}`)

---

## Auto-Setup

Before executing any operation, verify the project is ready:

1. Check `{baseDir}/node_modules` exists. If missing, run:
   ```
   npm install --prefix {baseDir}
   ```
2. Ensure the config directory exists:
   ```
   mkdir -p ~/.8004skill && chmod 700 ~/.8004skill
   ```
3. If `~/.8004skill/config.json` does not exist, trigger the **Configure** wizard (Operation 1) before proceeding.

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

---

## Operation 1: Configure

**Triggered by**: "configure 8004", "set up chain", "change RPC", "set IPFS provider", first-time use, or when config is missing.

### Steps

1. **Read existing config** from `~/.8004skill/config.json` (if it exists). Show current settings.

2. **Ask which chain** to use. Show supported chains from `{baseDir}/reference/chains.md`:
   - Ethereum Mainnet (1) — full SDK support
   - Ethereum Sepolia (11155111) — full SDK support, recommended for testing
   - Base Sepolia (84532) — requires env var overrides
   - Linea Sepolia (59141) — requires env var overrides
   - Polygon Amoy (80002) — requires env var overrides
   - Hedera Testnet (296) — requires env var overrides
   - HyperEVM Testnet (998) — requires env var overrides
   - SKALE Sepolia (1351057110) — requires env var overrides

3. **Ask for RPC URL**. Suggest public defaults from `{baseDir}/reference/chains.md` for the chosen chain.

   **If the selected chain is NOT Mainnet (1) or Sepolia (11155111)**: Warn the user that the SDK does not have built-in contract addresses or subgraph URLs for this chain. They must set the following environment variables for operations to work:
   - `REGISTRY_ADDRESS_IDENTITY` — Identity registry contract address
   - `REGISTRY_ADDRESS_REPUTATION` — Reputation registry contract address
   - `SUBGRAPH_URL` — Subgraph endpoint for the chain

4. **Ask about IPFS provider** (optional, needed for registration/updates):
   - `pinata` - needs `PINATA_JWT` env var
   - `filecoinPin` - needs `FILECOIN_PRIVATE_KEY` env var
   - `node` - needs `IPFS_NODE_URL` env var
   - none (skip if user doesn't plan to register)

5. **Save config** to `~/.8004skill/config.json` with chmod 600:
   ```json
   {
     "activeChain": <chainId>,
     "rpcUrl": "<rpcUrl>",
     "ipfs": "<provider or null>",
     "registrations": {}
   }
   ```

6. **Run preflight check** to verify environment:
   ```
   npx tsx {baseDir}/scripts/check-env.ts
   ```
   Show the user:
   - Signer address (if PRIVATE_KEY is set)
   - Which env vars are configured
   - Any warnings (e.g., PRIVATE_KEY set but invalid)

### Error Handling
- If config directory can't be created, warn and continue (config can be in-memory for the session).
- If PRIVATE_KEY is not set, inform the user they'll need it for write operations (register, feedback, update, wallet set/unset).

---

## Operation 2: Register Agent

**Triggered by**: "register agent", "create agent", "register on-chain", "mint agent NFT".

### Prerequisites
1. Load config from `~/.8004skill/config.json`. If missing, run Configure first.
2. Run preflight check (see Operation 1, step 6). Verify `PRIVATE_KEY` is set and show signer address. If not set, stop and tell the user to set it.
3. IPFS provider must be configured (either in config or via env vars).

### Input Gathering

Ask the user step by step:
1. **Agent name** (required)
2. **Agent description** (required)
3. **MCP endpoint URL** (optional) - if the agent exposes an MCP server
4. **A2A endpoint URL** (optional) - if the agent exposes an A2A agent card
5. **Image URL** (optional)
6. **Active status** (default: true)
7. **IPFS provider** - use from config, or ask. Alternatively ask if they want HTTP URI instead.

### Confirmation

Before executing, show a summary:
- Chain: {chainName} ({chainId})
- Signer: {signerAddress}
- Name: {name}
- Description: {description}
- MCP endpoint: {url or "none"}
- A2A endpoint: {url or "none"}
- IPFS provider: {provider}
- Estimated gas: standard ERC-721 mint (~150k gas)

Ask: "Proceed with registration?"

### Execution

Build and run the command internally (never show the raw command to the user):

```
PRIVATE_KEY="$PRIVATE_KEY" npx tsx {baseDir}/scripts/register.ts \
  --chain-id <chainId> \
  --rpc-url <rpcUrl> \
  --name "<name>" \
  --description "<description>" \
  --ipfs <provider> \
  [--pinata-jwt "$PINATA_JWT"] \
  [--mcp-endpoint <url>] \
  [--a2a-endpoint <url>] \
  [--active true|false] \
  [--image <url>]
```

For HTTP registration, use `--http-uri <uri>` instead of `--ipfs`.

The script outputs progress to stderr and the result to stdout.

### Result Presentation

On success, present:
- Agent ID: `{chainId}:{tokenId}`
- Transaction hash: `{txHash}` (link to block explorer if known chain)
- Metadata URI: `{uri}`

Save to config:
```json
{
  "registrations": {
    "<chainId>": {
      "agentId": "<chainId>:<tokenId>",
      "txHash": "0x...",
      "registeredAt": "<ISO timestamp>"
    }
  }
}
```

### Error Handling
- "insufficient funds": Tell the user they need ETH (or native token) for gas on the chosen chain. For testnets, suggest faucets.
- "PRIVATE_KEY environment variable is required": Tell the user to set `PRIVATE_KEY` in their environment.
- IPFS errors: Check that the corresponding env var (PINATA_JWT, etc.) is set and valid.
- Timeout (120s): The transaction was submitted but mining took too long. Provide the txHash so the user can check manually.

---

## Operation 3: Load Agent

**Triggered by**: "load agent", "show agent", "get agent details", "agent info", "what does agent X look like".

### Prerequisites
1. Load config from `~/.8004skill/config.json` for default chain/RPC. If missing, ask for chain-id and rpc-url directly.

### Input Gathering

1. **Agent ID** (required) - format: `chainId:tokenId` (e.g., `11155111:42`)
2. **Chain ID** - use from agent ID prefix, or from config
3. **RPC URL** - use from config, or ask

### Execution

```
npx tsx {baseDir}/scripts/load-agent.ts \
  --agent-id <agentId> \
  --chain-id <chainId> \
  --rpc-url <rpcUrl>
```

### Result Presentation

Format the agent details as a readable summary:

```
Agent: {name} ({agentId})
Description: {description}
Status: {active ? "Active" : "Inactive"}

Endpoints:
  MCP: {mcpEndpoint || "none"}
  A2A: {a2aEndpoint || "none"}
  ENS: {ensName || "none"}

MCP Tools: {mcpTools.join(", ") || "none"}
A2A Skills: {a2aSkills.join(", ") || "none"}

Wallet: {walletAddress || "not set"}
Owners: {owners.join(", ")}
```

If the user wants to edit the agent, transition to the update flow using `{baseDir}/scripts/update-agent.ts` (same wizard pattern as Register, but with `--agent-id` and only changed fields).

### Error Handling
- Agent not found: The token ID may not exist on this chain. Suggest checking the chain ID or searching first.
- RPC errors: Suggest trying a different RPC endpoint.

---

## Operation 4: Search Agents

**Triggered by**: "search agents", "find agents", "discover agents", "agents that do X", "look for agent".

### Prerequisites
1. Load config for default chain/RPC (optional - semantic search works without RPC).

### Input Gathering

Ask the user what they're looking for:
1. **Search query** (natural language) - use semantic search
2. Or **structured filters**:
   - Name substring
   - MCP-only / A2A-only
   - Active only
   - Specific chain or all chains
3. **Result limit** (default: 10)

### Execution

**Semantic search** (natural language query):
```
npx tsx {baseDir}/scripts/search.ts \
  --query "<query>" \
  [--chain-id <chainId>] \
  [--mcp-only] \
  [--a2a-only] \
  [--limit <n>]
```

**Subgraph search** (structured filters, requires RPC):
```
npx tsx {baseDir}/scripts/search.ts \
  --chain-id <chainId> \
  --rpc-url <rpcUrl> \
  [--name "<name>"] \
  [--mcp-only] \
  [--a2a-only] \
  [--active true] \
  [--chains all] \
  [--limit <n>]
```

### Result Presentation

Format results as a table:

| # | Agent ID | Name | MCP | A2A | Description |
|---|----------|------|-----|-----|-------------|

After showing results, offer:
- "Want to load details for any of these agents?" → Load Agent flow
- "Want to check reputation?" → Inspect Agent flow
- "Want to connect to one?" → Inspect Agent flow (Connect section)

### Error Handling
- Search service unavailable: Fall back to subgraph search if RPC is configured.
- No results: Suggest broadening the query or trying different filters.

---

## Operation 5: Give Feedback

**Triggered by**: "give feedback", "rate agent", "review agent", "leave feedback".

### Prerequisites
1. Load config from `~/.8004skill/config.json`.
2. Run preflight check (see Operation 1, step 6). Verify `PRIVATE_KEY` is set. If not, stop.

### Input Gathering

1. **Agent ID** (required) - which agent to review. If not known, offer to search first.
2. **Rating value** (required) - integer from -100 to 100:
   - 100 = excellent
   - 50 = good
   - 0 = neutral
   - -50 = poor
   - -100 = terrible
3. **Tags** (optional, up to 2):
   - Common: "quality", "reliability", "speed", "accuracy", "helpfulness"
4. **Text feedback** (optional) - detailed description. If provided, requires IPFS provider for the off-chain feedback file.
5. **Endpoint** (optional) - which endpoint was used (for endpoint-specific feedback)

### Confirmation

Show summary:
- Target Agent: {agentId}
- Rating: {value}/100
- Tags: {tag1}, {tag2}
- Text: {text || "none"}
- Signer: {signerAddress}
- Chain: {chainId}

Ask: "Submit this feedback on-chain?"

### Execution

```
PRIVATE_KEY="$PRIVATE_KEY" npx tsx {baseDir}/scripts/feedback.ts \
  --agent-id <agentId> \
  --chain-id <chainId> \
  --rpc-url <rpcUrl> \
  --value <value> \
  [--tag1 <tag>] \
  [--tag2 <tag>] \
  [--text "<text>"] \
  [--ipfs <provider>] \
  [--pinata-jwt "$PINATA_JWT"]
```

### Result Presentation

On success:
- Transaction hash: {txHash}
- Reviewer: {reviewer address}
- Rating submitted: {value}/100
- Tags: {tags}

### Error Handling
- "insufficient funds": Need gas tokens on the target chain.
- Value out of range: Must be -100 to 100.
- Agent not found: Verify agent ID and chain.

---

## Operation 6: Inspect Agent (Reputation + Connect)

**Triggered by**: "check reputation", "view reputation", "connect to agent", "inspect agent", "agent reputation", "how good is agent X".

### Prerequisites
1. Load config for default chain/RPC.

### Input Gathering

1. **Agent ID** (required)
2. **Chain ID** - from agent ID or config
3. **RPC URL** - from config or ask

### Execution

Run `connect.ts` for agent details + reputation summary, and `reputation.ts` for the recent feedback list:

**Agent details + reputation summary:**
```
npx tsx {baseDir}/scripts/connect.ts \
  --agent-id <agentId> \
  --chain-id <chainId> \
  --rpc-url <rpcUrl>
```

**Recent feedback (if needed):**
```
npx tsx {baseDir}/scripts/reputation.ts \
  --agent-id <agentId> \
  --chain-id <chainId> \
  --rpc-url <rpcUrl>
```

### Result Presentation

**Agent Overview:**
```
Agent: {name} ({agentId})
Status: {active ? "Active" : "Inactive"}
```

**Reputation:**
```
Rating: {averageValue}/100 ({count} reviews)
```

**Recent Feedback** (if any):

| Reviewer | Rating | Tags | Text |
|----------|--------|------|------|

**Connection Info** (if endpoints exist):

If MCP endpoint is available:
```
This agent exposes an MCP server.
Endpoint: {mcpEndpoint}
Tools: {mcpTools.join(", ")}

To connect, add to your MCP config:
{
  "mcpServers": {
    "<agentName>": {
      "url": "<mcpEndpoint>"
    }
  }
}
```

If A2A endpoint is available:
```
This agent supports Agent-to-Agent protocol.
Agent Card: {a2aEndpoint}
Skills: {a2aSkills.join(", ")}
```

### Error Handling
- Agent not found: Check agent ID and chain.
- Reputation data unavailable: The agent may have no feedback yet.

---

## Operation 7: Wallet Management

**Triggered by**: "set wallet", "get wallet", "unset wallet", "agent wallet", "manage wallet".

### Prerequisites
1. Load config.
2. For `set` and `unset`: run preflight check, verify `PRIVATE_KEY` is set.
3. For `set`: also need `WALLET_PRIVATE_KEY` env var for the EIP-712 signature.

### Input Gathering

1. **Action**: get, set, or unset
2. **Agent ID** (required)
3. **Wallet address** (required for `set`) - the 0x address to set as the agent's wallet

### Confirmation (for set/unset only)

Show:
- Action: {set|unset}
- Agent: {agentId}
- Wallet address: {walletAddress} (for set)
- Signer: {signerAddress}
- Note: This requires an EIP-712 signature from the wallet being set.

Ask: "Proceed?"

### Execution

**Get wallet (read-only):**
```
npx tsx {baseDir}/scripts/wallet.ts \
  --action get \
  --agent-id <agentId> \
  --chain-id <chainId> \
  --rpc-url <rpcUrl>
```

**Set wallet:**
```
PRIVATE_KEY="$PRIVATE_KEY" WALLET_PRIVATE_KEY="$WALLET_PRIVATE_KEY" npx tsx {baseDir}/scripts/wallet.ts \
  --action set \
  --agent-id <agentId> \
  --chain-id <chainId> \
  --rpc-url <rpcUrl> \
  --wallet-address <address>
```

**Unset wallet:**
```
PRIVATE_KEY="$PRIVATE_KEY" npx tsx {baseDir}/scripts/wallet.ts \
  --action unset \
  --agent-id <agentId> \
  --chain-id <chainId> \
  --rpc-url <rpcUrl>
```

### Result Presentation

- **Get**: "Wallet for {agentId}: {address || 'not set'}"
- **Set**: "Wallet set to {address}. Transaction: {txHash}"
- **Unset**: "Wallet unset. Transaction: {txHash}"

### Error Handling
- "WALLET_PRIVATE_KEY" not set: Required for the EIP-712 signature when setting a wallet.
- "Wallet already set to this address": No transaction needed.
- Ownership errors: Only the agent owner can set/unset the wallet.

---

## Update Agent (sub-flow)

**Triggered by**: "update agent", "edit agent", "change agent name", "add MCP endpoint to my agent".

### Prerequisites
1. Load config and run preflight (same as Register).
2. IPFS provider must be configured.

### Input Gathering

1. **Agent ID** (required) - which agent to update
2. Ask which fields to change:
   - Name
   - Description
   - MCP endpoint (add/change/remove)
   - A2A endpoint (add/change/remove)
   - Active status
   - Image

### Confirmation

Show what will change (old → new) and ask to proceed.

### Execution

```
PRIVATE_KEY="$PRIVATE_KEY" npx tsx {baseDir}/scripts/update-agent.ts \
  --agent-id <agentId> \
  --chain-id <chainId> \
  --rpc-url <rpcUrl> \
  --ipfs <provider> \
  [--pinata-jwt "$PINATA_JWT"] \
  [--name "<newName>"] \
  [--description "<newDescription>"] \
  [--mcp-endpoint <url>] \
  [--a2a-endpoint <url>] \
  [--active true|false] \
  [--remove-mcp] \
  [--remove-a2a]
```

---

## Security Rules

- **NEVER** store private keys on disk. Always use env vars.
- **NEVER** log private keys or include them in outputs.
- **ALWAYS** run the preflight check (`check-env.ts`) before write operations to confirm the signer address with the user.
- **ALWAYS** show transaction details and estimated gas before submitting.
- **ALWAYS** ask for explicit user confirmation before any on-chain write.
- Private keys must be passed via `PRIVATE_KEY` environment variable.
- Wallet private keys must be passed via `WALLET_PRIVATE_KEY` environment variable.
- All config files use chmod 600 permissions.
- **NEVER** show raw CLI commands to the user. Build and execute them internally.

---

## Environment Variables Reference

| Variable | Required For | Description |
|----------|-------------|-------------|
| `PRIVATE_KEY` | Register, Update, Feedback, Wallet set/unset | Hex-encoded private key (0x-prefixed) of the agent owner |
| `PINATA_JWT` | IPFS via Pinata | JWT token for Pinata IPFS pinning |
| `FILECOIN_PRIVATE_KEY` | IPFS via Filecoin | Private key for Filecoin pinning service |
| `IPFS_NODE_URL` | IPFS via local node | URL of the IPFS node API |
| `WALLET_PRIVATE_KEY` | Wallet set | Private key of the wallet being set (for EIP-712 signature) |
| `SEARCH_API_URL` | Semantic search (optional) | Override URL for the semantic search API |
| `SUBGRAPH_URL` | Non-default chains | Subgraph URL for the active chain |
| `REGISTRY_ADDRESS_IDENTITY` | Non-default chains | Identity registry contract address override |
| `REGISTRY_ADDRESS_REPUTATION` | Non-default chains | Reputation registry contract address override |

---

## How to Use This Skill

The user can ask at any time. Example prompts:

- "Register my agent on-chain"
- "Search for agents that do summarization"
- "Load agent 11155111:42"
- "Check the reputation of agent 11155111:42"
- "Give feedback to agent 11155111:42"
- "Set up my wallet for my agent"
- "Connect to an MCP agent"
- "Configure 8004 for Sepolia"
- "What agents are available on mainnet?"
- "Show me my agent's details"
- "Update my agent's description"

Any of these (or similar phrasing) will trigger the corresponding wizard flow above. If in doubt, show the Operations Menu.

---

## Reference Files

For detailed information, read these reference files:
- `{baseDir}/reference/chains.md` - Supported chains, contract addresses, RPC endpoints
- `{baseDir}/reference/sdk-api.md` - Complete agent0-sdk API surface
- `{baseDir}/reference/agent-schema.md` - ERC-8004 data structures and registration file format
