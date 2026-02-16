# Changelog

All notable changes to this project will be documented in this file.

## [1.4.0] - 2025-07-15

### Added

- **Skills CLI as primary install method** — `npx skills add` now recommended for Claude Code, Cursor, Codex, and 35+ agents
- **x402 payment status bridge** — new `x402-status.ts` read-only script checks agent payment readiness (x402support, wallet, active, endpoints) and generates setup commands
- **x402support field** in `buildAgentDetails` output
- **14 new unit tests** for x402 status script

### Changed

- **Install docs updated** — Skills CLI promoted as primary path; npx and source kept as alternatives; deprecated `openskills` command removed

### Fixed

- **Reference docs** — added x402 reference documentation

## [1.3.0] - 2025-07-01

### Added

- **Transfer script** (`transfer.ts`) — transfer agent ownership to a new address
- **Filter extraction** — search and reputation filter builders extracted into `lib/filters.ts` for reuse and testability
- **`createSdk()` convenience** — replaced 13 manual SDK init sites with a single helper
- **`isMainScript()` utility** — shared guard for conditional `main()` execution
- **`formatPermissions()` utility** — shared helper for displaying .env permissions
- **Undici override** — transitive vulnerability fix

### Changed

- **Security hardening** — untrusted data sanitization (`sanitizeString` in `buildAgentDetails`), `.env` permission check at runtime
- **WalletConnect** — default project ID warning added
- **Documentation** — synced all docs with codebase changes

## [1.2.0] - 2025-06-15

### Added

- **Inline IPFS credential prompt** — when IPFS env vars are missing, the agent asks for credentials during the operation (not persisted); security reminder shown after each use
- **Polygon built-in registry addresses** — deterministic CREATE2 addresses hardcoded as fallback, removing the need for manual env var config

### Changed

- **Env vars still take precedence** over built-in Polygon addresses
- **Documentation** — updated to reflect full Polygon support

## [1.1.0] - 2025-05-28

### Added

- **npx distribution** — install via `npx 8004skill install` without cloning the repo
- **CLI management** — `install`, `uninstall`, `update`, and `doctor` subcommands (`bin/cli.mjs`)
- **dotenv support** — environment variables can be defined in `~/.8004skill/.env`
- **Respond-to-feedback script** — agents can now respond to feedback they received
- **Polygon Mainnet (137)** — full support (registry + subgraph)
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
