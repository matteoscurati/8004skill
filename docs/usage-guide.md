# Usage Guide

- [Installation](#installation)
- [Claude Code](#claude-code)
- [OpenClaw](#openclaw)
- [Other SKILL.md-Compatible Agents](#other-skillmd-compatible-agents)
- [Verifying Installation](#verifying-installation)
- [Updating and Uninstalling](#updating-and-uninstalling)
- [Common Workflows](#common-workflows)

---

## Installation

The recommended way to install 8004skill is via npx:

```bash
npx 8004skill install
```

This downloads the skill, installs production dependencies, and creates symlinks for the agent(s) of your choice (Claude Code and/or OpenClaw). It works from anywhere — no git clone required.

**From source (git clone):**

```bash
git clone https://github.com/matteoscurati/8004skill.git
cd 8004skill
./install.sh          # or: node bin/cli.mjs install
```

When run from a git clone (`.git` present), the CLI symlinks the repo directly instead of copying files.

---

## Claude Code

[Claude Code](https://docs.anthropic.com/en/docs/claude-code) is Anthropic's CLI agent. It discovers skills from `~/.claude/skills/` automatically.

### Install

Run `npx 8004skill install` and choose "Claude Code" or "Both". Alternatively, from a git clone, run `./install.sh`. The installer creates the symlink to `~/.claude/skills/` and installs dependencies.

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

Claude Code inherits the shell environment. You can either export variables before launching, or define them in `~/.8004skill/.env` (shell values take precedence):

```bash
# Option A: shell export
export PINATA_JWT=your_pinata_jwt    # only if using Pinata for IPFS
export WC_PROJECT_ID=your_project_id  # optional, a default is provided
claude

# Option B: .env file (loaded automatically by every script)
cp .env.example ~/.8004skill/.env
chmod 600 ~/.8004skill/.env
# edit ~/.8004skill/.env with your values, then just run: claude
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

Run `npx 8004skill install` and choose "OpenClaw" or "Both". Alternatively, from a git clone, run `./install.sh`. The installer creates the symlink to `~/.openclaw/skills/` and installs dependencies.

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

Set variables in your shell profile (`~/.zshrc`, `~/.bashrc`), in OpenClaw's environment configuration, or in `~/.8004skill/.env` (shell values take precedence):

```bash
# Option A: shell profile (~/.zshrc or ~/.bashrc)
export PINATA_JWT=your_pinata_jwt    # only if using Pinata for IPFS
export WC_PROJECT_ID=your_project_id  # optional, a default is provided

# Option B: .env file (loaded automatically by every script)
cp .env.example ~/.8004skill/.env
chmod 600 ~/.8004skill/.env
# edit ~/.8004skill/.env with your values
```

Write operations use WalletConnect v2 — no private keys needed. The agent will pair your wallet during configuration.

---

## Other SKILL.md-Compatible Agents

8004skill follows the [Agent Skills](https://agentskills.io) convention. Any agent that reads SKILL.md files can use it. Clone the repo, run `npm install`, then point your agent to the `SKILL.md` file (via skills directory symlink, config path, CLI argument, or inline context). The SKILL.md body defines the operations menu, input schemas, CLI templates, security rules, and I/O contract — see [docs/architecture.md](architecture.md) for the full script I/O protocol.

---

## Verifying Installation

The quickest way to verify everything is working:

```bash
npx 8004skill doctor
```

This checks Node.js version, symlinks, skill files, scripts, dependencies, config, and WalletConnect session status. From a git clone: `node bin/cli.mjs doctor`.

### Check symlinks manually

```bash
# Claude Code
ls -la ~/.claude/skills/8004skill

# OpenClaw
ls -la ~/.openclaw/skills/8004skill
```

The symlink should point to the cloned repo directory (git clone mode) or `~/.8004skill/skill/` (npx mode).

### Test with the agent

Try a read-only operation (no wallet needed):

```
Search for agents on Sepolia
```

If results appear as a formatted table, the skill is working.

---

## Updating and Uninstalling

### Update

```bash
npx 8004skill update
```

In git clone mode, this pulls the latest changes and refreshes dependencies. In npx mode, it re-copies skill files from the latest npm package and reinstalls dependencies. From a git clone: `./update.sh` or `node bin/cli.mjs update`.

### Uninstall

```bash
npx 8004skill uninstall
```

Removes symlinks, installed skill files (npx mode), and optionally user data (`~/.8004skill/`). From a git clone: `./uninstall.sh` or `node bin/cli.mjs uninstall`.

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
