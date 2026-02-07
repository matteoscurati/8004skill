# agent0-sdk API Reference

## SDK Class

```typescript
import { SDK } from 'agent0-sdk';

const sdk = new SDK({
  chainId: number,           // Required: EVM chain ID
  rpcUrl: string,            // Required: RPC endpoint
  walletProvider?: EIP1193Provider,  // EIP-1193 provider (WalletConnect)
  ipfs?: 'pinata' | 'filecoinPin' | 'node',
  pinataJwt?: string, filecoinPrivateKey?: string, ipfsNodeUrl?: string,
  subgraphUrl?: string, subgraphOverrides?: Record<number, string>,
  registryOverrides?: Record<number, Record<string, string>>,
});
```

### SDK Methods

```typescript
// Agent lifecycle
sdk.createAgent(name, description, image?): Agent
sdk.loadAgent(agentId): Promise<Agent>
sdk.getAgent(agentId): Promise<AgentSummary | null>
sdk.searchAgents(filters?: SearchFilters, options?: SearchOptions): Promise<AgentSummary[]>

// Feedback — value accepts decimals: e.g. 85, "99.77", "-3.2" (SDK encodes as int128 + uint8 valueDecimals)
sdk.giveFeedback(agentId, value, tag1?, tag2?, endpoint?, feedbackFile?): Promise<TransactionHandle<Feedback>>
sdk.getFeedback(agentId, clientAddress, feedbackIndex): Promise<Feedback>
sdk.searchFeedback(filters: FeedbackSearchFilters, options?: FeedbackSearchOptions): Promise<Feedback[]>
sdk.revokeFeedback(agentId, feedbackIndex): Promise<TransactionHandle<Feedback>>
sdk.appendResponse(agentId, clientAddress, feedbackIndex, { uri, hash }): Promise<TransactionHandle<Feedback>>
sdk.prepareFeedbackFile(input: { text?, capability?, name?, skill?, task? }): FeedbackFileInput
sdk.getReputationSummary(agentId, tag1?, tag2?): Promise<{ count: number, averageValue: number }>

// Ownership
sdk.transferAgent(agentId, newOwner): Promise<TransactionHandle>
sdk.isAgentOwner(agentId, address): Promise<boolean>
sdk.getAgentOwner(agentId): Promise<Address>

// Properties
sdk.isReadOnly: boolean
sdk.registries(): Record<string, Address>
```

## Agent Class

```typescript
// Properties: agentId, agentURI, name, description, image, mcpEndpoint, a2aEndpoint, ensEndpoint,
//   walletAddress, mcpTools, mcpPrompts, mcpResources, a2aSkills (all string | string[] | undefined)

// Endpoints (chainable): setMCP(endpoint, version?, autoFetch?), setA2A(agentcard, version?, autoFetch?),
//   setENS(name, version?), removeEndpoint(opts?)

// OASF: addSkill(slug, validate?), removeSkill(slug), addDomain(slug, validate?), removeDomain(slug)

// Config (chainable): setActive(bool), setX402Support(bool), setTrust(reputation?, cryptoEconomic?, teeAttestation?),
//   setMetadata(kv), delMetadata(key), updateInfo(name?, description?, image?)

// Wallet: setWallet(addr, opts?), unsetWallet(), getWallet() — opts: { deadline?, newWalletPrivateKey?, signature? }
//   setWallet/unsetWallet return undefined when wallet already matches target state

// Registration: registerIPFS(), registerHTTP(uri), setAgentURI(uri) — all return TransactionHandle<RegistrationFile>
// Ownership: transfer(newOwner) — returns TransactionHandle
// Data: getRegistrationFile(), getMetadata()
```

## TransactionHandle

```typescript
const handle = await agent.registerIPFS();
handle.hash     // transaction hash (0x...)
await handle.waitMined(opts?)   // wait for confirmation, returns { result: T }
// TransactionWaitOptions: { timeoutMs?: number (default 120000), confirmations?: number (default 1), throwOnRevert?: boolean (default true) }
```

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

## SearchFilters

```typescript
{
  chains?: number[] | 'all', agentIds?: AgentId[], name?: string, description?: string,
  owners?: Address[], operators?: Address[], walletAddress?: Address,
  // Endpoint filters
  hasRegistrationFile?: boolean, hasWeb?: boolean, hasMCP?: boolean, hasA2A?: boolean,
  hasOASF?: boolean, hasEndpoints?: boolean,
  webContains?: string, mcpContains?: string, a2aContains?: string, ensContains?: string, didContains?: string,
  // Capability filters
  supportedTrust?: string[], a2aSkills?: string[], mcpTools?: string[], mcpPrompts?: string[], mcpResources?: string[],
  oasfSkills?: string[], oasfDomains?: string[],
  // Status & time
  active?: boolean, x402support?: boolean,
  registeredAtFrom?: Date | string | number, registeredAtTo?: Date | string | number,
  updatedAtFrom?: Date | string | number, updatedAtTo?: Date | string | number,
  // Metadata & keyword
  hasMetadataKey?: string, metadataValue?: { key: string, value: string }, keyword?: string,
  feedback?: FeedbackFilters,
}
```

## SearchOptions

```typescript
{ sort?: string[], semanticMinScore?: number, semanticTopK?: number }
```

## FeedbackSearchFilters & FeedbackSearchOptions

```typescript
// FeedbackSearchFilters
{ agentId?: AgentId, agents?: AgentId[], tags?: string[], reviewers?: Address[],
  capabilities?: string[], skills?: string[], tasks?: string[], names?: string[], includeRevoked?: boolean }

// FeedbackSearchOptions
{ minValue?: number, maxValue?: number }
```

## FeedbackFilters (SearchFilters sub-filter)

Used as `SearchFilters.feedback` to filter agents by feedback characteristics.

```typescript
{ hasFeedback?: boolean, hasNoFeedback?: boolean, includeRevoked?: boolean,
  minValue?: number, maxValue?: number, minCount?: number, maxCount?: number,
  fromReviewers?: Address[], endpoint?: string, hasResponse?: boolean,
  tag1?: string, tag2?: string, tag?: string }
```

## Enums

`EndpointType`: MCP, A2A, ENS, DID, WALLET, OASF
`TrustModel`: reputation, crypto-economic, tee-attestation

## Feedback

```typescript
{
  id: [AgentId, Address, number], agentId: string, reviewer: Address, txHash?: string,
  value?: number, tags: string[], endpoint?: string, text?: string,
  context?: Record<string, any>, proofOfPayment?: Record<string, any>, fileURI?: string,
  createdAt: number, answers: Array<Record<string, any>>, isRevoked: boolean,
  capability?: string, name?: string, skill?: string, task?: string,
}
```
