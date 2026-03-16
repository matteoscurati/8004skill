# Answer Templates

> As of agent0-sdk v1.7.1, March 2026.

Reusable formatting templates for consistent output.

---

## Agent Card

```
**{name}** (`{agentId}`)
{trustEmoji} {trustLabel} -- {averageValue}/100 ({count} reviews)
Status: {active ? "Active" : "Inactive"} -- Chain: {chainName} ({chainId})
Endpoints: {endpointList}
```

## Search Results Table

```
| # | Agent ID | Name | MCP | A2A | Description |
|---|----------|------|-----|-----|-------------|
```

## Reputation Summary

```
{trustEmoji} {trustLabel} -- {averageValue}/100 ({count} reviews)
| # | Reviewer | Rating | Tags | Date |
|---|----------|--------|------|------|
```

## Operation Confirmation

```
**{operationName}**
- Chain: {chainName} ({chainId})
- Signer: {signerAddress}
- [operation-specific fields]
- Est. gas: ~{gasEstimate}
Proceed?
```

## Error Report

```
**Error**: {errorMessage}
**Cause**: {likelyCause}
**Fix**: {suggestedFix}
See `troubleshooting.md` for more details.
```
