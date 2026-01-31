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

**Automated (recommended):**

```bash
git clone https://github.com/matteoscurati/8004skill.git
cd 8004skill
./install.sh    # select "Claude Code" or "Both"
```

**Manual:**

```bash
git clone https://github.com/matteoscurati/8004skill.git
cd 8004skill
npm install
mkdir -p ~/.claude/skills
ln -s "$(pwd)" ~/.claude/skills/8004skill
```

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
export PRIVATE_KEY=0xYourHexPrivateKey
export PINATA_JWT=your_pinata_jwt
claude
```

Or use the encrypted keystore to avoid shell history exposure. With the keystore, only `KEYSTORE_PASSWORD` is needed:

```bash
export KEYSTORE_PASSWORD=your_password
claude
```

### Session workflow

1. Start Claude Code in any directory
2. Say "configure 8004 for Sepolia" (first time only)
3. Ask for any operation -- the agent walks you through it step by step
4. Write operations show a confirmation summary before submitting

---

## OpenClaw

[OpenClaw](https://openclaw.org) is a macOS skill runner for AI agents. It discovers skills from `~/.openclaw/skills/` and uses the SKILL.md frontmatter `metadata` field for UI integration.

### Install

**Automated (recommended):**

```bash
git clone https://github.com/matteoscurati/8004skill.git
cd 8004skill
./install.sh    # select "OpenClaw" or "Both"
```

**Manual:**

```bash
git clone https://github.com/matteoscurati/8004skill.git
cd 8004skill
npm install
mkdir -p ~/.openclaw/skills
ln -s "$(pwd)" ~/.openclaw/skills/8004skill
```

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
export PRIVATE_KEY=0xYourHexPrivateKey
export PINATA_JWT=your_pinata_jwt
```

Or use the encrypted keystore (see [Common Workflows](#encrypted-keystore) below).

---

## Other SKILL.md-Compatible Agents

8004skill follows the [Agent Skills](https://agentskills.io) convention. Any agent that reads SKILL.md files can use it.

### Requirements for compatibility

An agent must:

1. **Read SKILL.md** from a known skills directory or a provided path
2. **Parse the frontmatter** (YAML between `---` delimiters) for metadata
3. **Follow the wizard flows** defined in the body -- gather inputs conversationally, run scripts via `npx tsx`, and present JSON output
4. **Execute shell commands** as subprocesses
5. **Pass environment variables** to subprocesses (PRIVATE_KEY, PINATA_JWT, etc.)

### Generic installation

```bash
git clone https://github.com/matteoscurati/8004skill.git
cd 8004skill
npm install
```

Then point your agent to the SKILL.md file:

| Agent setup style | What to do |
|---|---|
| **Skills directory** (like Claude Code, OpenClaw) | Symlink the project into the agent's skills directory |
| **Config file** | Add the path to `SKILL.md` in the agent's configuration |
| **CLI argument** | Pass `--skill /path/to/8004skill/SKILL.md` (or equivalent) |
| **Inline context** | Copy SKILL.md contents into the agent's system prompt or context window |

### What the agent needs to handle

The SKILL.md body defines:

- **Auto-Setup** -- check for `node_modules`, run `npm install` if missing
- **Operations Menu** -- 8 operations plus an Update Agent sub-flow, with trigger phrases, input schemas, CLI templates, and output formatting
- **Security Rules** -- defined in `reference/security.md` (linked from SKILL.md): never show raw commands, always confirm before writes, never log private keys
- **Reference Files** -- listed at the top of the SKILL.md body: `reference/chains.md`, `reference/sdk-api.md`, `reference/agent-schema.md`, and `reference/security.md`

### Minimal integration example

If your agent supports shell execution via tool/function calling:

1. Load `SKILL.md` into the agent's context
2. The agent follows the wizard flows when the user asks about ERC-8004 operations
3. Scripts run via `npx tsx scripts/<name>.ts --flag value` in the project directory
4. The agent parses JSON from stdout and formats it for the user

### Script I/O contract

All scripts follow the same protocol:

| Channel | Format | Content |
|---------|--------|---------|
| stdout | JSON | Final result (agent parses this) |
| stderr | Text/JSON | Progress updates and errors |
| exit 0 | -- | Success |
| exit 1 | -- | Failure (error written to stderr as JSON) |

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

### Encrypted keystore

Avoids exposing `PRIVATE_KEY` in shell history and process listings:

1. Run: `npx tsx scripts/keystore.ts --action import`
2. Enter your private key and a password (input is hidden)
3. The key is stored encrypted (AES-256-GCM) at `~/.8004skill/keystore.json`
4. For write operations, set `KEYSTORE_PASSWORD` instead of `PRIVATE_KEY`

Manage the keystore:

```bash
npx tsx scripts/keystore.ts --action list      # list stored keys
npx tsx scripts/keystore.ts --action verify     # verify a stored key
npx tsx scripts/keystore.ts --action export     # export a key (prompts for password)
npx tsx scripts/keystore.ts --action delete     # delete a key
```

### Read operations (no key needed)

- Search for agents
- Load agent details
- Check reputation
- Inspect an agent (reputation + connection info)
- Get an agent's wallet address
- Verify another agent's identity signature

### Write operations (key required)

Require `PRIVATE_KEY` or `KEYSTORE_PASSWORD`:

- Register a new agent
- Update agent metadata
- Submit feedback
- Set/unset agent wallet
- Sign an identity proof
