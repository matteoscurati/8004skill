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

The protocol is live on 5 fully-indexed chains (Ethereum, Sepolia, Polygon, Base, Base Sepolia) with contracts deployed on 13+ additional mainnets. See `chains.md` for the full list.
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
* Highly Trusted -- 87/100 (24 reviews)

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
Arbitrum (42161), Optimism (10), Avalanche (43114), BSC (56), Gnosis (100), Scroll (534352), Celo (42220), Taiko (167000), Linea (59144), Mantle (5000), Monad (10143), MegaETH (40), Abstract (2741)

Plus corresponding testnets. See `chains.md` for RPCs and full details.
```
