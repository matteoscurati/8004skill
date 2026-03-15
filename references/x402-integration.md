# X402 Payment Integration

> As of agent0-sdk v1.7.0, March 2026.

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

## SDK Payment Execution (v1.7.0+)

Starting with v1.7.0, the SDK provides built-in x402 payment handling. Two approaches:

### Manual Flow: `sdk.request()`

```typescript
const result = await sdk.request('https://agent.example.com/api/analyze', {
  method: 'POST',
  body: JSON.stringify({ code: '...' }),
  maxAmount: '1000000',  // Safety cap: 1 USDC (6 decimals)
});

if (result.x402Required) {
  // Inspect payment details before paying
  console.log(result.x402Payment.accepts);  // Payment options
  console.log(result.x402Payment.resource); // Resource info

  // Execute payment (requires privateKey or walletProvider in SDK config)
  const settlement = await result.x402Payment.pay();
  console.log(settlement.txHash);     // On-chain tx hash
  console.log(settlement.response);   // Unlocked HTTP response
} else {
  // No payment required — use the response directly
  console.log(await result.response.json());
}
```

### Auto-Pay Flow: `sdk.fetchWithX402()`

```typescript
// Automatically pays on 402 and returns the unlocked response
const response = await sdk.fetchWithX402('https://agent.example.com/api/analyze', {
  method: 'POST',
  body: JSON.stringify({ code: '...' }),
  maxAmount: '1000000',  // Safety cap
});
const data = await response.json();
```

### Signing Methods: WalletConnect vs PRIVATE_KEY

| Method | Config | Use Case | Approval |
|--------|--------|----------|----------|
| WalletConnect | `walletProvider` in SDKConfig | Interactive sessions | User approves each payment in wallet app |
| Private Key | `privateKey` in SDKConfig | Automated agents | No user approval — signs automatically |

**WalletConnect**: Safer for human-supervised agents. Each x402 payment triggers a signing request in the wallet app. The user sees the amount and recipient before approving.

**PRIVATE_KEY**: Required for fully autonomous agents that need to pay without human intervention. The key is loaded from `~/.8004skill/.env` (never in chat). Use `maxAmount` to cap spending.

## A2A + X402 Combined Flow

When an agent's A2A endpoint requires payment, the SDK handles the 402 transparently:

```typescript
const agent = await sdk.loadAgent('8453:42');

// messageA2A may return a 402 if the agent charges for responses
try {
  const response = await agent.messageA2A('Analyze this contract for vulnerabilities');
  console.log(response.parts);  // Agent's response
} catch (err) {
  if (err instanceof A2APaymentRequired) {
    // Agent requires payment — inspect and pay
    const settlement = await err.x402Payment.pay();
    // Retry the message (the task continues after payment)
    const response = await agent.messageA2A('Analyze this contract for vulnerabilities', {
      taskId: err.taskId,  // Continue the same task
    });
    console.log(response.parts);
  }
}
```

Alternatively, use `sdk.fetchWithX402()` to auto-pay A2A endpoints that return 402.

## Typical Workflow

1. **Register** agent with 8004skill (identity, endpoints, OASF)
2. **Enable x402**: `--x402 true` on register or update
3. **Set wallet**: Operation 7 (receives USDC payments)
4. **Monetize endpoint**: use `x402-express` middleware on your server
5. **Discover + pay**: clients use `awal` or `sdk.request()` / `sdk.fetchWithX402()` to find and pay your agent
