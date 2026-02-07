# ERC-8004 Data Structures

## Agent Registration File (IPFS/HTTP metadata)

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

## Agent Summary / Feedback / Reputation Summary

See `AgentSummary`, `Feedback`, and `getReputationSummary()` types in sdk-api.md.

## Feedback File (off-chain enrichment, uploaded to IPFS)

Fields: `text`, `context`, `proofOfPayment`, `capability`, `name`, `skill`, `task`.

## On-Chain Metadata

Key-value pairs on the Identity Registry (not in registration file). Values are `bytes` (hex-encoded). Reserved key: `agentWallet` (set via `setAgentWallet` with EIP-712 signature, not `setMetadata`).

## Agent Wallet (EIP-712)

Requires EIP-712 typed signature from new wallet. Domain: `{ name: "ERC8004IdentityRegistry", version: "1", chainId, verifyingContract }`. Type: `AgentWalletSet { agentId: uint256, newWallet: address, owner: address, deadline: uint256 }`. Deadline within 300s of chain time.
