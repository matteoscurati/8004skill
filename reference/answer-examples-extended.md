# Answer Examples — Extended

> As of agent0-sdk v1.6.0, March 2026.

Niche response templates. For common queries, see `answer-examples.md`.


## "whoami" / "show my agent profile"

Structure: Identity card with trust label + endpoints + identity proof

```
[Execute sequentially: load-agent.ts, reputation.ts, wallet.ts --action get, verify.ts --action sign]

**Agent**: Code Reviewer (`8453:12`)
**Status**: Active
**Trust**: 🟢 Trusted -- 74/100 (15 reviews)
**Wallet**: `0x1234...5678`
**Owners**: `0xABC...DEF`

**Endpoints**:
- MCP: https://mcp.example.com (3 tools)
- A2A: https://a2a.example.com/agent-card

**OASF**: code-review, static-analysis

**Identity Proof**: Verified -- signature matches on-chain wallet

Would you like to update your agent, check recent feedback, or inspect your x402 payment status?
```


## "Add an A2A endpoint and OASF skills to my agent"

Structure: Current state -> Changes -> Confirmation -> Execute

```
[Load agent first]

**Proposed Changes**:
| Field | Old | New |
|-------|-----|-----|
| A2A | (none) | `https://a2a.example.com/agent-card` |
| OASF Skills | `code-review` | `code-review, static-analysis, linting` |

**Update Summary**: Agent 8453:12 on Base, signer 0xABC...DEF, storage ipfs (pinata).
Proceed?

[Execute: update-agent.ts with --a2a-endpoint and --skills flags]
Updated. Tx: 0xabc...123 (explorer link). New metadata URI pinned.
```


## "Is my agent payment-ready?"

Structure: Readiness checklist -> Status -> Next steps

```
[Execute: x402-status.ts]

**X402 Payment Readiness -- Code Reviewer (`8453:12`)**

| Condition | Status |
|-----------|--------|
| x402 support enabled | ✅ Yes |
| Active status | ✅ Yes |
| Wallet address set | ✅ `0x1234...5678` |
| At least one endpoint | ✅ MCP |

**Status**: ✅ Payment-ready

awal commands: `npx awal x402 details <url>`, `npx awal x402 pay <url>`, `npx awal x402 bazaar search "..."`.
Note: Server must use `x402-express` middleware. See `x402-integration.md`.

[If NOT ready, show missing conditions and next steps to fix each.]
```


## "Transfer agent 8453:12 to 0xNewOwner"

Structure: Warning -> Confirmation -> Execute

```
⚠️ **WARNING: Irreversible.** You will lose all control over this agent.

**Transfer Summary**
- **Agent**: Code Reviewer (`8453:12`)
- **Current Owner**: `0xABC...DEF`
- **New Owner**: `0xNewOwner`
- **Chain**: Base (8453)

Are you sure? This cannot be undone.

[After explicit confirmation, execute transfer.ts]
Transfer complete. Tx: 0xdef...456 (explorer link). New owner: `0xNewOwner`.
```
