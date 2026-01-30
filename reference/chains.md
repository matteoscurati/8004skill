# Supported Chains

## Production

| Chain | Chain ID | Identity Registry | Reputation Registry | Validation Registry |
|-------|----------|-------------------|---------------------|---------------------|
| Ethereum Mainnet | 1 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | - |

## Testnets

| Chain | Chain ID | Identity Registry | Reputation Registry | Validation Registry |
|-------|----------|-------------------|---------------------|---------------------|
| Ethereum Sepolia | 11155111 | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` |
| Base Sepolia | 84532 | deployed (check subgraph) | deployed | - |
| Linea Sepolia | 59141 | deployed (check subgraph) | deployed | - |
| Polygon Amoy | 80002 | deployed (check subgraph) | deployed | - |
| Hedera Testnet | 296 | deployed (check subgraph) | deployed | - |
| HyperEVM Testnet | 998 | deployed (check subgraph) | deployed | - |
| SKALE Sepolia | 1351057110 | deployed (check subgraph) | deployed | - |

## Default Subgraph URLs

- **Mainnet (1)**: `https://gateway.thegraph.com/api/<GRAPH_API_KEY>/subgraphs/id/FV6RR6y13rsnCxBAicKuQEwDp8ioEGiNaWaZUmvr1F8k`
- **Sepolia (11155111)**: `https://gateway.thegraph.com/api/<GRAPH_API_KEY>/subgraphs/id/6wQRC7geo9XYAhckfmfo8kbMRLeWU8KQd3XsJqFKmZLT`

Set `GRAPH_API_KEY` env var or use the SDK's `subgraphOverrides` config.

## Public RPC Endpoints

- Mainnet: `https://eth.llamarpc.com`, `https://rpc.ankr.com/eth`
- Sepolia: `https://rpc.sepolia.org`, `https://ethereum-sepolia-rpc.publicnode.com`
- Base Sepolia: `https://sepolia.base.org`
- Linea Sepolia: `https://rpc.sepolia.linea.build`
- Polygon Amoy: `https://rpc-amoy.polygon.technology`

## Notes

- All contract addresses start with `0x8004` (deployed via CREATE2 with vanity prefix)
- The SDK has built-in defaults for Mainnet and Sepolia. Other chains require `registryOverrides` in SDK config.
- Subgraph indexes all chains listed above. For chains without default subgraph URLs, use `subgraphOverrides`.
