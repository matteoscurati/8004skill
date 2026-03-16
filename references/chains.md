# Supported Chains

> As of agent0-sdk v1.7.1, March 2026.

## Default RPC URLs (v1.7.0+)

Starting with v1.7.0, the SDK ships with built-in default RPC URLs for all full-support chains. This means `rpcUrl` is now **optional** in SDKConfig when targeting these chains — the SDK will use its built-in default automatically.

To override the default RPC for any chain (e.g., to use a dedicated provider like Alchemy or Infura), use the `overrideRpcUrls` config option:

```typescript
const sdk = new SDK({
  chainId: 8453,
  // No rpcUrl needed — SDK uses built-in default for Base
  overrideRpcUrls: {
    8453: 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY',  // Override Base
    1: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',      // Override Mainnet
  },
});
```

`overrideRpcUrls` is a `Record<number, string>` mapping chain IDs to RPC URLs. It applies to the primary chain and to any cross-chain `loadAgent()` calls.

## Cross-Chain `loadAgent()` (v1.7.0+)

The SDK can now load agents from a different chain than the one the SDK is initialized on. For example, an SDK initialized on Base (8453) can load an agent registered on Ethereum Mainnet (1):

```typescript
const sdk = new SDK({ chainId: 8453 });
const agent = await sdk.loadAgent('1:42');  // Loads agent 42 from Ethereum Mainnet
```

The SDK resolves the target chain's RPC URL in this order:
1. `overrideRpcUrls[targetChainId]` if set
2. Built-in default RPC for the target chain (full-support chains only)
3. Error if no RPC is available for the target chain

For deployed-but-not-indexed chains, provide the RPC via `overrideRpcUrls`:

```typescript
const sdk = new SDK({
  chainId: 8453,
  overrideRpcUrls: {
    42161: 'https://arb1.arbitrum.io/rpc',  // Needed for cross-chain load from Arbitrum
  },
});
const agent = await sdk.loadAgent('42161:7');  // Loads agent 7 from Arbitrum
```

## Full SDK Support

These chains have built-in registry addresses, subgraph URLs, and default RPC URLs (v1.7.0+). They work out of the box with the public SDK package — no configuration overrides needed.

| Chain | Chain ID | Type | Notes |
|-------|----------|------|-------|
| Ethereum Mainnet | 1 | Mainnet | Registry + subgraph |
| Ethereum Sepolia | 11155111 | Testnet | Recommended for testing |
| Polygon Mainnet | 137 | Mainnet | Registry + subgraph |
| Base Mainnet | 8453 | Mainnet | Registry + subgraph |
| Base Sepolia | 84532 | Testnet | Registry + subgraph |

## Deployed Chains (Manual Config)

These chains have ERC-8004 contracts deployed (same deterministic CREATE2 addresses) but are **not yet indexed by the SDK defaults**. To use them, set `SUBGRAPH_URL` to a subgraph instance for that chain. Optionally override registry addresses with `REGISTRY_ADDRESS_IDENTITY` / `REGISTRY_ADDRESS_REPUTATION` if they differ from defaults.

The public SDK defaults currently include Identity + Reputation addresses only. Validation registry addresses are not wired into the default package for these chains.

### Mainnets

| Chain | Chain ID |
|-------|----------|
| Arbitrum One | 42161 |
| Optimism | 10 |
| Avalanche C-Chain | 43114 |
| BSC (BNB Chain) | 56 |
| Monad | 143 |
| Scroll | 534352 |
| Gnosis | 100 |
| Celo | 42220 |
| Taiko | 167000 |
| Linea | 59144 |
| MegaETH | 4326 |
| XLayer | 196 |
| Abstract | 2741 |
| Mantle | 5000 |
| Soneium | 1868 |
| GOAT Network | 2345 |
| Metis | 1088 |
| Hedera | 295 |
| SKALE Base | 1187947933 |
| Shape | 360 |

### Testnets

| Chain | Chain ID |
|-------|----------|
| Arbitrum Sepolia | 421614 |
| Optimism Sepolia | 11155420 |
| Polygon Amoy | 80002 |
| Avalanche Fuji | 43113 |
| BSC Testnet | 97 |
| Monad Testnet | 10143 |
| Scroll Sepolia | 534351 |
| Gnosis Chiado | 10200 |
| Celo Sepolia | 11142220 |
| Taiko Hoodi | 167013 |
| MegaETH Testnet | 6343 |
| Linea Sepolia | 59141 |
| XLayer Testnet | 1952 |
| Abstract Sepolia | 11124 |
| Mantle Sepolia | 5003 |
| Soneium Minato | 1946 |
| GOAT Testnet3 | 48816 |
| Metis Sepolia | 59902 |
| Hedera Testnet | 296 |
| SKALE Base Sepolia | 324705682 |
| Arc Testnet | 5042002 |
| Shape Sepolia | 11011 |

## Contract Addresses

All chains use deterministic CREATE2 deployment. Two address sets:

**Mainnet contracts** (chains 1, 137, 8453, 42161, 10, 43114, 56, 143, 534352, 100, 42220, 167000, 59144, 4326, 196, 2741, 5000, 1868, 2345, 1088, 295, 1187947933, 360, etc.):
- Identity Registry: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- Reputation Registry: `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

**Testnet contracts** (chains 11155111, 84532, 421614, 11155420, 80002, 43113, 97, 10143, 534351, 10200, 11142220, 167013, 6343, 59141, 1952, 11124, 5003, 1946, 48816, 59902, 296, 324705682, 5042002, 11011, etc.):
- Identity Registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- Reputation Registry: `0x8004B663056A597Dffe9eCcC1965A193B7388713`

## Public RPC Endpoints

### Full SDK Support Chains

- **Mainnet (1)**: `https://eth.llamarpc.com`, `https://rpc.ankr.com/eth`
- **Sepolia (11155111)**: `https://rpc.sepolia.org`, `https://ethereum-sepolia-rpc.publicnode.com`
- **Polygon (137)**: `https://polygon-rpc.com`, `https://rpc.ankr.com/polygon`
- **Base (8453)**: `https://mainnet.base.org`, `https://rpc.ankr.com/base`
- **Base Sepolia (84532)**: `https://sepolia.base.org`, `https://rpc.ankr.com/base_sepolia`

### Deployed Chains (commonly used RPCs)

- **Arbitrum (42161)**: `https://arb1.arbitrum.io/rpc`, `https://rpc.ankr.com/arbitrum`
- **Optimism (10)**: `https://mainnet.optimism.io`, `https://rpc.ankr.com/optimism`
- **Avalanche (43114)**: `https://api.avax.network/ext/bc/C/rpc`, `https://rpc.ankr.com/avalanche`
- **BSC (56)**: `https://bsc-dataseed.binance.org`, `https://rpc.ankr.com/bsc`
- **Gnosis (100)**: `https://rpc.gnosischain.com`, `https://rpc.ankr.com/gnosis`
- **Scroll (534352)**: `https://rpc.scroll.io`
- **Celo (42220)**: `https://forno.celo.org`
- **Linea (59144)**: `https://rpc.linea.build`
- **Monad (143)**: use the network RPC from your infra provider or local deployment config
- **MegaETH (4326)**: use the network RPC from your infra provider or local deployment config
- **Mantle (5000)**: `https://rpc.mantle.xyz`
- **Metis (1088)**: `https://andromeda.metis.io/?owner=1088`

For the remaining deployed networks (XLayer, Soneium, GOAT Network, Hedera, SKALE Base, Shape, and related testnets), use the RPC endpoint from your infra provider or the chain's official docs.
