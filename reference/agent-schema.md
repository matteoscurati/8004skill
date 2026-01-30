# ERC-8004 Data Structures

## Agent Registration File (IPFS/HTTP metadata)

```json
{
  "name": "My Agent",
  "description": "An AI agent that does X",
  "image": "ipfs://Qm... or https://...",
  "endpoints": [
    {
      "type": "MCP",
      "value": "https://mcp.example.com/sse",
      "meta": {
        "version": "2025-06-18",
        "mcpTools": ["tool1", "tool2"],
        "mcpPrompts": ["prompt1"],
        "mcpResources": ["resource1"]
      }
    },
    {
      "type": "A2A",
      "value": "https://a2a.example.com/.well-known/agent.json",
      "meta": {
        "version": "0.30",
        "a2aSkills": ["skill1"]
      }
    },
    {
      "type": "ENS",
      "value": "myagent.eth",
      "meta": { "version": "1.0" }
    },
    {
      "type": "OASF",
      "value": "https://github.com/agntcy/oasf/",
      "meta": {
        "version": "v0.8.0",
        "skills": ["natural_language_processing/summarization"],
        "domains": ["finance_and_business/investment_services"]
      }
    }
  ],
  "trustModels": ["reputation", "crypto-economic", "tee-attestation"],
  "owners": ["0x..."],
  "operators": ["0x..."],
  "active": true,
  "x402support": false,
  "metadata": {},
  "updatedAt": 1706000000
}
```

## Agent Summary (from subgraph/search)

```json
{
  "chainId": 11155111,
  "agentId": "11155111:42",
  "name": "My Agent",
  "description": "...",
  "image": "ipfs://...",
  "owners": ["0x..."],
  "operators": [],
  "mcp": true,
  "a2a": false,
  "ens": "myagent.eth",
  "walletAddress": "0x...",
  "supportedTrusts": ["reputation"],
  "a2aSkills": [],
  "mcpTools": ["tool1"],
  "mcpPrompts": [],
  "mcpResources": [],
  "active": true,
  "x402support": false,
  "extras": {}
}
```

## Feedback Structure

```json
{
  "id": ["11155111:42", "0xReviewerAddress", 0],
  "agentId": "11155111:42",
  "reviewer": "0xReviewerAddress",
  "txHash": "0x...",
  "value": 85,
  "tags": ["quality", "speed"],
  "endpoint": "https://mcp.example.com",
  "text": "Great agent, fast responses",
  "context": {},
  "fileURI": "ipfs://...",
  "createdAt": 1706000000,
  "answers": [],
  "isRevoked": false,
  "capability": "tools",
  "name": "tool1"
}
```

## Feedback File (off-chain enrichment, uploaded to IPFS)

```json
{
  "text": "Detailed feedback text",
  "context": { "sessionId": "...", "duration": 120 },
  "proofOfPayment": { "txHash": "0x...", "amount": "0.01 ETH" },
  "capability": "tools",
  "name": "summarize",
  "skill": "summarization",
  "task": "document_summary"
}
```

## Reputation Summary

```json
{
  "count": 15,
  "averageValue": 82.5
}
```

Value range: -100 to 100 (stored as int128 with 2 decimal places on-chain).

## On-Chain Metadata

Metadata key-value pairs stored directly on the Identity Registry (not in the registration file). Accessed via `setMetadata(agentId, key, value)` and `getMetadata(agentId, key)`. Values are `bytes` (hex-encoded).

Reserved key: `agentWallet` (set via `setAgentWallet` with EIP-712 signature, not via `setMetadata`).

## Agent Wallet (EIP-712)

Setting an agent wallet requires an EIP-712 typed signature from the new wallet address. The typed data has:
- Domain: `{ name: "ERC8004IdentityRegistry", version: "1", chainId, verifyingContract }`
- Type: `AgentWalletSet { agentId: uint256, newWallet: address, owner: address, deadline: uint256 }`
- Deadline must be within 300 seconds of chain time.
