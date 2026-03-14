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

## Coverage Manifest

Maps each public method to the skill script that uses it.

| Public API | Skill coverage |
|---|---|
| `SDK.chainId()` | `scripts/sdk-info.ts` |
| `SDK.registries()` | `scripts/sdk-info.ts` |
| `SDK.identityRegistryAddress()` | `scripts/sdk-info.ts` |
| `SDK.reputationRegistryAddress()` | `scripts/sdk-info.ts` |
| `SDK.validationRegistryAddress()` | `scripts/sdk-info.ts` |
| `SDK.getSubgraphClient()` | `scripts/sdk-info.ts --subgraph-chain-id ...` |
| `SDK.createAgent()` | `scripts/register.ts` |
| `SDK.loadAgent()` | `scripts/load-agent.ts`, `scripts/connect.ts`, `scripts/update-agent.ts`, `scripts/wallet.ts` |
| `SDK.getAgent()` | `scripts/get-agent.ts` |
| `SDK.searchAgents()` | `scripts/search.ts` |
| `SDK.transferAgent()` | `scripts/transfer.ts` |
| `SDK.isAgentOwner()` | `scripts/ownership.ts --action is-owner` |
| `SDK.getAgentOwner()` | `scripts/ownership.ts --action get-owner` |
| `SDK.prepareFeedbackFile()` | `scripts/feedback.ts --action give` |
| `SDK.giveFeedback()` | `scripts/feedback.ts --action give` |
| `SDK.getFeedback()` | `scripts/feedback.ts --action get` |
| `SDK.searchFeedback()` | `scripts/reputation.ts` |
| `SDK.appendResponse()` | `scripts/respond-feedback.ts` |
| `SDK.revokeFeedback()` | `scripts/feedback.ts --action revoke` |
| `SDK.getReputationSummary()` | `scripts/reputation.ts`, `scripts/connect.ts`, `scripts/x402-status.ts`, `scripts/verify.ts` |
| `SDK.chainClient` | `scripts/sdk-info.ts` |
| `SDK.ipfsClient` | `scripts/sdk-info.ts` |
| `SDK.subgraphClient` | `scripts/sdk-info.ts` |
| `SDK.isReadOnly` | `scripts/sdk-info.ts` |
| `Agent.setMCP()` | `scripts/register.ts`, `scripts/update-agent.ts` |
| `Agent.setA2A()` | `scripts/register.ts`, `scripts/update-agent.ts` |
| `Agent.setENS()` | `scripts/update-agent.ts` |
| `Agent.removeEndpoint()` | `scripts/update-agent.ts` |
| `Agent.removeEndpoints()` | `scripts/update-agent.ts --remove-all-endpoints true` |
| `Agent.addSkill()` | `scripts/register.ts`, `scripts/update-agent.ts` |
| `Agent.removeSkill()` | `scripts/update-agent.ts` |
| `Agent.addDomain()` | `scripts/register.ts`, `scripts/update-agent.ts` |
| `Agent.removeDomain()` | `scripts/update-agent.ts` |
| `Agent.setWallet()` | `scripts/wallet.ts --action set` |
| `Agent.unsetWallet()` | `scripts/wallet.ts --action unset` |
| `Agent.getWallet()` | `scripts/wallet.ts --action get`, `scripts/load-agent.ts` |
| `Agent.setActive()` | `scripts/register.ts`, `scripts/update-agent.ts` |
| `Agent.setX402Support()` | `scripts/register.ts`, `scripts/update-agent.ts` |
| `Agent.setTrust()` | `scripts/register.ts`, `scripts/update-agent.ts` |
| `Agent.setMetadata()` | `scripts/update-agent.ts` |
| `Agent.getMetadata()` | `scripts/load-agent.ts` |
| `Agent.delMetadata()` | `scripts/update-agent.ts` |
| `Agent.getRegistrationFile()` | `scripts/load-agent.ts` |
| `Agent.updateInfo()` | `scripts/update-agent.ts` |
| `Agent.registerOnChain()` | `scripts/register.ts --storage onchain`, `scripts/update-agent.ts --storage onchain` |
| `Agent.registerIPFS()` | `scripts/register.ts --storage ipfs`, `scripts/update-agent.ts --storage ipfs` |
| `Agent.registerHTTP()` | `scripts/register.ts --storage http`, `scripts/update-agent.ts --storage http` |
| `Agent.setAgentURI()` | `scripts/update-agent.ts --storage http` |
| `Agent.transfer()` | Covered by `scripts/transfer.ts` via `SDK.transferAgent()` |

Validation registry request/response flows remain reference-only because the public `SDK` package does not yet expose validation helpers in `v1.6.0`. See `validation-registry.md`.

## Related References

- `search-filters.md` — SearchFilters, FeedbackFilters, SearchOptions, CLI flag mapping
- `sdk-types.md` — AgentSummary, Feedback, Enums
