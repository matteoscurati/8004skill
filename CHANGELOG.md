# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-05-28

### Added

- **npx distribution** — install via `npx 8004skill install` without cloning the repo
- **CLI management** — `install`, `uninstall`, `update`, and `doctor` subcommands (`bin/cli.mjs`)
- **dotenv support** — environment variables can be defined in `~/.8004skill/.env`
- **Respond-to-feedback script** — agents can now respond to feedback they received
- **Polygon Mainnet (137)** — partial support (subgraph; registry via env vars)
- **Test suite** — 139 tests across shared utilities, WalletConnect, search filters, and reputation filters (Vitest)
- **IPFS env var validation** — register, feedback, and update scripts fail fast on missing IPFS config
- **Copyable pairing URI** — WalletConnect pairing URI exposed as text alongside the QR code
- **.env.example** — template for environment variables
- **SKILL.md best practices** — reference examples for registration, reputation, and OASF

### Changed

- **agent0-sdk upgraded to 1.5.2** — cursor pagination removed, `searchAgents` returns `AgentSummary[]`
- **Chain selection is now mandatory** — removed silent Sepolia default for all operations
- **Supported chains aligned to SDK** — 3 chains (Mainnet, Sepolia, Polygon) instead of 9
- **WalletConnect fast-fail** — invalid project ID detected immediately instead of looping for 120s
- **Shared helpers** — extracted common logic to reduce duplication across scripts
- **Documentation** — rewritten for accuracy and npx-first workflow

### Fixed

- **Audit fixes** — 20 findings addressed: security hardening, bug fixes, DRY violations, and type issues across 11 files
- **Documentation fixes** — removed inaccuracies, stale claims, and redundancies

## [1.0.0] - 2025-04-15

Initial release.

### Added

- Conversational wizard interface defined in SKILL.md
- Scripts: register, search, load-agent, reputation, feedback, update-agent, verify, wallet, configure
- WalletConnect v2 integration for all signing operations
- Install wizard for Claude Code and OpenClaw
- Uninstall and update wizards
- Agent identity verification (sign & verify)
- Encrypted keystore and centralized `loadPrivateKey`
- Zero-setup read-only mode with trust labels
- Security hardening: untrusted content rules, env cleanup, key lifecycle
- Retry with exponential backoff for semantic search
- Explicit `--chain-id` required for write operations
- SKILL.md refactored for OpenClaw compatibility
- GPL-3.0 license
