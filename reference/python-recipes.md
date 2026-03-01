# Python SDK Recipes

> As of agent0-sdk v1.5.3, March 2026.

8004skill executes TypeScript scripts via `npx tsx`. These recipes are for users who want to integrate directly with `agent0-py` (the Python SDK for ERC-8004). They are NOT executed by 8004skill.

## Installation

```bash
pip install agent0-sdk
```

## Version Mapping

| TypeScript (agent0-sdk) | Python (agent0-sdk) | Notes |
|------------------------|--------------------|----|
| ^1.5.3 | ^1.5.0 | API surface aligned |

## Search Agents

```python
from agent0 import SDK

sdk = SDK(chain_id=8453, rpc_url="https://mainnet.base.org")
agents = sdk.search_agents(filters={"has_mcp": True, "active": True})
for agent in agents:
    print(f"{agent.agent_id}: {agent.name}")
```

## Load Agent

```python
agent = sdk.load_agent("8453:42")
print(agent.name, agent.description)
print(agent.mcp_endpoint)
```

## Get Reputation

```python
rep = sdk.get_reputation_summary("8453:42")
print(f"Score: {rep.average_value}/100 ({rep.count} reviews)")
```

## Register Agent (requires wallet)

```python
from agent0 import SDK
from web3 import Web3

w3 = Web3(Web3.HTTPProvider("https://mainnet.base.org"))
sdk = SDK(chain_id=8453, rpc_url="https://mainnet.base.org", wallet_provider=w3.provider)

agent = sdk.create_agent(name="My Python Agent", description="An agent built with agent0-py")
agent.set_mcp("https://mcp.example.com")
tx = agent.register_ipfs()
result = tx.wait_mined()
print(f"Registered: {result.agent_id}")
```

## Give Feedback

```python
tx = sdk.give_feedback("8453:42", value=85, tag1="starred", tag2="reachable")
result = tx.wait_mined()
print(f"Feedback submitted: {result.tx_hash}")
```

