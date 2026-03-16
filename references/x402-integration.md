# X402 Payment Integration

> As of agent0-sdk v1.7.1, March 2026.

## What is X402?

X402 is an HTTP-based payment protocol (HTTP 402 Payment Required) enabling pay-per-request access to agent endpoints. Payments settle in USDC on Base (chain 8453). An agent exposes a monetizable endpoint; a client discovers the price via HTTP 402 and pays on-chain to unlock the response.

## Two-Tool Model

8004skill and `awal` (Coinbase agentic-wallet-skills) serve complementary roles:

| Concern | Tool | Wallet Model |
|---------|------|--------------|
| Identity, registration, metadata, signing | **8004skill** | WalletConnect v2 (non-custodial) |
| Payments, discovery, monetization | **awal** | Coinbase custodial wallet |

**awal is a separate install** — it is NOT bundled with or required by 8004skill. Install it independently: `npm install -g @coinbase/awal` or use via `npx awal`.

## Payment Readiness Checklist

An agent is "payment-ready" when all four conditions are true:

| # | Condition | How to set |
|---|-----------|------------|
| 1 | `x402support: true` | `--x402 true` on register or update |
| 2 | Active status | `--active true` (default) |
| 3 | Wallet address set | Operation 7 (wallet set) |
| 4 | At least one endpoint | `--mcp-endpoint` or `--a2a-endpoint` on register/update |

Check with: `npx tsx scripts/x402-status.ts --agent-id <id> --chain-id <chainId> --rpc-url <rpcUrl>`

## awal CLI Quick Reference

| Command | Purpose |
|---------|---------|
| `npx awal x402 details <url>` | Inspect x402 pricing on an endpoint |
| `npx awal x402 pay <url>` | Pay and call an x402 endpoint |
| `npx awal x402 bazaar search "<query>"` | Discover monetized agents |
| `npm install express x402-express` | Add x402 paywall to your own endpoint |

## Chain Name Handling (v1.7.1)

v1.7.1 improved x402 chain name normalization. Servers may send `network` values in different formats:
- **v1 format**: human-readable slugs like `"base-sepolia"`, `"ethereum-mainnet"`, `"avalanche"`
- **v2 format**: CAIP-2 identifiers like `"eip155:84532"`, `"eip155:1"`, `"eip155:43114"`

The SDK now normalizes both formats correctly, mapping between them as needed. The v2 payload also includes explicit `scheme` (e.g. `"exact"`) and `network` fields for improved server-side validation.

## SDK Payment Execution (v1.7.0+)

Starting with v1.7.0, the SDK provides built-in x402 payment handling. Two approaches:

### Manual Flow: `sdk.request()`

```typescript
const result = await sdk.request({
  url: 'https://agent.example.com/api/analyze',
  method: 'POST',
  body: JSON.stringify({ code: '...' }),
});

if (result.x402Required) {
  // Inspect payment details before paying
  console.log(result.x402Payment.accepts);  // Payment options (X402Accept[])
  console.log(result.x402Payment.resource); // Resource info (optional)

  // Execute payment (requires privateKey or walletProvider in SDK config)
  // pay() resolves to T (the parsed success response)
  const data = await result.x402Payment.pay();
  console.log(data);  // Unlocked response body (parsed JSON by default)
} else {
  // No payment required — result IS the parsed response (T & { x402Required?: false })
  console.log(result);
}
```

### `sdk.fetchWithX402()` (Alias)

`fetchWithX402()` is an alias for `sdk.request()` -- same single-object signature, same return type. It does NOT auto-pay.

```typescript
// Identical to sdk.request() — use whichever name reads better in context
const result = await sdk.fetchWithX402({
  url: 'https://agent.example.com/api/analyze',
  method: 'POST',
  body: JSON.stringify({ code: '...' }),
});
// result is X402RequestResult<T>: check result.x402Required to determine branch
```

### Signing Methods: WalletConnect vs PRIVATE_KEY

| Method | Config | Use Case | Approval |
|--------|--------|----------|----------|
| WalletConnect | `walletProvider` in SDKConfig | Interactive sessions | User approves each payment in wallet app |
| Private Key | `privateKey` in SDKConfig | Automated agents | No user approval — signs automatically |

**WalletConnect**: Safer for human-supervised agents. Each x402 payment triggers a signing request in the wallet app. The user sees the amount and recipient before approving.

**PRIVATE_KEY**: Required for fully autonomous agents that need to pay without human intervention. The key is loaded from `~/.8004skill/.env` (never in chat). Use the CLI-level `--max-amount` flag in `x402-pay.ts` to cap spending.

## A2A + X402 Combined Flow

When an agent's A2A endpoint requires payment, the SDK returns an `A2APaymentRequired` union variant (it is NOT a thrown exception):

```typescript
const agent = await sdk.loadAgent('8453:42');

// messageA2A returns a union: MessageResponse | TaskResponse | A2APaymentRequired
const result = await agent.messageA2A('Analyze this contract for vulnerabilities');

if (result.x402Required) {
  // Agent requires payment — inspect and pay
  console.log(result.x402Payment.accepts);  // Payment options
  console.log(result.x402Payment.price);    // Convenience price (single accept)

  // pay() resolves to the same type as a successful response (MessageResponse | TaskResponse)
  const response = await result.x402Payment.pay();
  console.log(response);  // Agent's response after payment
} else {
  // No payment required — result is MessageResponse or TaskResponse
  if ('task' in result) {
    // TaskResponse: server created a task
    const task = result.task;  // AgentTask handle
    const queryResult = await task.query();
  } else {
    // MessageResponse: direct reply
    console.log(result.parts);
  }
}
```

Note: `A2APaymentRequired` is a union return type with `x402Required: true`. Use `result.x402Required` to discriminate -- do NOT use `instanceof` or try/catch.

## Typical Workflow

1. **Register** agent with 8004skill (identity, endpoints, OASF)
2. **Enable x402**: `--x402 true` on register or update
3. **Set wallet**: Operation 7 (receives USDC payments)
4. **Monetize endpoint**: use `x402-express` middleware on your server
5. **Discover + pay**: clients use `awal` or `sdk.request()` (/ `sdk.fetchWithX402()`, which is an alias) to find and pay your agent
