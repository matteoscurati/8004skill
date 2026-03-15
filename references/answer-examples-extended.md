# Answer Examples — Extended

> As of agent0-sdk v1.7.0, March 2026.

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


## "Send a message to agent 8453:42" (A2A Messaging)

Structure: Load agent -> Verify A2A endpoint -> Send message -> Show response

```
[Execute: load-agent.ts to verify A2A endpoint exists]

**Messaging**: Code Reviewer (`8453:42`)
**A2A Endpoint**: https://a2a.example.com/agent-card

Sending message...

[Execute: agent.messageA2A() via SDK]

**Task**: `task-abc123`
**State**: completed

**Response**:
> I've reviewed your request. The contract at 0x1234... has 3 potential issues:
> 1. Reentrancy in withdraw() — use ReentrancyGuard
> 2. Unchecked return value on line 47
> 3. Missing access control on setAdmin()

Would you like to continue this conversation, start a new task, or leave feedback on this agent?
```

### A2A with payment required

```
[Execute: agent.messageA2A()]

**Payment Required**: Agent `8453:42` charges for responses.

**Payment Details**:
- Amount: 0.10 USDC
- Network: Base (8453)
- Recipient: `0x5678...9ABC`

Your maxAmount cap: 1.00 USDC ✅

Approve payment?

[After explicit confirmation, execute x402Payment.pay()]
Payment confirmed. Tx: 0xpay...789 (explorer link).

**Task**: `task-abc123`
**State**: completed

**Response**:
> Analysis complete. See the detailed report above.

Would you like to continue this task or start a new one?
```


## "Make an x402 request to https://agent.example.com/api/analyze" (X402 Payment)

Structure: Make request -> Show 402 details -> Confirm -> Pay -> Show response

```
[Execute: sdk.request() with the provided URL]

**X402 Payment Required**

The endpoint requires payment to access.

**Payment Options**:
| Scheme | Network | Amount | Description |
|--------|---------|--------|-------------|
| exact | Base | 0.05 USDC | Code analysis endpoint |

**Recipient**: `0xABC...DEF`

Your maxAmount cap: 1.00 USDC ✅

Approve payment?

[After explicit confirmation, execute x402Payment.pay()]
Payment confirmed. Tx: 0xpay...456 (explorer link). Amount: 0.05 USDC on Base.

**Response** (200 OK):
{
  "analysis": "No critical vulnerabilities found.",
  "warnings": 2,
  "details": [...]
}

Would you like to make another request or inspect the transaction?
```

### Auto-pay (autonomous agent with PRIVATE_KEY)

```
[Execute: sdk.fetchWithX402() with maxAmount cap]

Auto-paid 0.05 USDC on Base. Tx: 0xpay...456.

**Response** (200 OK):
{
  "analysis": "No critical vulnerabilities found."
}
```
