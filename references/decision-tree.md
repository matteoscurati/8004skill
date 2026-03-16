# Decision Tree

> As of agent0-sdk v1.7.1, March 2026.

When a user's intent is unclear, use this tree to route them to the right operation or reference.

## Create & Register

- "I want to create/register an agent" → Operation 1 (Configure) then Operation 2 (Register)
- "I want to set up 8004skill" → Operation 1 (Configure)

## Discover & Inspect

- "I want to find/search for agents" → Operation 4 (Search). Semantic search for natural language queries, subgraph filters for structured queries.
- "I want to see agent details" → Operation 3 (Load Agent)
- "I want to check an agent's reputation" → Operation 6 (Inspect Agent)
- "I want to connect to an agent's endpoint" → Operation 6 (Inspect Agent — shows MCP/A2A config)

## Evaluate & Rate

- "I want to rate/review an agent" → Operation 5 (Give Feedback)
- "I want to revoke my feedback" → Operation 5 (Revoke sub-flow)
- "I want to respond to feedback on my agent" → Operation 5 (Respond sub-flow)

## Manage My Agent

- "I want to update my agent" → Update Agent sub-flow (name, description, endpoints, OASF, etc.)
- "I want to set/change my agent's wallet" → Operation 7 (Wallet Management)
- "I want to prove my identity" → Operation 8 (Verify Identity — sign)
- "I want to verify another agent" → Operation 8 (Verify Identity — verify)
- "I want to see my agent's profile" → Operation 9 (Whoami)
- "I want to transfer my agent" → Operation 10 (Transfer Agent) — irreversible!

## Message & Pay Agents

- "I want to message/talk to an agent" → Operation 14 (A2A Messaging). Requires the target agent to have an A2A endpoint.
- "I want to send a message to agent X" → Operation 14 (A2A Messaging)
- "I want to chat with another agent" → Operation 14 (A2A Messaging)
- "I want to pay an agent" → Operation 15 (X402 Payment). Use `sdk.request()` for manual flow or `sdk.fetchWithX402()` for auto-pay.
- "I want to make an x402 request" → Operation 15 (X402 Payment)
- "I want to call a paid endpoint" → Operation 15 (X402 Payment)
- "I want to make a payment" → Operation 15 (X402 Payment). For on-chain payments to agent endpoints.

## Understand the Protocol

- "What is ERC-8004?" → `erc-8004-spec.md`
- "What does [term] mean?" → `erc-8004-spec.md` (Glossary section)
- "Which chains are supported?" → `chains.md`
- "How does trust work?" → `trust-boundaries.md`
- "What about payments/x402?" → `x402-integration.md`

## Troubleshoot

- "I'm getting an error" → `troubleshooting.md`
- "On-chain data doesn't match" → `troubleshooting.md` (Data Discrepancies section)

## Cross-Platform

- "I want to use Python" → `python-recipes.md`
