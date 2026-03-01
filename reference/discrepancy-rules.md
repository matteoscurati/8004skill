# Discrepancy Rules

> As of agent0-sdk v1.5.3, March 2026.

Known discrepancies between the ERC-8004 spec, the SDK implementation, and on-chain state. Use the **Recommended** action when handling each case.

## On-Chain vs Off-Chain Authority

| Spec Says | Implementation Shows | Recommended |
|---|---|---|
| The on-chain state (Identity Registry, Reputation Registry) is the source of truth. | The SDK reads most data from The Graph subgraph, which indexes on-chain events. Subgraph data can lag or be unavailable. | Always treat on-chain state as authoritative. When freshness matters (e.g. right after a write), verify against the RPC node, not the subgraph. |
| Agent URI points to a registration file (IPFS or HTTP). The file contents define the agent's profile. | The subgraph caches registration file fields (name, description, endpoints) at indexing time. If the file changes without an on-chain URI update, the subgraph keeps stale data. | After updating a registration file at the same URI, call `agent.setAgentURI(uri)` again to trigger re-indexing. Prefer IPFS (content-addressed) over HTTP to avoid silent staleness. |
| Owner and operator addresses are tracked on the ERC-721 contract. | `sdk.getAgentOwner()` reads from chain. `sdk.searchAgents({ owners })` reads from subgraph. These can diverge briefly after a transfer. | For ownership checks that gate write operations, use `sdk.isAgentOwner()` (chain read). For discovery, subgraph results are acceptable. |

## Subgraph Indexing Lag

| Spec Says | Implementation Shows | Recommended |
|---|---|---|
| After a write transaction is mined, the data exists on-chain. | Subgraph indexing has eventual consistency. Lag ranges from seconds to minutes depending on chain and indexer load. | After a write, use `handle.waitMined()` to confirm the transaction, then inform the user that search results may take a moment to reflect the change. Do not poll the subgraph in a tight loop. |
| All chains with deployed contracts can be queried. | Only 5 chains have built-in subgraph support (1, 11155111, 137, 8453, 84532). Other chains require a manual `SUBGRAPH_URL`. Without a subgraph, `searchAgents` and `searchFeedback` will fail. | For chains without a subgraph, use direct chain reads (`sdk.loadAgent`, `sdk.getAgent`) instead of search. Document the limitation to the user. |

## Feedback Immutability

| Spec Says | Implementation Shows | Recommended |
|---|---|---|
| Feedback values and tags cannot be edited after submission. | The contract has no `editFeedback` function. `revokeFeedback` marks the entry as revoked but does not delete it from storage. | To correct feedback, revoke the original and submit a new entry. Inform the user that revoked feedback remains visible (marked as revoked) in query results. |
| Only the original reviewer can revoke their own feedback. | `sdk.revokeFeedback(agentId, feedbackIndex)` requires the connected wallet to match the reviewer address. The agent owner cannot revoke feedback left by others. | If an agent owner wants to dispute feedback, use `sdk.appendResponse()` to attach a response rather than attempting revocation. |

## Unreachable Agent URIs

| Spec Says | Implementation Shows | Recommended |
|---|---|---|
| The agent URI should resolve to a valid registration file. | URIs can become unreachable: IPFS pins expire, HTTP servers go down. The SDK returns partial/null data when the file cannot be fetched. | When `agent.getRegistrationFile()` returns null or incomplete data, fall back to on-chain metadata and subgraph cached fields. Flag the unreachable URI to the user and suggest re-registering. |
| Endpoints listed in the registration file should be live. | The SDK does not verify endpoint liveness at query time. `connect.ts` tests reachability only when explicitly invoked. | Do not assume endpoints are reachable. Use `connect.ts` to verify before directing users to interact with an agent's MCP/A2A endpoint. |
