# Supported Chains

## Supported

| Chain | Chain ID | SDK Support |
|-------|----------|-------------|
| Ethereum Mainnet | 1 | Full (built-in registry + subgraph) |
| Ethereum Sepolia | 11155111 | Full (built-in registry + subgraph), recommended for testing |
| Polygon Mainnet | 137 | Partial (subgraph built-in, registry via env vars) |

Contract addresses and subgraph URLs are built-in to the SDK. Override with `SUBGRAPH_URL` env var if needed.

## Coming Soon

Additional chains (Base, BSC, Monad, Scroll, Gnosis, Arbitrum, Celo, Taiko + testnets) are deployed on-chain but not yet supported by the SDK. They will require `REGISTRY_ADDRESS_IDENTITY`, `REGISTRY_ADDRESS_REPUTATION`, and `SUBGRAPH_URL` env var overrides.

## Public RPC Endpoints

- **Mainnet (1)**: `https://eth.llamarpc.com`, `https://rpc.ankr.com/eth`
- **Sepolia (11155111)**: `https://rpc.sepolia.org`, `https://ethereum-sepolia-rpc.publicnode.com`
- **Polygon (137)**: `https://polygon-rpc.com`, `https://rpc.ankr.com/polygon`

## Notes

- Polygon (137) requires registry address overrides: `REGISTRY_ADDRESS_IDENTITY` and `REGISTRY_ADDRESS_REPUTATION`.
