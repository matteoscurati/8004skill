# Supported Chains

## Production

| Chain | Chain ID | Identity Registry | Reputation Registry | Validation Registry |
|-------|----------|-------------------|---------------------|---------------------|
| Ethereum Mainnet | 1 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | - |
| Polygon Mainnet | 137 | Built-in subgraph, registries TBC | Built-in subgraph, registries TBC | - |

## Testnets

| Chain | Chain ID | Identity Registry | Reputation Registry | Validation Registry | SDK Support |
|-------|----------|-------------------|---------------------|---------------------|-------------|
| Ethereum Sepolia | 11155111 | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` | Built-in |
| Base Sepolia | 84532 | Requires overrides | Requires overrides | - | Via env vars |
| Linea Sepolia | 59141 | Requires overrides | Requires overrides | - | Via env vars |
| Polygon Amoy | 80002 | Requires overrides | Requires overrides | - | Via env vars |
| Hedera Testnet | 296 | Requires overrides | Requires overrides | - | Via env vars |
| HyperEVM Testnet | 998 | Requires overrides | Requires overrides | - | Via env vars |
| SKALE Sepolia | 1351057110 | Requires overrides | Requires overrides | - | Via env vars |

## Default Subgraph URLs

- **Mainnet (1)**: `https://gateway.thegraph.com/api/<GRAPH_API_KEY>/subgraphs/id/FV6RR6y13rsnCxBAicKuQEwDp8ioEGiNaWaZUmvr1F8k`
- **Sepolia (11155111)**: `https://gateway.thegraph.com/api/<GRAPH_API_KEY>/subgraphs/id/6wQRC7geo9XYAhckfmfo8kbMRLeWU8KQd3XsJqFKmZLT`
- **Polygon (137)**: Built-in in SDK (uses SDK's `subgraphOverrides` if custom URL needed)

Set `GRAPH_API_KEY` env var or use the SDK's `subgraphOverrides` config.

## Public RPC Endpoints

- Mainnet: `https://eth.llamarpc.com`, `https://rpc.ankr.com/eth`
- Polygon: `https://polygon-rpc.com`, `https://rpc.ankr.com/polygon`
- Sepolia: `https://rpc.sepolia.org`, `https://ethereum-sepolia-rpc.publicnode.com`
- Base Sepolia: `https://sepolia.base.org`
- Linea Sepolia: `https://rpc.sepolia.linea.build`
- Polygon Amoy: `https://rpc-amoy.polygon.technology`

## Notes

- All contract addresses start with `0x8004` (deployed via CREATE2 with vanity prefix)
- The SDK has built-in defaults for Mainnet (1), Sepolia (11155111), and Polygon (137). All other chains require environment variable overrides:
  - `REGISTRY_ADDRESS_IDENTITY` — Identity registry contract address for the active chain
  - `REGISTRY_ADDRESS_REPUTATION` — Reputation registry contract address for the active chain
  - `SUBGRAPH_URL` — Subgraph endpoint for the active chain
