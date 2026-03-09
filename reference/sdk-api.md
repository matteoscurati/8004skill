# agent0-sdk API Reference

> As of agent0-sdk v1.6.0, March 2026.

## SDK Class

```typescript
import { SDK } from 'agent0-sdk';

const sdk = new SDK({
  chainId: number,           // Required: EVM chain ID
  rpcUrl: string,            // Required: RPC endpoint
  walletProvider?: EIP1193Provider,  // EIP-1193 provider (WalletConnect)
  ipfs?: 'pinata' | 'filecoinPin' | 'node' | 'helia',
  pinataJwt?: string, filecoinPrivateKey?: string, ipfsNodeUrl?: string,
  subgraphUrl?: string, subgraphOverrides?: Record<number, string>,
  registryOverrides?: Record<number, Record<string, string>>,
  registrationDataUriMaxBytes?: number,
});
```

### SDK Methods

```typescript
// Diagnostics / chain context
sdk.chainId(): Promise<number>
sdk.registries(): Record<string, Address>
sdk.identityRegistryAddress(): Address
sdk.reputationRegistryAddress(): Address
sdk.validationRegistryAddress(): Address
sdk.getSubgraphClient(chainId?): SubgraphClient | undefined
sdk.isReadOnly: boolean
sdk.chainClient: ChainClient
sdk.ipfsClient?: IPFSClient
sdk.subgraphClient?: SubgraphClient

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
sdk.prepareFeedbackFile(input: {
  text?, proofOfPayment?,
  mcpTool?, mcpPrompt?, mcpResource?,
  a2aSkills?, a2aContextId?, a2aTaskId?,
  oasfSkills?, oasfDomains?
}): FeedbackFileInput
sdk.getReputationSummary(agentId, tag1?, tag2?): Promise<{ count: number, averageValue: number }>

// Ownership
sdk.transferAgent(agentId, newOwner): Promise<TransactionHandle<{ txHash: string; from: Address; to: Address; agentId: AgentId }>>
sdk.isAgentOwner(agentId, address): Promise<boolean>
sdk.getAgentOwner(agentId): Promise<Address>
```

## Agent Class

```typescript
// Properties: agentId, agentURI, name, description, image, mcpEndpoint, a2aEndpoint, ensEndpoint,
//   walletAddress, mcpTools, mcpPrompts, mcpResources, a2aSkills (all string | string[] | undefined)

// Endpoints (chainable): setMCP(endpoint, version?, autoFetch?), setA2A(agentcard, version?, autoFetch?),
//   setENS(name, version?), removeEndpoint(opts?), removeEndpoints()

// OASF: addSkill(slug, validate?), removeSkill(slug), addDomain(slug, validate?), removeDomain(slug)

// Config (chainable): setActive(bool), setX402Support(bool), setTrust(reputation?, cryptoEconomic?, teeAttestation?),
//   setMetadata(kv), delMetadata(key), updateInfo(name?, description?, image?)

// Wallet: setWallet(addr, opts?), unsetWallet(), getWallet() — opts: { deadline?, newWalletPrivateKey?, signature? }
//   setWallet/unsetWallet return undefined when wallet already matches target state

// Registration: registerOnChain(), registerIPFS(), registerHTTP(uri), setAgentURI(uri)
//   all return TransactionHandle<RegistrationFile>
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

## Validation Registry Note

The public `agent0-sdk` package currently exposes `validationRegistryAddress()` but does **not** expose validation request/response helpers on `SDK`. Treat validation as reference-only from this skill for now; see `validation-registry.md`.

## Related References

- `search-filters.md` — SearchFilters, FeedbackFilters, SearchOptions
- `sdk-types.md` — AgentSummary, Feedback, Enums
