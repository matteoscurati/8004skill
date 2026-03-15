# Changelog

All notable changes to this project will be documented in this file.

## [2.3.0] - 2026-03-15

### Added
- **A2A Messaging** (Operation 14) — send messages to agents, list/get/cancel tasks via A2A protocol (`scripts/a2a.ts`)
- **X402 Payment** (Operation 15) — execute HTTP requests with automatic x402 payment handling (`scripts/x402-pay.ts`)
- `PRIVATE_KEY` env var support — headless/server-side signing alternative to WalletConnect for x402 payments and automated workflows
- `OVERRIDE_RPC_{chainId}` env vars — per-chain RPC URL overrides (SDK 1.7.0 built-in defaults)
- `getSigningMode()` helper — detect available signing method (walletconnect/privatekey/readonly)
- `getOverrideRpcUrlsFromEnv()` helper — collect per-chain RPC overrides from environment
- Example 6 in SKILL.md — A2A + x402 combined flow
- 45 new unit tests (226 total)

### Changed
- Upgraded agent0-sdk from 1.6.0 to 1.7.0 (x402 payments, A2A messaging, multichain improvements)
- SKILL.md expanded from 13 to 15 operations
- `buildSdkConfig()` now accepts `privateKey` and `overrideRpcUrls` options
- `createSdk()` reads `PRIVATE_KEY` and `OVERRIDE_RPC_*` from environment automatically
- `check-env.ts` reports signing mode and `PRIVATE_KEY` presence
- `connect.ts` fixed to use `isMainScript` guard pattern
- Script version bumped to 2.3.0
- All reference docs updated to v1.7.0
- Website updated with 2 new operation cards and docs

## [2.2.0] - 2026-03-14

### Added
- 5 realistic Examples in SKILL.md (setup+registration, discovery, reputation, knowledge, write-flow)
- `license`, `allowed-tools`, `compatibility` fields in SKILL.md frontmatter

### Changed
- Renamed `reference/` directory to `references/` (Anthropic skill guide compliance)
- SKILL.md description rewritten to be imperative/pushy with concrete trigger phrases
- Error handling section expanded from one-liner to 6 cause/action bullet points
- Chain resolution and untrusted data policies now include inline "why" explanations
- Updated all cross-references across codebase (SKILL.md, cli.mjs, docs, tests, troubleshooting)
- `package.json` files array updated for `references/` rename
- `bin/cli.mjs` SKILL_DIRS updated for `references/` rename

## [2.1.0] - 2026-03-12

### Added
- 5 new answer-example templates: troubleshooting, whoami, update, x402, transfer (10 total)
- CSV `--chains` support in search filters (e.g., `--chains 1,137,8453`)
- TrustModel enum validation for `--trust` flag in update-agent script
- 5 new unit tests (181 total)

### Changed
- SKILL.md description expanded to cover all 13 ops plus knowledge/troubleshooting/x402/whoami
- Trust labels in SKILL.md reformatted to table with emoji caveat
- Chain disambiguation for "Sepolia" clarified in SKILL.md
- Multi-step workflow guidance improved in SKILL.md
- Common errors condensed to one-liner format in SKILL.md
- Prompt injection example added to Untrusted Data Policy in SKILL.md
- `parseChainId` tightened to reject fractional values (e.g., `1.5`)
- Glossary merged into `references/erc-8004-spec.md` (glossary.md deleted)
- Data discrepancy rules merged into `references/troubleshooting.md` (discrepancy-rules.md deleted)
- Cross-references in `references/decision-tree.md` updated to point to merged locations

### Removed
- `references/glossary.md` (content merged into erc-8004-spec.md)
- `references/discrepancy-rules.md` (content merged into troubleshooting.md)

## [2.0.1] - 2026-03-10

### Changed
- Version metadata aligned across package manifests, skill metadata, and script diagnostics
- Website badge updated to reflect the published package version

### Fixed
- Documentation and website copy aligned with the current `agent0-sdk` v1.6.0 surface
- Security guidance now consistently requires IPFS credentials to be configured outside chat/command lines
- Chain reference docs corrected for current deployed network IDs and manual-config coverage

## [2.0.0] - 2026-03-09

### Added
- On-chain registration support (`agent.registerOnChain()`) with ERC-8004 JSON data URIs
- Helia IPFS backend (`--ipfs helia`) — embedded, no external credentials
- `get-agent.ts` script — fetch indexed AgentSummary via `sdk.getAgent()`
- `ownership.ts` script — get-owner and is-owner actions
- `sdk-info.ts` script — chain diagnostics (registries, read-only status, client availability)
- 3 new SKILL.md operations: Get Agent Summary (#11), Ownership (#12), SDK Diagnostics (#13)
- 6 new unit tests (176 total)

### Changed
- Upgraded agent0-sdk from ^1.5.3 to 1.6.0
- Feedback schema migrated to spec-aligned fields (mcpTool, mcpPrompt, mcpResource, a2aSkills, a2aContextId, a2aTaskId, oasfSkills, oasfDomains); legacy fields removed
- IPFS provider enum: `pinata | filecoinPin | node | helia`
- SKILL.md expanded from 10 to 13 operations
- Register Agent supports 3 storage modes: IPFS, HTTP, on-chain

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
