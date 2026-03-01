# agent0-sdk API Reference

> As of agent0-sdk v1.5.3, March 2026.

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
sdk.transferAgent(agentId, newOwner): Promise<TransactionHandle<{ txHash: string; from: Address; to: Address; agentId: AgentId }>>
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
await handle.waitMined(opts?)   // wait for confirmation, returns { receipt: ChainReceipt, result: T }
// TransactionWaitOptions: { timeoutMs?: number (default 120000), confirmations?: number (default 1), throwOnRevert?: boolean (default true) }
```

## Related References

- `search-filters.md` — SearchFilters, FeedbackFilters, SearchOptions
- `sdk-types.md` — AgentSummary, Feedback, Enums
