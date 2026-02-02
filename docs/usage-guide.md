# Usage Guide

- [Claude Code](#claude-code)
- [OpenClaw](#openclaw)
- [Other SKILL.md-Compatible Agents](#other-skillmd-compatible-agents)
- [Verifying Installation](#verifying-installation)
- [Common Workflows](#common-workflows)

---

## Claude Code

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) is Anthropic's CLI agent. It discovers skills from `~/.claude/skills/` automatically.

### Install

See [README.md](../README.md#installation) for installation steps (automated and manual).

### How it works

Claude Code reads `SKILL.md` from the skills directory at startup. The skill is available as a slash command and via natural language.

### Invoking the skill

**Slash command** -- type `/8004skill` to load the skill definition and present the operations menu.

**Natural language** -- describe what you want. Claude Code matches your intent to the right operation:

```
> Register my agent on-chain
> Search for agents that do summarization
> Configure 8004 for Sepolia
> Check the reputation of agent 11155111:42
```

### Setting environment variables

Claude Code inherits the shell environment. Export variables before launching:

```bash
export PINATA_JWT=your_pinata_jwt    # only if using Pinata for IPFS
export WC_PROJECT_ID=your_project_id  # optional, a default is provided
claude
```

Write operations use WalletConnect v2 — no private keys in the environment. The agent will pair your wallet via QR code during configuration.

### Session workflow

1. Start Claude Code in any directory
2. Say "configure 8004 for Sepolia" (first time only)
3. Ask for any operation -- the agent walks you through it step by step
4. Write operations show a confirmation summary before submitting

---

## OpenClaw

[OpenClaw](https://openclaw.org) is a macOS skill runner for AI agents. It discovers skills from `~/.openclaw/skills/` and uses the SKILL.md frontmatter `metadata` field for UI integration.

### Install

See [README.md](../README.md#installation) for installation steps (automated and manual).

### How it works

OpenClaw parses the SKILL.md frontmatter at discovery time. Key fields:

| Field | Purpose |
|-------|---------|
| `name` | Skill identifier in the UI |
| `description` | Shown in the skill browser |
| `metadata.openclaw.emoji` | Displayed next to the skill name |
| `metadata.openclaw.os` | Platform filter (darwin, linux) |
| `metadata.openclaw.requires.bins` | Binaries that must be present (`node`, `npx`) |
| `metadata.openclaw.install` | Install instructions for missing dependencies (Homebrew) |

### Dependency management

The frontmatter declares `node` and `npx` as required binaries. If missing, OpenClaw offers to install Node.js via Homebrew using the install spec:

```json
{"id":"brew","kind":"brew","formula":"node","bins":["node","npx"],"label":"Install Node.js (brew)"}
```

npm dependencies are handled separately by the Auto-Setup section in the SKILL.md body, which runs `npm install --prefix {baseDir}` on first use if `node_modules` is missing.

### Invoking the skill

Select 8004skill from the OpenClaw Skills UI to load it into the active session. The same natural language prompts that work in Claude Code work here:

```
Register my agent on-chain
Search for agents that do summarization
Configure 8004 for Sepolia
```

### Setting environment variables

Set variables in your shell profile (`~/.zshrc`, `~/.bashrc`) or in OpenClaw's environment configuration:

```bash
# In ~/.zshrc or ~/.bashrc
export PINATA_JWT=your_pinata_jwt    # only if using Pinata for IPFS
export WC_PROJECT_ID=your_project_id  # optional, a default is provided
```

Write operations use WalletConnect v2 — no private keys needed. The agent will pair your wallet during configuration.

---

## Other SKILL.md-Compatible Agents

8004skill follows the [Agent Skills](https://agentskills.io) convention. Any agent that reads SKILL.md files can use it. Clone the repo, run `npm install`, then point your agent to the `SKILL.md` file (via skills directory symlink, config path, CLI argument, or inline context). The SKILL.md body defines the operations menu, input schemas, CLI templates, security rules, and I/O contract — see [docs/architecture.md](architecture.md) for the full script I/O protocol.

---

## Verifying Installation

### Check the symlink

```bash
# Claude Code
ls -la ~/.claude/skills/8004skill

# OpenClaw
ls -la ~/.openclaw/skills/8004skill
```

Both should point to the cloned repo directory.

### Check dependencies

```bash
ls 8004skill/node_modules/.package-lock.json
```

If `node_modules` is missing, run `npm install`. The agent also handles this via Auto-Setup on first use.

### Test with the agent

Try a read-only operation (no private key needed):

```
Search for agents on Sepolia
```

If results appear as a formatted table, the skill is working.

---

## Common Workflows

### First-time setup

1. Install the skill (see your agent's section above)
2. Start the agent and say: **"Configure 8004 for Sepolia"**
3. The agent walks you through chain selection, RPC endpoint, and IPFS provider
4. Configuration is saved to `~/.8004skill/config.json`

### Wallet pairing (WalletConnect)

Write operations require a connected wallet via WalletConnect v2. Private keys never touch the agent — all signing happens in your wallet app.

1. During configuration, the agent runs `wc-pair.ts` which shows a QR code in the terminal
2. Scan the QR code with your wallet app (MetaMask, Rainbow, etc.)
3. The session is saved to `~/.8004skill/wc-storage.json` and reused across script invocations
4. Sessions last ~7 days. When expired, the agent will show a new QR code automatically

To disconnect manually, ask the agent or run: `npx tsx scripts/wc-disconnect.ts`

### Read operations (no wallet needed)

- Search for agents
- Load agent details
- Check reputation
- Inspect an agent (reputation + connection info)
- Get an agent's wallet address
- Verify another agent's identity signature

### Write operations (wallet required)

Require an active WalletConnect session:

- Register a new agent
- Update agent metadata
- Submit feedback
- Set/unset agent wallet
- Sign an identity proof
