# Troubleshooting

> As of agent0-sdk v1.5.3, March 2026.

Common errors and their solutions, organized by category.

## WalletConnect

### "No connected account"
**Cause**: WalletConnect session expired or was never established.
**Fix**: Run `wc-pair.ts` to start a new pairing session. Sessions last ~7 days.

### "User rejected" / "User rejected the request"
**Cause**: Transaction was declined in the wallet app (MetaMask, Rainbow, etc.).
**Fix**: Re-run the operation and approve the transaction in your wallet.

### "Project not found"
**Cause**: Invalid WalletConnect project ID.
**Fix**: Verify your project ID at https://cloud.walletconnect.com. Or remove `wcProjectId` from config to use the shared default.

### Session file errors
**Cause**: Corrupted `~/.8004skill/wc-storage.json`.
**Fix**: Delete the file and re-pair: `rm ~/.8004skill/wc-storage.json` then run `wc-pair.ts`.

### Pairing timeout
**Cause**: QR code / URI not scanned within the pairing window.
**Fix**: Re-run `wc-pair.ts` and scan the QR code promptly. Ensure your wallet app supports WalletConnect v2.

## Transactions

### "insufficient funds"
**Cause**: Wallet doesn't have enough native token for gas.
**Fix**: Fund the wallet with ETH/MATIC/etc. For testnets, use a faucet:
- Sepolia: https://sepoliafaucet.com
- Base Sepolia: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- Polygon Amoy: https://faucet.polygon.technology

### Transaction timeout (120s)
**Cause**: Transaction was submitted but mining is slow (network congestion).
**Fix**: The txHash is provided — check the block explorer. The transaction may still confirm. If stuck, the wallet app can speed up or cancel the pending transaction.

### "execution reverted"
**Cause**: Smart contract rejected the transaction (e.g., not the owner, invalid parameters).
**Fix**: Check the revert reason in the error message. Common causes:
- Not the agent owner (for update/transfer/wallet operations)
- Agent ID doesn't exist on the specified chain
- Feedback value out of range (-100 to 100)

### Gas estimation failed
**Cause**: Transaction would revert if sent — the RPC simulated it and it failed.
**Fix**: Same as "execution reverted" — check the underlying cause.

## IPFS

### "IPFS upload failed" / Pinata errors
**Cause**: Invalid or expired IPFS credentials.
**Fix**:
1. Verify `PINATA_JWT` is valid at https://app.pinata.cloud
2. Check the credential hasn't expired
3. Ensure the env var is set in `~/.8004skill/.env` or shell

### "No IPFS provider configured"
**Cause**: Write operation needs IPFS but no provider is set.
**Fix**: Run Configure (Operation 1) and select an IPFS provider (pinata, filecoinPin, or node).

### IPFS content not resolving
**Cause**: IPFS propagation delay — content was just pinned.
**Fix**: Wait a few minutes. IPFS content propagation can take 1-5 minutes. If using a local node, ensure it's connected to the IPFS network.

## RPC

### "could not detect network" / RPC connection errors
**Cause**: RPC endpoint is unreachable or rate-limited.
**Fix**:
1. Try a different public RPC from `reference/chains.md`
2. Check if the endpoint requires an API key
3. For production use, consider a dedicated RPC provider (Alchemy, Infura, Ankr)

### "unknown chain" / chain not supported
**Cause**: Chain ID not recognized by the SDK.
**Fix**: For the 5 fully supported chains, verify the chain ID. For deployed-but-not-indexed chains, you need to set `SUBGRAPH_URL` manually. See `reference/chains.md` for the full list.

### Stale data after a write
**Cause**: Subgraph indexing has a delay (seconds to minutes) after on-chain transactions.
**Fix**: Wait 30-60 seconds and retry the read operation. The on-chain write succeeded (confirmed by txHash) — the subgraph just hasn't indexed it yet. This is normal eventual consistency behavior.

## Agent Operations

### "Agent not found"
**Cause**: Agent ID doesn't exist on the specified chain.
**Fix**:
1. Verify the agent ID format is `chainId:tokenId`
2. Confirm the chain ID matches where the agent was registered
3. Check if the agent was registered on a different chain

### "Not agent owner"
**Cause**: Connected wallet doesn't own the agent.
**Fix**: Verify ownership with `load-agent.ts` (shows owner addresses). Connect the correct wallet via `wc-pair.ts`.

### "Wallet already set to this address"
**Cause**: Attempting to set a wallet that's already set.
**Fix**: No action needed — the wallet is already configured.

### "No wallet set"
**Cause**: Operation requires a wallet (e.g., verify identity) but none is registered.
**Fix**: Use Wallet Management (Operation 7) to set a wallet first.

## Environment & Setup

### "Node.js version too old"
**Cause**: Requires Node.js >= 22.0.0.
**Fix**: Update Node.js: `brew install node` (macOS) or download from https://nodejs.org

### ESM import errors / "ERR_REQUIRE_ESM"
**Cause**: Attempting to require() an ESM module.
**Fix**: The skill is ESM-only. Ensure you're using `npx tsx` (not `node` directly) and your Node.js is >= 22.0.0.

### "Cannot find module 'agent0-sdk'"
**Cause**: Dependencies not installed.
**Fix**: Run `npm install --prefix <skill-directory>`. Or run `npx 8004skill doctor` to diagnose.

### Config file permission errors
**Cause**: `~/.8004skill/config.json` has wrong permissions.
**Fix**: `chmod 600 ~/.8004skill/config.json && chmod 700 ~/.8004skill/`

### Cloud sync warning
**Cause**: Config directory is inside iCloud/Dropbox/OneDrive.
**Fix**: This is a warning, not an error. Synced config files could leak credentials. Consider moving `~/.8004skill/` outside the synced directory or ensuring `.env` is in `.gitignore`.

## Search

### Semantic search unavailable
**Cause**: The semantic search API (Cloudflare Workers) is unreachable.
**Fix**: The script automatically falls back to subgraph search. If you need semantic search, check your network connection and try again.

### No search results
**Cause**: Query too specific or no matching agents registered.
**Fix**:
1. Broaden the search query
2. Try `--chains all` to search across all supported chains
3. Use fewer filters
4. Check that agents exist on the selected chain

## Preflight Check (`check-env.ts`)

Run `npx tsx scripts/check-env.ts` to diagnose common issues. It checks:
- Node.js version
- Config file existence and permissions
- WalletConnect session status
- Connected wallet address and chain
- IPFS provider configuration
- Environment variable presence
- Cloud sync detection
