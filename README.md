# 8004skill

An AI agent skill for interacting with the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) on-chain agent economy. Register agents, discover peers, manage reputation, and enable agent-to-agent interactions across EVM chains.

## How It Works

8004skill is a **conversational skill for AI coding agents**, compatible with [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [OpenClaw](https://openclaw.org), and other [Agent Skills](https://agentskills.io)-compatible tools. Once installed, the agent reads the skill definition and guides you through every operation as an interactive wizard. You never construct commands, remember flags, or read script output directly -- you just talk to the agent.

```
You ──ask in natural language──> Agent ──reads──> SKILL.md
                                      │
                                      ├── runs the right script for you
                                      ├── gathers inputs step by step
                                      ├── asks for confirmation before writes
                                      └── presents results back in plain English
```

**Example prompts you can use:**

- "Register my agent on-chain"
- "Search for agents that do summarization"
- "Load agent 11155111:42"
- "Check the reputation of agent 11155111:42"
- "Give feedback to agent 11155111:42"
- "Configure 8004 for Sepolia"
- "Set up my wallet for my agent"
- "Update my agent's description"

Any of these (or similar phrasing) will start the corresponding wizard flow. If the agent is unsure what you need, it will show you the full operations menu.

## Prerequisites

- **Node.js** >= 22.0.0
- A **SKILL.md-compatible AI agent** such as [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [OpenClaw](https://openclaw.org), or similar

## Installation

```bash
git clone https://github.com/matteoscurati/8004skill.git
cd 8004skill
./install.sh
```

The install wizard checks prerequisites, installs npm dependencies, and symlinks the skill into the agent(s) of your choice (`~/.claude/skills/` and/or `~/.openclaw/skills/`). After that, every SKILL.md-compatible agent on your machine will discover the skill automatically.

You can also install manually — see [Manual installation](#manual-installation) below.

## Quick Start

Here is the fastest path from install to your first operation:

### 1. Install

Follow the [Installation](#installation) steps above.

### 2. Configure

Open your agent in any directory and say:

> "Configure 8004 for Sepolia"

The agent will walk you through selecting a chain, RPC endpoint, and (optionally) an IPFS provider. Configuration is saved to `~/.8004skill/config.json`.

### 3. Try a read operation

Once configured, try a search:

> "Search for agents that do summarization"

The agent will run the search and present results as a readable table. From there you can ask to load details, check reputation, or give feedback -- all conversationally.

### 4. Write operations (optional)

To register an agent, submit feedback, or manage wallets, you will need a private key set as an environment variable:

```bash
export PRIVATE_KEY=0xYourHexPrivateKey
```

Then ask your agent:

> "Register my agent on-chain"

The agent will gather the required inputs (name, description, endpoints) step by step, show a confirmation summary, and only submit the transaction after you approve.

## Configuration

The skill stores configuration at `~/.8004skill/config.json`, created automatically when you run the Configure wizard:

```json
{
  "activeChain": 11155111,
  "rpcUrl": "https://rpc.sepolia.org",
  "ipfs": "pinata",
  "registrations": {}
}
```

| Field | Description |
|-------|-------------|
| `activeChain` | Chain ID for the active network |
| `rpcUrl` | RPC endpoint for the active chain |
| `ipfs` | IPFS pinning provider (`pinata`, `filecoinPin`, `node`, or `null`) |
| `registrations` | Record of agents you have registered, keyed by chain ID |

## Environment Variables

| Variable | Required For | Description |
|----------|-------------|-------------|
| `PRIVATE_KEY` | Register, Update, Feedback, Wallet set/unset | 0x-prefixed hex private key of the agent owner |
| `PINATA_JWT` | IPFS via Pinata | JWT token for Pinata pinning |
| `FILECOIN_PRIVATE_KEY` | IPFS via Filecoin | Private key for Filecoin pinning |
| `IPFS_NODE_URL` | IPFS via local node | URL of the IPFS node API |
| `WALLET_PRIVATE_KEY` | Wallet set | Private key of the wallet being set (EIP-712) |
| `SEARCH_API_URL` | Semantic search (optional) | Override URL for the semantic search API |
| `SUBGRAPH_URL` | Non-default chains | Subgraph URL for the active chain |
| `REGISTRY_ADDRESS_IDENTITY` | Non-default chains | Identity registry contract address override |
| `REGISTRY_ADDRESS_REPUTATION` | Non-default chains | Reputation registry contract address override |

Read operations (search, load agent, check reputation) do not require `PRIVATE_KEY`. Chains other than Mainnet (1) and Sepolia (11155111) require `SUBGRAPH_URL` and registry address overrides.

## Supported Chains

| Chain | Chain ID | Status | Support |
|-------|----------|--------|---------|
| Ethereum Mainnet | 1 | Production | Full |
| Ethereum Sepolia | 11155111 | Testnet | Full |
| Base Sepolia | 84532 | Testnet | Requires overrides |
| Linea Sepolia | 59141 | Testnet | Requires overrides |
| Polygon Amoy | 80002 | Testnet | Requires overrides |
| Hedera Testnet | 296 | Testnet | Requires overrides |
| HyperEVM Testnet | 998 | Testnet | Requires overrides |
| SKALE Sepolia | 1351057110 | Testnet | Requires overrides |

"Full" support means the SDK has built-in contract addresses and subgraph URLs. "Requires overrides" means you must set `SUBGRAPH_URL`, `REGISTRY_ADDRESS_IDENTITY`, and `REGISTRY_ADDRESS_REPUTATION` environment variables. For contract addresses and RPC endpoints, see `reference/chains.md` inside the project.

## Manual Installation

If you prefer not to use the wizard, clone the repo, install dependencies, and symlink into the agent directory yourself:

```bash
git clone https://github.com/matteoscurati/8004skill.git
cd 8004skill
npm install

# Claude Code
mkdir -p ~/.claude/skills
ln -s "$(pwd)" ~/.claude/skills/8004skill

# OpenClaw
mkdir -p ~/.openclaw/skills
ln -s "$(pwd)" ~/.openclaw/skills/8004skill
```

## Security

- Private keys are **never** stored on disk. They are passed via environment variables only.
- The skill runs a preflight check before every write operation to confirm the signer address.
- All on-chain writes require explicit user confirmation before submission.
- Config files are created with `chmod 600` (owner-only read/write).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and contribution guidelines.

## License

This project is licensed under the [GPL-3.0 License](LICENSE).
