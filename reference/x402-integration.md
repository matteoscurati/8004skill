# X402 Payment Integration

> As of agent0-sdk v1.5.3, March 2026.

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

## Typical Workflow

1. **Register** agent with 8004skill (identity, endpoints, OASF)
2. **Enable x402**: `--x402 true` on register or update
3. **Set wallet**: Operation 7 (receives USDC payments)
4. **Monetize endpoint**: use `x402-express` middleware on your server
5. **Discover + pay**: clients use `awal` to find and pay your agent
