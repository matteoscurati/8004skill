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

## Usage Guide

See the **[Usage Guide](docs/usage-guide.md)** for agent-specific setup and workflows (Claude Code, OpenClaw, and other SKILL.md-compatible agents).

## Prerequisites

- **Node.js** >= 22.0.0
- A **SKILL.md-compatible AI agent** such as [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [OpenClaw](https://openclaw.org), or similar

## Quick Install

```bash
npx 8004skill install
```

Downloads the skill, installs dependencies, and links it to your agent. Supports Claude Code and OpenClaw.

### Alternative methods

**From source (git clone):**

```bash
git clone https://github.com/matteoscurati/8004skill.git
cd 8004skill
./install.sh
```

**Via skill manager:**

```bash
npx skills add matteoscurati/8004skill
npx openskills install matteoscurati/8004skill
```

## Installation (from source)

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

Follow the [Quick Install](#quick-install) steps above.

### 2. Configure

Open your agent in any directory and say:

> "Configure 8004 for Sepolia"

The agent will walk you through selecting a chain, RPC endpoint, and (optionally) an IPFS provider. Configuration is saved to `~/.8004skill/config.json`.

### 3. Try a read operation

Once configured, try a search:

> "Search for agents that do summarization"

The agent will run the search and present results as a readable table. From there you can ask to load details, check reputation, or give feedback -- all conversationally.

### 4. Write operations (optional)

To register an agent, submit feedback, or manage wallets, you need to pair a wallet via WalletConnect. Ask your agent:

> "Configure 8004 for Sepolia"

During configuration, the agent will show a QR code in the terminal. Scan it with your wallet app (MetaMask, Rainbow, etc.) to establish a session. Then:

> "Register my agent on-chain"

The agent will gather the required inputs (name, description, endpoints) step by step, show a confirmation summary, and submit the transaction only after you approve in both the chat and your wallet app.

## Configuration

The skill stores configuration at `~/.8004skill/config.json`, created automatically when you run the Configure wizard:

```json
{
  "activeChain": 11155111,
  "rpcUrl": "https://rpc.sepolia.org",
  "ipfs": "pinata",
  "wcProjectId": "optional-walletconnect-project-id",
  "registrations": {}
}
```

| Field | Description |
|-------|-------------|
| `activeChain` | Chain ID for the active network |
| `rpcUrl` | RPC endpoint for the active chain |
| `ipfs` | IPFS pinning provider (`pinata`, `filecoinPin`, `node`, or `null`) |
| `wcProjectId` | WalletConnect project ID (optional; a default is provided) |
| `registrations` | Record of agents you have registered, keyed by chain ID |

## Environment Variables

| Variable | Required For | Description |
|----------|-------------|-------------|
| `WC_PROJECT_ID` | All WC operations (optional) | WalletConnect project ID from cloud.walletconnect.com. A default is provided if not set. |
| `PINATA_JWT` | IPFS via Pinata | JWT token for Pinata pinning |
| `FILECOIN_PRIVATE_KEY` | IPFS via Filecoin | Private key for Filecoin pinning |
| `IPFS_NODE_URL` | IPFS via local node | URL of the IPFS node API |
| `SEARCH_API_URL` | Semantic search (optional) | Override URL for the semantic search API |
| `SUBGRAPH_URL` | Non-default chains | Subgraph URL for the active chain |
| `REGISTRY_ADDRESS_IDENTITY` | Non-default chains | Identity registry contract address override |
| `REGISTRY_ADDRESS_REPUTATION` | Non-default chains | Reputation registry contract address override |

Read operations (search, load agent, check reputation) do not require a wallet connection. Chains other than Mainnet (1) and Sepolia (11155111) require `SUBGRAPH_URL` and registry address overrides.

## Supported Chains

18 deployed chains (10 mainnet + 8 testnet) plus 4 planned.

**Full SDK support** (built-in contract addresses and subgraph URLs): Ethereum Mainnet (1), Ethereum Sepolia (11155111).

**Requires registry overrides** (`REGISTRY_ADDRESS_IDENTITY`, `REGISTRY_ADDRESS_REPUTATION`; Polygon 137 has a built-in subgraph URL, all others also need `SUBGRAPH_URL`):

- **Mainnets**: Polygon (137), Base (8453), BSC (56), Monad (143), Scroll (534352), Gnosis (100), Arbitrum (42161), Celo (42220), Taiko (167000)
- **Testnets**: Base Sepolia (84532), BSC Chapel (97), Monad Testnet (10143), Scroll Testnet (534351), Arbitrum Sepolia (421614), Celo Alfajores (44787), Polygon Amoy (80002)
- **Planned**: Linea Sepolia (59141), Hedera Testnet (296), HyperEVM Testnet (998), SKALE Base Sepolia (1351057110)

For contract addresses and RPC endpoints, see [`reference/chains.md`](reference/chains.md).

## Manual Installation

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

## CLI Management

The `8004skill` CLI provides commands for managing the skill installation:

```bash
npx 8004skill install     # Install or reinstall the skill
npx 8004skill uninstall   # Remove symlinks, installed files, and optionally user data
npx 8004skill update      # Pull latest changes (git clone) or re-copy files (npx) and refresh deps
npx 8004skill doctor      # Check installation, symlinks, scripts, config, and WalletConnect status
```

From a git clone, you can also use `node bin/cli.mjs <command>`.

## Security

- **Private keys never touch the agent.** All signing is done via WalletConnect v2 — transactions are signed in the user's wallet app (MetaMask, Rainbow, etc.).
- The WalletConnect session file (`~/.8004skill/wc-storage.json`) contains only relay metadata, no key material.
- The skill runs a preflight check before every write operation to confirm the connected wallet address.
- All on-chain writes require explicit user confirmation before submission.
- Config files are created with `chmod 600` (owner-only read/write).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and contribution guidelines.

## License

This project is licensed under the [GPL-3.0 License](LICENSE).
