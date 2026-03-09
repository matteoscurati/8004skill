# ERC-8004 Protocol Specification

> As of agent0-sdk v1.6.0, March 2026. Based on the ERC-8004 standard for on-chain agent economy.

> This file describes the ERC-8004 protocol and contract interfaces. For SDK wrapper methods, see `sdk-api.md`. For data types, see `sdk-types.md`.

## Overview

ERC-8004 defines a standard for registering, discovering, and evaluating AI agents on EVM-compatible blockchains. It consists of three lightweight registries deployed at deterministic addresses across all supported chains.

## The Three Registries

### 1. Identity Registry (ERC-721)

The Identity Registry is an ERC-721 NFT contract. Each agent is a token with:
- **Token ID**: Unique per chain, auto-incremented
- **Agent URI**: Points to a registration file (IPFS, HTTP, or ERC-8004 JSON `data:` URI) containing the agent's metadata
- **On-chain metadata**: Key-value pairs stored directly on-chain (e.g., `agentWallet`)

The agent's full identity — name, description, endpoints, capabilities — lives in the registration file referenced by the URI. The NFT itself is the ownership proof.

**Contract functions**: See [Contract Function Signatures](#contract-function-signatures) below for full ABI-level details.

**Ownership model**: Standard ERC-721 (transferable). Owner can update URI, metadata, and wallet. Operators can be granted permission via `setApprovalForAll` or `approve`. On transfer, `agentWallet` is automatically cleared.

### 2. Reputation Registry

The Reputation Registry stores on-chain feedback for agents. Any address can submit feedback for any agent.

Each feedback entry contains:
- **Agent ID**: Target agent (chain-scoped token ID)
- **Reviewer**: Address that submitted the feedback
- **Value**: Integer rating from -100 to 100 (with optional decimals encoded as `int128` + `uint8 valueDecimals`)
- **Tags**: Up to 2 string tags (e.g., `starred`, `reachable`, `uptime`)
- **Endpoint**: Optional — which endpoint was evaluated
- **Feedback file URI**: Optional IPFS pointer to off-chain enrichment (text, proof of payment, MCP/A2A/OASF fields)

**Contract functions**: See [Contract Function Signatures](#contract-function-signatures) below for full ABI-level details.

**Security**: Self-feedback is blocked — the contract reverts if `msg.sender` is the agent's owner or an approved operator.

**Immutability**: Feedback values and tags cannot be edited after submission. They can only be revoked (marked as revoked, not deleted).

### 3. Validation Registry

The Validation Registry stores third-party attestations about agents. Validators (trusted third parties) can attest to agent properties.

This registry is less commonly used directly — most agent interactions rely on Identity + Reputation. It enables trust models beyond simple reputation (e.g., TEE attestations, crypto-economic staking).

## Agent Identity

### Agent ID Format

- **Global format**: `eip155:{chainId}:{identityRegistryAddress}:{tokenId}`
- **Short format**: `{chainId}:{tokenId}` (used by 8004skill and most tools)

The short format works because all chains use the same deterministic contract addresses.

### Registration File

The registration file (stored on IPFS or HTTP) contains the agent's full profile: name, description, image, endpoints, trust models, status, owners, operators, and metadata. See `agent-schema.md` for the full JSON schema.

### Endpoint Types

| Type | Purpose | Value |
|------|---------|-------|
| MCP | Model Context Protocol server | URL to MCP endpoint |
| A2A | Agent-to-Agent protocol | URL to agent card (`.well-known/agent.json`) |
| ENS | Ethereum Name Service | ENS domain name |
| DID | Decentralized Identifier | DID string |
| WALLET | On-chain wallet | Ethereum address |
| OASF | Open Agent Skill Framework | Skills and domains slugs |

### Trust Models

Agents declare which trust mechanisms they support: `reputation`, `crypto-economic`, `tee-attestation`. See `trust-boundaries.md` for detailed analysis of each model.

## Deterministic Deployment

All ERC-8004 contracts are deployed using CREATE2 with deterministic addresses. This means:
- Every chain has the **same contract addresses** for the same contract type (mainnet vs testnet)
- No address lookup needed — the addresses are hardcoded in the SDK
- New chains can be supported by deploying to the known addresses

See `chains.md` for the current mainnet and testnet contract addresses.

### How CREATE2 Works

CREATE2 computes the deployment address from `hash(0xFF, deployer, salt, initCodeHash)`. Since ERC-8004 uses the same deployer, salt, and contract bytecode on every chain, the resulting addresses are identical. This means:

- Agents can be discovered on any chain without address lookups
- Cross-chain tooling works with hardcoded addresses
- New chain deployments automatically get the expected addresses

## Contract Function Signatures

### Identity Registry

```solidity
// Write
function register() external returns (uint256 agentId)
function register(string memory agentURI) external returns (uint256 agentId)
function register(string memory agentURI, MetadataEntry[] memory metadata) external returns (uint256 agentId)
function setAgentURI(uint256 agentId, string calldata newURI) external
function setMetadata(uint256 agentId, string memory key, bytes memory value) external
function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external
function unsetAgentWallet(uint256 agentId) external

// Read
function getMetadata(uint256 agentId, string memory key) external view returns (bytes memory)
function getAgentWallet(uint256 agentId) external view returns (address)
function isAuthorizedOrOwner(address spender, uint256 agentId) external view returns (bool)
function ownerOf(uint256 tokenId) external view returns (address)  // ERC-721
function tokenURI(uint256 tokenId) external view returns (string memory)  // ERC-721
```

### Reputation Registry

```solidity
// Write
function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals,
    string calldata tag1, string calldata tag2, string calldata endpoint,
    string calldata feedbackURI, bytes32 feedbackHash) external
function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external
function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex,
    string calldata responseURI, bytes32 responseHash) external

// Read
function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) external view
    returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool isRevoked)
function readAllFeedback(uint256 agentId, address[] calldata clientAddresses,
    string calldata tag1, string calldata tag2, bool includeRevoked) external view returns (...)
function getSummary(uint256 agentId, address[] calldata clientAddresses,
    string calldata tag1, string calldata tag2) external view
    returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)
function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64)
function getClients(uint256 agentId) external view returns (address[] memory)
function getResponseCount(uint256 agentId, address clientAddress, uint64 feedbackIndex,
    address[] calldata responders) external view returns (uint64 count)
```

### Validation Registry

See `validation-registry.md` for detailed purpose, data model, and use cases.

```solidity
// Write
function validationRequest(address validatorAddress, uint256 agentId,
    string calldata requestURI, bytes32 requestHash) external
function validationResponse(bytes32 requestHash, uint8 response,
    string calldata responseURI, bytes32 responseHash, string calldata tag) external

// Read
function getValidationStatus(bytes32 requestHash) external view
    returns (address validatorAddress, uint256 agentId, uint8 response,
    bytes32 responseHash, string memory tag, uint256 lastUpdate)
function getSummary(uint256 agentId, address[] calldata validatorAddresses,
    string calldata tag) external view returns (uint64 count, uint8 avgResponse)
function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory)
function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory)
```

## Event Signatures

```solidity
// Identity Registry
event Registered(uint256 indexed agentId, string agentURI, address indexed owner)
event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy)
event MetadataSet(uint256 indexed agentId, string indexed indexedMetadataKey,
    string metadataKey, bytes metadataValue)

// Reputation Registry
event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex,
    int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2,
    string endpoint, string feedbackURI, bytes32 feedbackHash)
event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress,
    uint64 indexed feedbackIndex)
event ResponseAppended(uint256 indexed agentId, address indexed clientAddress,
    uint64 feedbackIndex, address indexed responder, string responseURI, bytes32 responseHash)

// Validation Registry
event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId,
    string requestURI, bytes32 indexed requestHash)
event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId,
    bytes32 indexed requestHash, uint8 response, string responseURI,
    bytes32 responseHash, string tag)
```

## Agent Lifecycle

1. **Register**: Owner mints an agent NFT with a registration file (Identity Registry)
2. **Configure**: Owner sets endpoints, capabilities, OASF skills, wallet, trust models
3. **Discover**: Other agents search via subgraph queries or semantic search
4. **Interact**: Agents connect via MCP/A2A endpoints
5. **Rate**: After interaction, agents submit on-chain feedback (Reputation Registry)
6. **Update**: Owner updates metadata, endpoints, or status as needed
7. **Transfer**: Owner can transfer the agent NFT to a new address (irreversible)

## Subgraph Indexing

The protocol uses The Graph subgraphs to index on-chain events for efficient querying. Not all chains have subgraph indexing — see `reference/chains.md` for the current status.

**Important**: Subgraph indexing has eventual consistency. After an on-chain write, it may take seconds to minutes before the data appears in search results. The on-chain state is always authoritative.

## Further Reading

- [ERC-8004 Best Practices — Registration](https://github.com/erc-8004/best-practices/blob/main/Registration.md)
- [ERC-8004 Best Practices — Reputation](https://github.com/erc-8004/best-practices/blob/main/Reputation.md)
- [ERC-8004 Spec](https://github.com/erc-8004/best-practices/blob/main/src/ERC8004SPEC.md)
- [OASF Taxonomy](https://github.com/agntcy/oasf)
