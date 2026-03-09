# Python SDK Recipes

> As of agent0-sdk v1.6.0, March 2026.

8004skill executes TypeScript scripts via `npx tsx`. These recipes are for users who want to integrate directly with `agent0-py` (the Python SDK for ERC-8004). They are NOT executed by 8004skill.

## Installation

```bash
pip install agent0-sdk
```

## Version Mapping

| TypeScript (agent0-sdk) | Python (agent0-sdk) | Notes |
|------------------------|--------------------|----|
| ^1.6.0 | 1.6.0 | API surface broadly aligned |

## Search Agents

```python
from agent0_sdk import SDK

sdk = SDK(chainId=8453, rpcUrl="https://mainnet.base.org")
agents = sdk.searchAgents(filters={"hasMCP": True, "active": True})
for agent in agents:
    print(f"{agent.agent_id}: {agent.name}")
```

## Load Agent

```python
agent = sdk.loadAgent("8453:42")
print(agent.name, agent.description)
print(agent.mcpEndpoint)
```

## Get Reputation

```python
rep = sdk.getReputationSummary("8453:42")
print(f"Score: {rep.averageValue}/100 ({rep.count} reviews)")
```

## Register Agent (requires wallet)

```python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("https://mainnet.base.org"))
sdk = SDK(chainId=8453, rpcUrl="https://mainnet.base.org", walletProvider=w3.provider)

agent = sdk.createAgent(name="My Python Agent", description="An agent built with agent0-py")
agent.setMCP("https://mcp.example.com")
tx = agent.registerIPFS()
result = tx.wait_confirmed().result
print(f"Registered: {result.agent_id}")
```

## Fully On-Chain Registration

```python
tx = agent.registerOnChain()
result = tx.wait_confirmed().result
print(result.agentURI)
```

## Give Feedback

```python
feedback_file = sdk.prepareFeedbackFile({
    "text": "Great agent",
    "mcpTool": "quote",
    "a2aSkills": ["research"],
})
tx = sdk.giveFeedback("8453:42", value=85, tag1="starred", tag2="reachable", feedbackFile=feedback_file)
result = tx.wait_confirmed().result
print(f"Feedback submitted: {result.tx_hash}")
```
