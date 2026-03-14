# Validation Registry

> As of agent0-sdk v1.6.0, March 2026. Contract support exists, but the public `SDK` class still does not expose validation request/response helpers.

## Purpose

The Validation Registry is the third ERC-8004 on-chain registry, alongside Identity and Reputation. It stores third-party attestations about agents from designated validators (auditors, TEE enclaves, monitoring services).

**Key difference from Reputation**: The Reputation Registry records peer feedback — any address can rate any agent. The Validation Registry records structured attestations from specific validator addresses requested by the agent owner. Reputation is subjective opinion; validation is third-party verification.

## How It Works

1. **Agent owner requests validation**: Calls `validationRequest()` specifying a validator address, agent ID, a request URI (off-chain document describing what to validate), and a request hash.
2. **Validator responds**: The designated validator calls `validationResponse()` with a score (0-100), response URI, response hash, and an optional tag.
3. **Results are queryable**: Anyone can read validation status, per-agent summaries, and filter by validator or tag.

## Contract Functions

### Write Functions

| Function | Caller | Description |
|---|---|---|
| `validationRequest(validatorAddress, agentId, requestURI, requestHash)` | Agent owner or operator | Request validation from a specific validator. Each request hash must be unique. |
| `validationResponse(requestHash, response, responseURI, responseHash, tag)` | Designated validator only | Respond to a validation request. Score is 0-100. Can be updated by calling again (overwrites previous response). |

### Read Functions

| Function | Returns | Description |
|---|---|---|
| `getValidationStatus(requestHash)` | `(validatorAddress, agentId, response, responseHash, tag, lastUpdate)` | Full status of a single validation request. |
| `getSummary(agentId, validatorAddresses[], tag)` | `(count, avgResponse)` | Aggregated validation stats for an agent. Filter by validator addresses (empty = all) and tag (empty = all). |
| `getAgentValidations(agentId)` | `bytes32[]` | All request hashes for an agent. |
| `getValidatorRequests(validatorAddress)` | `bytes32[]` | All request hashes a validator has been asked to handle. |

## Data Model

```
ValidationStatus {
  validatorAddress  address    // Who was asked to validate
  agentId           uint256    // Which agent
  response          uint8      // 0-100 score (0 = no response yet)
  responseHash      bytes32    // Hash of off-chain response document
  tag               string     // Category tag (e.g. "uptime", "security-audit")
  lastUpdate        uint256    // Block timestamp of last update
  hasResponse       bool       // Whether validator has responded
}
```

## Current SDK Support

As of v1.6.0, the public `agent0-sdk` package exposes `sdk.validationRegistryAddress()` but does not expose validation request/response/read wrappers on `SDK`. To interact with validation today:

- Use the contract ABI directly via viem/ethers against the deployed addresses
- Provide a `REGISTRY_ADDRESS_VALIDATION` override when working on chains where the validation registry is deployed
- Use your own indexing layer or subgraph if you need query workflows around validation events

This is expected to gain first-class SDK wrapper methods in a future release. The 8004skill keeps validation as a reference-only area until those public APIs ship in the package itself.

## Use Cases

- **TEE attestation**: A TEE enclave validates that an agent runs in a secure environment and attests on-chain.
- **Security audits**: An auditor reviews an agent's code/behavior and records a score.
- **Uptime monitoring**: A monitoring service (e.g. watchtower) periodically validates endpoint reachability.
- **Compliance checks**: A regulatory validator attests that an agent meets specific standards.
