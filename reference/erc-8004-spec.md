# ERC-8004 Protocol Specification

> As of agent0-sdk v1.6.0, March 2026. For contract ABI and events, see `erc-8004-contracts.md`. For SDK wrapper methods, see `sdk-api.md`. For data types, see `sdk-types.md`.

## Overview

ERC-8004 defines a standard for registering, discovering, and evaluating AI agents on EVM-compatible blockchains. It consists of three lightweight registries deployed at deterministic addresses across all supported chains.

## The Three Registries

### 1. Identity Registry (ERC-721)

Each agent is an NFT with: **Token ID** (auto-incremented), **Agent URI** (IPFS/HTTP/data: URI pointing to registration file), **On-chain metadata** (key-value pairs, e.g. `agentWallet`).

The agent's full identity (name, description, endpoints, capabilities) lives in the registration file. The NFT is ownership proof. Standard ERC-721 (transferable). Owner can update URI, metadata, wallet. On transfer, `agentWallet` is automatically cleared.

### 2. Reputation Registry

On-chain feedback for agents. Any address can submit feedback containing: Agent ID, Reviewer address, Value (-100 to 100, int128 + uint8 decimals), Tags (up to 2), Endpoint (optional), Feedback file URI (optional IPFS pointer to off-chain enrichment).

Self-feedback is blocked (contract reverts if sender is owner/operator). Feedback values/tags are immutable after submission — can only be revoked (marked, not deleted).

### 3. Validation Registry

Third-party attestations from designated validators. Less commonly used directly — most interactions rely on Identity + Reputation. Enables trust models beyond reputation (TEE attestations, crypto-economic staking). See `validation-registry.md`.

## Agent Identity

### Agent ID Format

- **Global**: `eip155:{chainId}:{identityRegistryAddress}:{tokenId}`
- **Short**: `{chainId}:{tokenId}` (used by 8004skill and most tools — works because all chains use same deterministic addresses)

### Registration File

Stored on IPFS or HTTP. Contains: name, description, image, endpoints, trust models, status, owners, operators, metadata. See `agent-schema.md` for JSON schema.

### Endpoint Types

| Type | Purpose | Value |
|------|---------|-------|
| MCP | Model Context Protocol server | URL |
| A2A | Agent-to-Agent protocol | URL to agent card |
| ENS | Ethereum Name Service | Domain name |
| DID | Decentralized Identifier | DID string |
| WALLET | On-chain wallet | Ethereum address |
| OASF | Open Agent Skill Framework | Skills/domains slugs |

### Trust Models

Agents declare: `reputation`, `crypto-economic`, `tee-attestation`. See `trust-boundaries.md`.

## Deterministic Deployment

All contracts deployed via CREATE2 with `hash(0xFF, deployer, salt, initCodeHash)`. Same deployer + salt + bytecode = identical addresses on every chain. No address lookup needed — hardcoded in SDK. See `chains.md` for addresses.

## Agent Lifecycle

1. **Register**: Mint agent NFT with registration file
2. **Configure**: Set endpoints, capabilities, OASF, wallet, trust models
3. **Discover**: Search via subgraph or semantic search
4. **Interact**: Connect via MCP/A2A endpoints
5. **Rate**: Submit on-chain feedback
6. **Update**: Modify metadata, endpoints, status
7. **Transfer**: Transfer NFT to new address (irreversible)

## Subgraph Indexing

Protocol uses The Graph for efficient querying. Not all chains have indexing — see `chains.md`. Subgraph has eventual consistency (seconds to minutes lag after writes). On-chain state is always authoritative.

## Glossary

| Term | Definition |
|---|---|
| A2A | Agent-to-Agent protocol via agent cards at `.well-known/agent.json` |
| Agent Card | JSON describing A2A agent capabilities/skills |
| Agent ID | `{chainId}:{tokenId}`. Full: `eip155:{chainId}:{registryAddress}:{tokenId}` |
| Agent URI | Pointer to registration file (IPFS, HTTP, or `data:` URI) |
| Agent Wallet | Address linked via EIP-712 signature for payments/identity |
| CREATE2 | Deterministic deployment — same addresses across all chains |
| EIP-712 | Typed structured data signing for wallet binding |
| ERC-721 | NFT standard. Agent identities are ERC-721 NFTs |
| ERC-8004 | Standard: three on-chain registries for AI agent economy |
| Feedback | On-chain rating (-100 to 100) with tags, text, endpoint |
| Feedback File | IPFS document enriching feedback (text, proof of payment, MCP/A2A/OASF fields) |
| IPFS | Decentralized storage for registration/feedback files |
| MCP | Model Context Protocol — primary endpoint type |
| OASF | Open Agent Skill Framework taxonomy (agntcy/oasf) |
| Registration File | JSON profile: endpoints, trust models, metadata |
| Reputation Summary | Aggregated: count + averageValue (-100 to 100) |
| Subgraph | The Graph indexer — eventual consistency |
| Trust Label | Derived label based on reputation count/averageValue |
| Trust Model | `reputation`, `crypto-economic`, or `tee-attestation` |
| Validation Registry | Third registry for validator attestations (limited SDK support) |
| WalletConnect | Protocol v2 for remote signing — agent never holds keys |
| X402 | HTTP 402 payment protocol for agent endpoints via USDC on Base |

## Further Reading

- [Registration Best Practices](https://github.com/erc-8004/best-practices/blob/main/Registration.md)
- [Reputation Best Practices](https://github.com/erc-8004/best-practices/blob/main/Reputation.md)
- [ERC-8004 Spec](https://github.com/erc-8004/best-practices/blob/main/src/ERC8004SPEC.md)
- [OASF Taxonomy](https://github.com/agntcy/oasf)
