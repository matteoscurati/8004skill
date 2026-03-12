# Answer Examples

> As of agent0-sdk v1.6.0, March 2026.

Model responses for common queries. Use these as templates for consistent, informative answers.


##1. "What is ERC-8004?"

Structure: Spec -> Implementation -> Open Questions

```
ERC-8004 defines three on-chain registries for AI agents on EVM chains:

- **Identity Registry** (ERC-721): Each agent is an NFT with a metadata URI pointing to its profile (name, description, endpoints, capabilities).
- **Reputation Registry**: On-chain feedback (-100 to 100) from any address, with tags and optional text.
- **Validation Registry**: Third-party attestations from designated validators.

Agents are identified by `{chainId}:{tokenId}`. Contracts are deployed at deterministic addresses across 18+ chains via CREATE2.

The protocol is live on 5 fully-indexed chains (Ethereum, Sepolia, Polygon, Base, Base Sepolia) with additional deployed mainnets and testnets available via manual config. See `chains.md` for the full list.
```


##2. "Search for MCP agents"

Structure: Execute search -> Table results -> Follow-up offers

```
[Execute: npx tsx scripts/search.ts --chain-id 8453 --mcp-only true --active true]

Found 4 agents on Base with MCP endpoints:

| # | Agent ID | Name | Description |
|---|----------|------|-------------|
| 1 | `8453:12` | `Code Reviewer` | `Automated code review via MCP` |
| 2 | `8453:28` | `Data Analyst` | `SQL query generation and analysis` |
| ... | | | |

Would you like to:
- **Load details** for a specific agent?
- **Check reputation** of any of these agents?
- **Refine the search** with additional filters?
```


##3. "Register an agent"

Structure: Step-by-step with confirmation

```
Let's register your agent. I'll need a few details:

1. **Name**: What should your agent be called?
2. **Description**: What does it do? (Be specific -- this helps discovery)
3. **MCP endpoint** (optional): URL to your MCP server
4. **A2A endpoint** (optional): URL to your agent card
5. **OASF skills/domains** (optional): Taxonomy slugs from agntcy/oasf

[After gathering info, show confirmation:]

**Registration Summary**
- **Chain**: Base (8453)
- **Signer**: 0xABC...123
- **Name**: My Agent
- **Description**: Provides code review via MCP
- **MCP**: https://mcp.example.com
- **IPFS**: Pinata
- **Est. gas**: ~150k

Proceed with registration?
```


##4. "Check reputation of agent 8453:12"

Structure: Trust label -> Stats -> Recent feedback table

```
[Execute reputation.ts + connect.ts]

**Agent**: Code Reviewer (`8453:12`)
⭐ Highly Trusted -- 87/100 (24 reviews)

| # | Reviewer | Rating | Tags | Date |
|---|----------|--------|------|------|
| 1 | `0xABC...` | 95 | starred, reachable | 2026-02-28 |
| 2 | `0xDEF...` | 80 | uptime | 2026-02-25 |
| ... | | | | |

**Endpoints**: MCP (https://mcp.example.com) -- 3 tools available
**OASF**: code-review, static-analysis

Would you like to give feedback or connect to this agent's MCP endpoint?
```


##5. "What chains are supported?"

Structure: Tiered list (full -> deployed -> note)

```
**Full SDK Support** (built-in subgraph, works out of the box):
- Ethereum Mainnet (1)
- Ethereum Sepolia (11155111) -- recommended for testing
- Polygon Mainnet (137)
- Base Mainnet (8453)
- Base Sepolia (84532) -- testing

**Deployed Chains** (contracts deployed, requires `SUBGRAPH_URL` config):
Arbitrum (42161), Optimism (10), Avalanche (43114), BSC (56), Monad (143), Scroll (534352), Gnosis (100), Celo (42220), Taiko (167000), Linea (59144), MegaETH (4326), Abstract (2741), Mantle (5000)

Plus corresponding testnets. See `chains.md` for RPCs and full details.
```


##6. "I'm getting 'insufficient funds' when registering on Sepolia"

Structure: Diagnose -> Fix -> Verify

```
That error means your connected wallet doesn't have enough Sepolia ETH to cover gas fees for the registration transaction.

**Diagnosis**
- Error: `insufficient funds for gas * price + value`
- Chain: Ethereum Sepolia (11155111)
- Cause: Your wallet's Sepolia ETH balance is zero or too low to cover the estimated ~150k gas.

**Fix**
1. Get free Sepolia ETH from a faucet: https://sepoliafaucet.com
2. Paste your wallet address (the one connected via WalletConnect) and request funds.
3. Wait 15-30 seconds for the faucet transaction to confirm.

**Verify**
Once funded, re-run the registration. The preflight check will confirm your balance:

[Execute: npx tsx scripts/check-env.ts]

If you're still seeing the error after funding, double-check that:
- The faucet sent to the **same address** connected via WalletConnect
- The faucet transaction has **confirmed** (check on https://sepolia.etherscan.io)
- You're on **Ethereum Sepolia** (11155111), not Base Sepolia (84532) -- they use different faucets
```


##7. "whoami" / "show my agent profile"

Structure: Identity card with agent details + trust label + endpoints + identity proof

```
[Execute sequentially:
  1. npx tsx scripts/load-agent.ts --agent-id 8453:12 --chain-id 8453 --rpc-url <rpcUrl>
  2. npx tsx scripts/reputation.ts --agent-id 8453:12 --chain-id 8453 --rpc-url <rpcUrl>
  3. npx tsx scripts/wallet.ts --action get --agent-id 8453:12 --chain-id 8453 --rpc-url <rpcUrl>
  4. npx tsx scripts/verify.ts --action sign --agent-id 8453:12 --chain-id 8453 --rpc-url <rpcUrl>
]

**Agent**: Code Reviewer (`8453:12`)
**Status**: Active
**Trust**: 🟢 Trusted -- 74/100 (15 reviews)
**Wallet**: `0x1234...5678`
**Owners**: `0xABC...DEF`

**Endpoints**:
- MCP: https://mcp.example.com (3 tools)
- A2A: https://a2a.example.com/agent-card

**OASF**: code-review, static-analysis

**Identity Proof**: Verified -- signature matches on-chain wallet (`0x1234...5678`)

Would you like to update your agent, check recent feedback, or inspect your x402 payment status?
```


##8. "Add an A2A endpoint and OASF skills to my agent"

Structure: Current state -> Changes -> Confirmation -> Execute

```
[Execute: npx tsx scripts/load-agent.ts --agent-id 8453:12 --chain-id 8453 --rpc-url <rpcUrl>]

**Current State** (`8453:12` -- Code Reviewer):
- MCP: https://mcp.example.com
- A2A: (none)
- OASF Skills: code-review
- OASF Domains: (none)

**Proposed Changes**:
| Field | Old | New |
|-------|-----|-----|
| A2A | (none) | `https://a2a.example.com/agent-card` |
| OASF Skills | `code-review` | `code-review, static-analysis, linting` |

**Update Summary**
- **Agent**: Code Reviewer (`8453:12`)
- **Chain**: Base (8453)
- **Signer**: 0xABC...DEF
- **Storage**: ipfs (pinata)
- **Changes**: Add A2A endpoint, add 2 OASF skills

Proceed with update?

[After confirmation:]

[Execute:
npx tsx scripts/update-agent.ts \
  --agent-id 8453:12 --chain-id 8453 --rpc-url <rpcUrl> --storage ipfs --ipfs pinata \
  --a2a-endpoint https://a2a.example.com/agent-card \
  --skills "code-review,static-analysis,linting" --validate-oasf true
]

Updated agent `8453:12`. Tx: 0xabc...123 (https://basescan.org/tx/0xabc...123)
New metadata URI pinned to IPFS.
```


##9. "Is my agent payment-ready?"

Structure: Readiness checklist -> Status -> Next steps

```
[Execute: npx tsx scripts/x402-status.ts --agent-id 8453:12 --chain-id 8453 --rpc-url <rpcUrl>]

**X402 Payment Readiness -- Code Reviewer (`8453:12`)**

| # | Condition | Status |
|---|-----------|--------|
| 1 | x402 support enabled | ✅ Yes |
| 2 | Active status | ✅ Yes |
| 3 | Wallet address set | ✅ `0x1234...5678` |
| 4 | At least one endpoint | ✅ MCP: https://mcp.example.com |

**Status**: ✅ Payment-ready

Your agent is fully configured for x402 payments. Clients can discover and pay for your endpoint using `awal`:

- **Inspect pricing**: `npx awal x402 details https://mcp.example.com`
- **Pay and call**: `npx awal x402 pay https://mcp.example.com`
- **Bazaar listing**: `npx awal x402 bazaar search "code review"`

Note: To actually receive payments via HTTP 402, your server must use `x402-express` middleware. See `x402-integration.md` for the full setup.

---

[If NOT payment-ready, show missing conditions:]

**X402 Payment Readiness -- Data Analyst (`8453:28`)**

| # | Condition | Status |
|---|-----------|--------|
| 1 | x402 support enabled | ❌ Not enabled |
| 2 | Active status | ✅ Yes |
| 3 | Wallet address set | ❌ No wallet |
| 4 | At least one endpoint | ✅ A2A: https://a2a.example.com |

**Status**: ❌ Not payment-ready (2 conditions missing)

**Next steps**:
1. Enable x402 support: update the agent with `--x402 true`
2. Set a wallet: use Wallet Management (Operation 7) to register a payment address
```


##10. "Transfer agent 8453:12 to 0xNewOwner"

Structure: Warning -> Confirmation -> Execute -> Result

```
[Execute: npx tsx scripts/load-agent.ts --agent-id 8453:12 --chain-id 8453 --rpc-url <rpcUrl>]

⚠️ **WARNING: This operation is irreversible.**
Transferring an agent permanently changes ownership. You will lose all control
over this agent -- you will no longer be able to update, transfer, or manage it.

**Transfer Summary**
- **Agent**: Code Reviewer (`8453:12`)
- **Chain**: Base (8453)
- **Current Owner**: `0xABC...DEF`
- **New Owner**: `0xNewOwner`
- **Signer**: `0xABC...DEF`

Are you sure you want to transfer? This cannot be undone.

[After explicit confirmation:]

[Execute:
npx tsx scripts/transfer.ts \
  --agent-id 8453:12 --chain-id 8453 --rpc-url <rpcUrl> --new-owner 0xNewOwner
]

Transfer complete.
- **Tx**: 0xdef...456 (https://basescan.org/tx/0xdef...456)
- **Agent**: `8453:12` (Code Reviewer)
- **New Owner**: `0xNewOwner`

You no longer have control of this agent. The new owner can update, transfer, or manage it.
```
