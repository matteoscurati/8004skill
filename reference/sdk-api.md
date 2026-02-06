# agent0-sdk API Reference

## SDK Class

```typescript
import { SDK } from 'agent0-sdk';

const sdk = new SDK({
  chainId: number,           // Required: EVM chain ID
  rpcUrl: string,            // Required: RPC endpoint
  walletProvider?: EIP1193Provider,  // EIP-1193 provider (used by this skill via WalletConnect)
  privateKey?: string,       // Hex private key (not used by this skill)
  signer?: string,           // Alias for privateKey (not used by this skill)
  ipfs?: 'pinata' | 'filecoinPin' | 'node',
  pinataJwt?: string,        // Required if ipfs='pinata'
  filecoinPrivateKey?: string, // Required if ipfs='filecoinPin'
  ipfsNodeUrl?: string,      // Required if ipfs='node'
  subgraphUrl?: string,                          // Subgraph URL for the active chain
  subgraphOverrides?: Record<number, string>,     // Per-chain subgraph URL overrides
  registryOverrides?: Record<number, Record<string, string>>,
});
```

### SDK Methods

```typescript
// Agent lifecycle
sdk.createAgent(name: string, description: string, image?: string): Agent
sdk.loadAgent(agentId: string): Promise<Agent>
sdk.getAgent(agentId: string): Promise<AgentSummary | null>

// Search
sdk.searchAgents(filters?: SearchFilters, options?: SearchOptions): Promise<AgentSummary[]>

// Feedback
sdk.giveFeedback(agentId, value: number | string, tag1?, tag2?, endpoint?, feedbackFile?): Promise<TransactionHandle<Feedback>>
  // value accepts decimals: e.g. 85, "99.77", "-3.2". The SDK encodes as int128 value + uint8 valueDecimals.
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
// Read-only properties
agent.agentId: string | undefined
agent.agentURI: string | undefined
agent.name: string
agent.description: string
agent.image: string | undefined
agent.mcpEndpoint: string | undefined
agent.a2aEndpoint: string | undefined
agent.ensEndpoint: string | undefined
agent.walletAddress: string | undefined
agent.mcpTools: string[] | undefined
agent.mcpPrompts: string[] | undefined
agent.mcpResources: string[] | undefined
agent.a2aSkills: string[] | undefined

// Endpoint management (chainable)
agent.setMCP(endpoint, version?, autoFetch?): Promise<this>
agent.setA2A(agentcard, version?, autoFetch?): Promise<this>
agent.setENS(name, version?): this
agent.removeEndpoint(opts?): this

// OASF skills/domains
agent.addSkill(slug, validateOASF?): this
agent.removeSkill(slug): this
agent.addDomain(slug, validateOASF?): this
agent.removeDomain(slug): this

// Configuration (chainable)
agent.setActive(active: boolean): this
agent.setX402Support(x402Support: boolean): this
agent.setTrust(reputation?, cryptoEconomic?, teeAttestation?): this
agent.setMetadata(kv: Record<string, unknown>): this
agent.delMetadata(key: string): this
agent.updateInfo(name?, description?, image?): this

// Wallet (on-chain)
agent.setWallet(newWallet, opts?): Promise<TransactionHandle<RegistrationFile> | undefined>
  // opts: { deadline?: number, newWalletPrivateKey?: string, signature?: string | Uint8Array }
  // This skill uses the signature option or lets the SDK handle signing via walletProvider.
  // Returns undefined when wallet is already set to the target address
agent.unsetWallet(): Promise<TransactionHandle<RegistrationFile> | undefined>
  // Returns undefined when wallet is already unset
agent.getWallet(): Promise<Address | undefined>

// Registration (on-chain)
agent.registerIPFS(): Promise<TransactionHandle<RegistrationFile>>
agent.registerHTTP(uri): Promise<TransactionHandle<RegistrationFile>>
agent.setAgentURI(uri): Promise<TransactionHandle<RegistrationFile>>

// Ownership
agent.transfer(newOwner): Promise<TransactionHandle>

// Data
agent.getRegistrationFile(): RegistrationFile
agent.getMetadata(): Record<string, unknown>
```

## TransactionHandle

```typescript
const handle = await agent.registerIPFS();
handle.hash     // transaction hash (0x...)
await handle.waitMined(opts?)   // wait for confirmation, returns { result: T }
await handle.waitConfirmed(opts?)  // alias for waitMined()
// T is the generic type of TransactionHandle<T> (e.g. RegistrationFile, Feedback)
```

### TransactionWaitOptions

```typescript
{
  timeoutMs?: number,       // max wait time in ms (default: 120_000)
  confirmations?: number,   // number of block confirmations to wait for (default: 1)
  throwOnRevert?: boolean,  // throw if tx reverts (default: true)
}
```

## AgentSummary

Returned by `sdk.searchAgents()` and `sdk.getAgent()`. Contains subgraph data including fields not available on the `Agent` class.

```typescript
{
  // Identity
  chainId: number,
  agentId: string,
  name: string,
  description: string,
  image?: string,
  owners: Address[],
  operators: Address[],

  // Endpoints (field names differ from Agent class: mcp not mcpEndpoint)
  mcp?: string,              // MCP endpoint URL
  a2a?: string,              // A2A agent card URL
  web?: string,              // Web endpoint URL
  email?: string,            // Email endpoint
  ens?: string,              // ENS name
  did?: string,              // DID identifier
  walletAddress?: string,

  // Capabilities (non-optional arrays, may be empty)
  supportedTrusts: string[],
  a2aSkills: string[],
  mcpTools: string[],
  mcpPrompts: string[],
  mcpResources: string[],
  oasfSkills: string[],
  oasfDomains: string[],

  // Status (non-optional booleans)
  active: boolean,
  x402support: boolean,

  // Metadata
  createdAt?: number,
  updatedAt?: number,
  lastActivity?: number,
  agentURI?: string,
  agentURIType?: string,
  feedbackCount?: number,
  averageValue?: number,
  semanticScore?: number,    // Present when semantic search is used
  extras: Record<string, any>,
}
```

> **Note:** `AgentSummary` endpoint fields (`mcp`, `a2a`, `ens`, etc.) use short names.
> The `Agent` class uses longer names (`mcpEndpoint`, `a2aEndpoint`, `ensEndpoint`).
> Array fields (`mcpTools`, `a2aSkills`, etc.) are non-optional and default to `[]`.

## SearchFilters

```typescript
{
  chains?: number[] | 'all',   // Multi-chain search
  agentIds?: AgentId[],
  name?: string,               // Case-insensitive substring
  description?: string,        // Semantic search
  owners?: Address[],
  operators?: Address[],
  hasRegistrationFile?: boolean,
  hasWeb?: boolean,            // Has web endpoint
  hasMCP?: boolean,            // Has MCP endpoint
  hasA2A?: boolean,            // Has A2A endpoint
  hasOASF?: boolean,           // Has OASF skills/domains
  hasEndpoints?: boolean,      // Has any endpoint
  webContains?: string,
  mcpContains?: string,
  a2aContains?: string,
  ensContains?: string,
  didContains?: string,
  walletAddress?: Address,
  supportedTrust?: string[],
  a2aSkills?: string[],
  mcpTools?: string[],
  mcpPrompts?: string[],
  mcpResources?: string[],
  oasfSkills?: string[],       // Filter by OASF skill slugs
  oasfDomains?: string[],      // Filter by OASF domain slugs
  active?: boolean,
  x402support?: boolean,
  registeredAtFrom?: Date | string | number,
  registeredAtTo?: Date | string | number,
  updatedAtFrom?: Date | string | number,
  updatedAtTo?: Date | string | number,
  hasMetadataKey?: string,
  metadataValue?: { key: string, value: string },
  keyword?: string,            // Full-text keyword search
  feedback?: FeedbackFilters,  // Sub-filter for feedback criteria
}
```

## SearchOptions

```typescript
{
  sort?: string[],             // e.g. ["name:asc", "createdAt:desc"]
  semanticMinScore?: number,   // Min similarity score for semantic search
  semanticTopK?: number,       // Max results for semantic pre-filter
}
```

## FeedbackSearchFilters

```typescript
{
  agentId?: AgentId,           // Now optional (was required)
  agents?: AgentId[],          // Search across multiple agents
  tags?: string[],
  reviewers?: Address[],       // Filter by reviewer addresses
  capabilities?: string[],
  skills?: string[],
  tasks?: string[],
  names?: string[],
  includeRevoked?: boolean,
}
```

## FeedbackSearchOptions

```typescript
{
  minValue?: number,
  maxValue?: number,
}
```

## FeedbackFilters (SearchFilters sub-filter)

Used as `SearchFilters.feedback` to filter agents by their feedback characteristics.

```typescript
{
  hasFeedback?: boolean,
  hasNoFeedback?: boolean,     // Agents with zero feedback
  includeRevoked?: boolean,
  minValue?: number,
  maxValue?: number,
  minCount?: number,
  maxCount?: number,
  fromReviewers?: Address[],
  endpoint?: string,
  hasResponse?: boolean,
  tag1?: string,
  tag2?: string,
  tag?: string,
}
```

## Value Encoding Utilities

The SDK exports helpers for encoding/decoding reputation values with decimal precision:

```typescript
import { encodeReputationValue, decodeReputationValue } from 'agent0-sdk';

// Encode a decimal value for on-chain storage
const { value, valueDecimals } = encodeReputationValue(99.77);
// value: 9977n (bigint), valueDecimals: 2

// Decode on-chain values back to a number
const decoded = decodeReputationValue(9977n, 2);
// decoded: 99.77
```

## Enums

```typescript
enum EndpointType {
  MCP = "MCP",
  A2A = "A2A",
  ENS = "ENS",
  DID = "DID",
  WALLET = "wallet",
  OASF = "OASF",
}

enum TrustModel {
  REPUTATION = "reputation",
  CRYPTO_ECONOMIC = "crypto-economic",
  TEE_ATTESTATION = "tee-attestation",
}
```

## Feedback

```typescript
{
  id: [AgentId, Address, number],  // FeedbackIdTuple
  agentId: string,
  reviewer: Address,
  txHash?: string,           // Transaction hash (when created via SDK)
  value?: number,
  tags: string[],
  endpoint?: string,         // On-chain field (Jan 2026)
  text?: string,
  context?: Record<string, any>,
  proofOfPayment?: Record<string, any>,
  fileURI?: string,
  createdAt: number,
  answers: Array<Record<string, any>>,
  isRevoked: boolean,
  capability?: string,
  name?: string,
  skill?: string,
  task?: string,
}
```

## ID Utilities

```typescript
import { parseAgentId, formatAgentId, parseFeedbackId, formatFeedbackId } from 'agent0-sdk';

parseAgentId('11155111:42')        // { chainId: 11155111, tokenId: 42 }
formatAgentId(11155111, 42)        // '11155111:42'
parseFeedbackId('1:42:0xabc:0')    // { agentId: '1:42', clientAddress: '0xabc', feedbackIndex: 0 }
formatFeedbackId('1:42', '0xabc', 0) // '1:42:0xabc:0'
```

## Validation Utilities

```typescript
import { isValidAddress, isValidAgentId, isValidURI, isValidFeedbackValue, normalizeAddress } from 'agent0-sdk';

isValidAddress('0x...')     // boolean — validates Ethereum address format
isValidAgentId('1:42')      // boolean — validates chainId:tokenId format
isValidURI('ipfs://...')    // boolean — basic URI validation
isValidFeedbackValue(85)    // boolean — 0-100 range check
normalizeAddress('0xABC')   // '0xabc' — lowercase normalization
```

## Signature Utilities

```typescript
import { normalizeEcdsaSignature, recoverMessageSigner, recoverTypedDataSigner } from 'agent0-sdk';

normalizeEcdsaSignature(sig)                           // Normalize ECDSA signature format
await recoverMessageSigner({ message, signature })     // Recover signer address from signed message
await recoverTypedDataSigner({ domain, types, primaryType, message, signature }) // Recover from EIP-712
```

## EndpointCrawler

```typescript
import { EndpointCrawler } from 'agent0-sdk';

const crawler = new EndpointCrawler(timeoutMs?);
await crawler.fetchMcpCapabilities(endpoint)   // { mcpTools?, mcpPrompts?, mcpResources? } | null
await crawler.fetchA2aCapabilities(endpoint)   // { a2aSkills? } | null
```

## AgentIndexer

```typescript
import { AgentIndexer } from 'agent0-sdk';

const indexer = new AgentIndexer(subgraphClient?, subgraphUrlOverrides?, defaultChainId?);
await indexer.getAgent(agentId)                           // AgentSummary
await indexer.searchAgents(filters?, options?)             // AgentSummary[]
```

## Constants

```typescript
import { IPFS_GATEWAYS, TIMEOUTS, DEFAULTS } from 'agent0-sdk';

IPFS_GATEWAYS   // ['https://gateway.pinata.cloud/ipfs/', 'https://ipfs.io/ipfs/', 'https://dweb.link/ipfs/']
TIMEOUTS        // { IPFS_GATEWAY: 10000, PINATA_UPLOAD: 80000, TRANSACTION_WAIT: 45000, ... }
DEFAULTS        // { FEEDBACK_EXPIRY_HOURS: 24, SEARCH_PAGE_SIZE: 50 }
```

## Semantic Search Service

Direct API call (no SDK needed). Override URL via `SEARCH_API_URL` env var.

```
POST https://agent0-semantic-search.dawid-pisarczyk.workers.dev/api/v1/search
Content-Type: application/json

{
  "query": "natural language description",
  "limit": 10,
  "filters": {
    "in": { "chainId": [11155111] },
    "exists": ["mcpEndpoint"]
  }
}
```
