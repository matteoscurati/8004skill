# Supported Chains

## Supported

| Chain | Chain ID | SDK Support |
|-------|----------|-------------|
| Ethereum Mainnet | 1 | Full (registry + subgraph) |
| Ethereum Sepolia | 11155111 | Full (registry + subgraph), recommended for testing |
| Polygon Mainnet | 137 | Full (registry + subgraph) |
| Base Mainnet | 8453 | Full (registry + subgraph) |
| Base Sepolia | 84532 | Full (registry + subgraph), testing |

Contract addresses and subgraph URLs are built-in to the SDK. Override with `SUBGRAPH_URL` env var if needed.

## Coming Soon

Additional chains (BSC, Monad, Scroll, Gnosis, Arbitrum, Celo, Taiko + testnets) are deployed on-chain but not yet indexed by the SDK. They use the same deterministic CREATE2 contract addresses. To use them, set the `SUBGRAPH_URL` env var (and optionally `REGISTRY_ADDRESS_IDENTITY` / `REGISTRY_ADDRESS_REPUTATION` if addresses differ).

## Public RPC Endpoints

- **Mainnet (1)**: `https://eth.llamarpc.com`, `https://rpc.ankr.com/eth`
- **Sepolia (11155111)**: `https://rpc.sepolia.org`, `https://ethereum-sepolia-rpc.publicnode.com`
- **Polygon (137)**: `https://polygon-rpc.com`, `https://rpc.ankr.com/polygon`
- **Base (8453)**: `https://mainnet.base.org`, `https://rpc.ankr.com/base`
- **Base Sepolia (84532)**: `https://sepolia.base.org`, `https://rpc.ankr.com/base_sepolia`
