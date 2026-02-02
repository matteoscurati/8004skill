# Contributing to 8004skill

## Prerequisites

- Node.js >= 22.0.0 (strictly enforced via `engine-strict=true` in `.npmrc`; `npm install` will fail on older versions)
- npm
- A SKILL.md-compatible AI agent (e.g., [Claude Code](https://claude.ai/code), [OpenClaw](https://openclaw.org)) to test the skill end-to-end

## Setup

```bash
git clone https://github.com/matteoscurati/8004skill.git
cd 8004skill
npm install
```

## Development

Scripts live in `scripts/` and are executed at runtime via `npx tsx scripts/<name>.ts`. The shared utility module is `scripts/lib/shared.ts`.

Type-check before committing:

```bash
npm run typecheck
```

To compile TypeScript to `dist/` (not committed to the repo):

```bash
npm run build
```

The `dist/` directory is gitignored. It is not used at runtime — scripts are executed directly via `tsx`.

## Adding a new script

1. Create `scripts/<name>.ts` following the existing pattern: parse CLI args with `parseArgs()`, validate, call `agent0-sdk`, output JSON to stdout, catch errors with `handleError()`.
2. Use helpers from `scripts/lib/shared.ts` — at minimum `parseArgs()` for argument parsing and `handleError()` as the catch handler. Other utilities: `requireArg`, `parseChainId`, `validateAgentId`, `validateAddress`, `validateIpfsProvider`, `buildSdkConfig`, `extractIpfsConfig`, `outputJson`, `tryCatch`, `submitAndWait`, `exitWithError`.
3. Add the corresponding operation wizard flow in `SKILL.md`.
4. If the script introduces new data structures, document them in `reference/agent-schema.md`.

## Updating reference docs

The `reference/` directory contains docs consumed by the skill at runtime. Keep them in sync with any SDK or protocol changes:

- `chains.md` — supported chains, contract addresses, RPC endpoints
- `sdk-api.md` — agent0-sdk API surface
- `agent-schema.md` — ERC-8004 data structures
- `security.md` — security rules for key handling, confirmation requirements, and untrusted content

## Architecture

See [docs/architecture.md](docs/architecture.md) for the technical architecture: runtime flow, script patterns, data flow, security model, and ERC-8004 protocol summary.

## Commit guidelines

- Use concise commit messages describing the _why_, not the _what_.
- Do not commit `.env` files, private keys, or any secrets.

## License

By contributing, you agree that your contributions will be licensed under the [GPL-3.0](LICENSE).
