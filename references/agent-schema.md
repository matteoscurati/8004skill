# ERC-8004 Data Structures

> As of agent0-sdk v1.7.1, March 2026.

## Agent Registration File (IPFS / HTTP / on-chain data URI)

> The ERC-8004 spec uses `services` as the key for endpoints. The SDK accepts both `services` and `endpoints` when reading, and normalizes to `endpoints` internally.

```json
{
  "name": "My Agent",
  "description": "An AI agent that does X",
  "image": "ipfs://Qm... or https://...",
  "endpoints": [
    { "type": "MCP|A2A|ENS|OASF", "value": "<url>", "meta": { "version": "...", ...capabilities } }
  ],
  "trustModels": ["reputation", "crypto-economic", "tee-attestation"],
  "owners": ["0x..."], "operators": ["0x..."],
  "active": true, "x402support": false,
  "metadata": {}, "updatedAt": 1706000000
}
```

`Agent.registerOnChain()` publishes the same logical registration JSON as a `data:application/json;base64,...` `agentURI`. `SDK.loadAgent()` in v1.6.0+ can decode those ERC-8004 data URIs directly.

## Agent Summary / Feedback / Reputation Summary

See `AgentSummary`, `Feedback`, and `getReputationSummary()` types in `sdk-types.md`.

## Feedback File (off-chain enrichment, uploaded to IPFS)

Fields: `text`, `proofOfPayment`, `mcpTool`, `mcpPrompt`, `mcpResource`, `a2aSkills`, `a2aContextId`, `a2aTaskId`, `oasfSkills`, `oasfDomains`.

## On-Chain Metadata

Key-value pairs on the Identity Registry (not in registration file). Values are `bytes` (hex-encoded). Reserved key: `agentWallet` (set via `setAgentWallet` with EIP-712 signature, not `setMetadata`).

## Agent Wallet (EIP-712)

Requires EIP-712 typed signature from new wallet. Domain: `{ name: "ERC8004IdentityRegistry", version: "1", chainId, verifyingContract }`. Type: `AgentWalletSet { agentId: uint256, newWallet: address, owner: address, deadline: uint256 }`. Deadline within 300s of chain time.
