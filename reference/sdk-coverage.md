# SDK Coverage Manifest

> As of agent0-sdk v1.6.0, March 2026.

This file maps each public `SDK` and `Agent` method used by the skill to an operational script or an explicit reference-only note.

## SDK Methods

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

## Agent Methods

| Public API | Skill coverage |
|---|---|
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
| `Agent.transfer()` | Operationally equivalent outcome is covered by `scripts/transfer.ts` via `SDK.transferAgent()` |

## Reference-Only Scope

- Validation registry request/response flows remain reference-only because the public `SDK` package does not yet expose validation helpers in `v1.6.0`. See `validation-registry.md`.
