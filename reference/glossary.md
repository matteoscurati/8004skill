# Glossary

> As of agent0-sdk v1.6.0, March 2026.

Key terms used in ERC-8004 and 8004skill.

| Term | Definition |
|---|---|
| A2A | Agent-to-Agent protocol. Enables direct agent communication via agent cards at `.well-known/agent.json`. |
| Agent Card | JSON document describing an A2A agent's capabilities and skills. Hosted at the A2A endpoint URL. |
| Agent ID | Unique identifier in format `{chainId}:{tokenId}`. Full format: `eip155:{chainId}:{registryAddress}:{tokenId}`. |
| Agent URI | Pointer to an agent's registration file. Can be IPFS (`ipfs://...`), HTTP(S), or an ERC-8004 JSON `data:` URI. |
| Agent Wallet | Ethereum address linked to an agent via EIP-712 signature. Used for payments and identity verification. |
| CREATE2 | EVM opcode for deterministic contract deployment. All ERC-8004 contracts share the same address across chains. |
| DID | Decentralized Identifier. Optional endpoint type for agents. |
| EIP-712 | Ethereum typed structured data signing standard. Used for wallet binding signatures. |
| ENS | Ethereum Name Service. Optional human-readable endpoint for agents. |
| ERC-721 | Non-fungible token standard. Agent identities are ERC-721 NFTs. |
| ERC-8004 | Standard defining three on-chain registries (Identity, Reputation, Validation) for AI agent economy. |
| Feedback | On-chain rating (-100 to 100) with optional tags, text, and endpoint. Stored in Reputation Registry. |
| Feedback File | Off-chain IPFS document enriching feedback with text, proof of payment, and spec-aligned MCP/A2A/OASF fields. |
| Identity Registry | ERC-721 contract storing agent NFTs and their metadata URIs. |
| IPFS | InterPlanetary File System. Decentralized storage for registration files and feedback files. |
| MCP | Model Context Protocol. Primary endpoint type for AI agent tool access. |
| Metadata | On-chain key-value pairs on Identity Registry. Separate from registration file data. |
| OASF | Open Agent Skill Framework. Taxonomy of skills and domains from agntcy/oasf. |
| Operator | Address granted permissions on an agent by the owner. Can perform updates but not transfers. |
| Owner | Address holding the agent's ERC-721 NFT. Can update, transfer, and manage the agent. |
| Registration File | JSON document (IPFS, HTTP, or on-chain `data:` URI) containing agent profile, endpoints, trust models, and metadata. |
| Reputation Registry | Contract storing on-chain feedback entries for agents. |
| Reputation Summary | Aggregated stats: count (number of reviews) and averageValue (-100 to 100). |
| Subgraph | The Graph indexer for on-chain events. Provides efficient search queries. Has eventual consistency. |
| Trust Label | Derived label (Untrusted/Caution/Highly Trusted/Trusted/Established/Emerging/No Data) based on reputation count and averageValue. |
| Trust Model | Security mechanism declared by agents: `reputation`, `crypto-economic`, or `tee-attestation`. |
| Validation Registry | Third registry for validator attestations. Limited SDK support as of v1.6.0. |
| WalletConnect | Protocol v2 for remote signing. 8004skill uses it so the agent never holds private keys. |
| X402 | HTTP 402-based payment protocol. Enables pay-per-request access to agent endpoints via USDC on Base. |
