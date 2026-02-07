# Supported Chains

## Supported

The SDK (`agent0-sdk`) has built-in support for these chains:

| Chain | Chain ID | Identity Registry | Reputation Registry | SDK Support |
|-------|----------|-------------------|---------------------|-------------|
| Ethereum Mainnet | 1 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | Built-in (registry + subgraph) |
| Ethereum Sepolia | 11155111 | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | `0x8004B663056A597Dffe9eCcC1965A193B7388713` | Built-in (registry + subgraph) |
| Polygon Mainnet | 137 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` | Partial (subgraph built-in, registry via env vars) |

## Coming Soon

Contracts deployed but not yet supported by the SDK. These chains will require environment variable overrides (`REGISTRY_ADDRESS_IDENTITY`, `REGISTRY_ADDRESS_REPUTATION`, `SUBGRAPH_URL`) once SDK support is added.

**Mainnets:**

| Chain | Chain ID |
|-------|----------|
| Base | 8453 |
| BSC | 56 |
| Monad | 143 |
| Scroll | 534352 |
| Gnosis | 100 |
| Arbitrum | 42161 |
| Celo | 42220 |
| Taiko | 167000 |

**Testnets:**

| Chain | Chain ID |
|-------|----------|
| Base Sepolia | 84532 |
| BSC Chapel | 97 |
| Monad Testnet | 10143 |
| Scroll Testnet | 534351 |
| Arbitrum Sepolia | 421614 |
| Celo Alfajores | 44787 |
| Polygon Amoy | 80002 |
| Linea Sepolia | 59141 |
| Hedera Testnet | 296 |
| HyperEVM Testnet | 998 |
| SKALE Base Sepolia | 1351057110 |

## Subgraph URLs

The SDK has built-in subgraph URLs for the 3 supported chains. Replace `<GRAPH_API_KEY>` with your key from [The Graph](https://thegraph.com/studio/).

- **Mainnet (1)**: `https://gateway.thegraph.com/api/<GRAPH_API_KEY>/subgraphs/id/FV6RR6y13rsnCxBAicKuQEwDp8ioEGiNaWaZUmvr1F8k`
- **Sepolia (11155111)**: `https://gateway.thegraph.com/api/<GRAPH_API_KEY>/subgraphs/id/6wQRC7geo9XYAhckfmfo8kbMRLeWU8KQd3XsJqFKmZLT`
- **Polygon (137)**: `https://gateway.thegraph.com/api/<GRAPH_API_KEY>/subgraphs/id/9q16PZv1JudvtnCAf44cBoxg82yK9SSsFvrjCY9xnneF`

## Public RPC Endpoints

- **Mainnet (1)**: `https://eth.llamarpc.com`, `https://rpc.ankr.com/eth`
- **Sepolia (11155111)**: `https://rpc.sepolia.org`, `https://ethereum-sepolia-rpc.publicnode.com`
- **Polygon (137)**: `https://polygon-rpc.com`, `https://rpc.ankr.com/polygon`

## Notes

- All contract addresses start with `0x8004` (deployed via CREATE2 with vanity prefix).
- Polygon (137) requires registry address overrides: `REGISTRY_ADDRESS_IDENTITY` and `REGISTRY_ADDRESS_REPUTATION`.
