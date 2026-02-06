# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

8004skill is a Claude Code skill for the ERC-8004 on-chain agent economy protocol. It provides a conversational wizard interface (defined in SKILL.md) that runs TypeScript CLI scripts to register agents, discover peers, manage reputation, and enable agent-to-agent interactions across EVM chains. The declared runtime dependency is `agent0-sdk` (>= 1.5.1; cursor pagination removed, `searchAgents` returns `AgentSummary[]`). All signing is done via WalletConnect v2 — the agent never holds private keys.

## Distribution

The skill is published on npm as `8004skill`. Users can install via `npx 8004skill install`, which copies files to `~/.8004skill/skill/` and symlinks into the agent's skills directory. From a git clone, the same CLI (`node bin/cli.mjs install`) symlinks the repo directly.

CLI entry point: `bin/cli.mjs` (vanilla ESM JavaScript, no external dependencies). Subcommands: `install`, `uninstall`, `update`, `doctor`.

Skill metadata for ecosystem tools: `.claude-skill.json`.

## Commands

```bash
npm run typecheck       # Type-check without emitting (tsc --noEmit)
npm run build           # Compile to dist/ (tsc)
npm test                # Run tests (vitest)
npm run test:watch      # Run tests in watch mode
npm run prepublishOnly  # Typecheck before npm publish
```

Scripts are executed at runtime via `npx tsx scripts/<script>.ts --flag value` (`tsx` is a runtime dependency).

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed runtime flow, script architecture, data flow diagrams, and security model.

### Key conventions

- Agent ID format: `chainId:tokenId` (e.g., `11155111:42`)
- All write operations must show a confirmation summary and get explicit user approval before executing
- All signing is done via WalletConnect v2 — private keys never touch the agent
- WalletConnect session state is serialized to `~/.8004skill/wc-storage.json`; each script restores the session, does its work, exits
- Raw CLI commands are never shown to the user
- ESM throughout (`"type": "module"` in package.json)
- Node.js >= 22.0.0 required (enforced via `engine-strict=true`)
- `bin/cli.mjs` is vanilla JS (no TypeScript, no external deps) so it works via `npx` without `tsx`
