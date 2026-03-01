# SDK Types Reference

> As of agent0-sdk v1.5.3, March 2026.

## AgentSummary

Returned by `sdk.searchAgents()` and `sdk.getAgent()`. Contains subgraph data including fields not available on the `Agent` class.

```typescript
{
  chainId: number, agentId: string, name: string, description: string, image?: string,
  owners: Address[], operators: Address[],
  // Endpoints (short names — differs from Agent class which uses mcpEndpoint, a2aEndpoint, etc.)
  mcp?: string, a2a?: string, web?: string, email?: string, ens?: string, did?: string, walletAddress?: string,
  // Capabilities (non-optional arrays, default [])
  supportedTrusts: string[], a2aSkills: string[], mcpTools: string[], mcpPrompts: string[],
  mcpResources: string[], oasfSkills: string[], oasfDomains: string[],
  // Status
  active: boolean, x402support: boolean,
  // Metadata
  createdAt?: number, updatedAt?: number, lastActivity?: number,
  agentURI?: string, agentURIType?: string,
  feedbackCount?: number, averageValue?: number, semanticScore?: number,
  extras: Record<string, any>,
}
```

## Feedback

Returned by `sdk.giveFeedback()`, `sdk.getFeedback()`, `sdk.searchFeedback()`, `sdk.revokeFeedback()`, and `sdk.appendResponse()`.

```typescript
{
  id: [AgentId, Address, number], agentId: string, reviewer: Address, txHash?: string,
  value?: number, tags: string[], endpoint?: string, text?: string,
  context?: Record<string, any>, proofOfPayment?: Record<string, any>, fileURI?: string,
  createdAt: number, answers: Array<Record<string, any>>, isRevoked: boolean,
  capability?: string, name?: string, skill?: string, task?: string,
}
```

## TransactionHandle

See `sdk-api.md` for the full TransactionHandle lifecycle (`.hash`, `.waitMined()`).

## Enums

### EndpointType

```typescript
enum EndpointType {
  MCP = 'MCP',
  A2A = 'A2A',
  ENS = 'ENS',
  DID = 'DID',
  WALLET = 'wallet',  // Note: lowercase
  OASF = 'OASF',
}
```

### TrustModel

```typescript
type TrustModel = 'reputation' | 'crypto-economic' | 'tee-attestation';
```
