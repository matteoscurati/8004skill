# Answer Examples

> As of agent0-sdk v1.6.0, March 2026.

Model responses for common queries. For niche queries (whoami, update, x402, transfer), see `answer-examples-extended.md`.


## "What is ERC-8004?"

Structure: Spec -> Implementation -> Open Questions

```
ERC-8004 defines three on-chain registries for AI agents on EVM chains:

- **Identity Registry** (ERC-721): Each agent is an NFT with a metadata URI pointing to its profile.
- **Reputation Registry**: On-chain feedback (-100 to 100) with tags and optional text.
- **Validation Registry**: Third-party attestations from designated validators.

Agents are identified by `{chainId}:{tokenId}`. Contracts deployed at deterministic addresses across 18+ chains via CREATE2.

Live on 5 fully-indexed chains (Ethereum, Sepolia, Polygon, Base, Base Sepolia) with additional deployed chains via manual config. See `chains.md`.
```


## "Search for MCP agents"

Structure: Execute search -> Table results -> Follow-up offers

```
[Execute: search.ts --chain-id 8453 --mcp-only true --active true]

Found 4 agents on Base with MCP endpoints:

| # | Agent ID | Name | Description |
|---|----------|------|-------------|
| 1 | `8453:12` | `Code Reviewer` | `Automated code review via MCP` |
| 2 | `8453:28` | `Data Analyst` | `SQL query generation and analysis` |

Would you like to load details, check reputation, or refine the search?
```


## "Register an agent"

Structure: Step-by-step with confirmation

```
Let's register your agent. I'll need: Name, Description, MCP/A2A endpoints, OASF skills/domains.

[Show confirmation:]
**Registration Summary**: Chain Base (8453), Signer 0xABC...123, Name "My Agent",
Description "...", MCP https://mcp.example.com, IPFS Pinata, est. gas ~150k.
Proceed?
```


## "Check reputation of agent 8453:12"

Structure: Trust label -> Stats -> Recent feedback table

```
[Execute reputation.ts + connect.ts]

**Agent**: Code Reviewer (`8453:12`)
⭐ Highly Trusted -- 87/100 (24 reviews)

| # | Reviewer | Rating | Tags | Date |
|---|----------|--------|------|------|
| 1 | `0xABC...` | 95 | starred, reachable | 2026-02-28 |
| 2 | `0xDEF...` | 80 | uptime | 2026-02-25 |

**Endpoints**: MCP (https://mcp.example.com) -- 3 tools
**OASF**: code-review, static-analysis

Would you like to give feedback or connect to this agent's MCP endpoint?
```


## "What chains are supported?"

Structure: Tiered list

```
**Full SDK Support** (built-in subgraph):
- Ethereum Mainnet (1), Sepolia (11155111), Polygon (137), Base (8453), Base Sepolia (84532)

**Deployed** (requires `SUBGRAPH_URL`):
Arbitrum (42161), Optimism (10), Avalanche (43114), BSC (56), Monad (143), + more.

See `chains.md` for RPCs and full list.
```


## "I'm getting 'insufficient funds' on Sepolia"

Structure: Diagnose -> Fix -> Verify

```
Your wallet's Sepolia ETH balance is too low for gas (~150k).

**Fix**: Get free ETH from https://sepoliafaucet.com, paste your WalletConnect wallet address, wait 15-30s.

**Verify**: Re-run the operation. Check: faucet sent to same address, tx confirmed on sepolia.etherscan.io,
correct chain (Ethereum Sepolia 11155111, not Base Sepolia 84532).
```
