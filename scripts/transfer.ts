#!/usr/bin/env npx tsx
/**
 * Transfer agent ownership to a new address.
 * Signing is done via WalletConnect (user's wallet app).
 *
 * Usage:
 *   npx tsx transfer.ts --agent-id 11155111:42 \
 *     --chain-id 11155111 --rpc-url https://rpc.sepolia.org --new-owner 0x...
 */

import {
  parseArgs,
  requireArg,
  requireChainId,
  validateAgentId,
  validateAddress,
  createSdk,
  loadWalletProvider,
  handleError,
  outputJson,
  submitAndWait,
  emitWalletPrompt,
  exitWithError,
} from './lib/shared.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function main() {
  const args = parseArgs();
  const agentId = requireArg(args, 'agent-id', 'agent');
  validateAgentId(agentId);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');
  const chainId = requireChainId(args['chain-id']);
  const newOwner = requireArg(args, 'new-owner', 'new owner address');
  validateAddress(newOwner, 'new-owner');

  if (newOwner.toLowerCase() === ZERO_ADDRESS) {
    exitWithError('Cannot transfer to the zero address.');
  }

  const walletProvider = await loadWalletProvider(chainId);
  const sdk = createSdk({ chainId, rpcUrl, walletProvider });

  emitWalletPrompt();

  const handle = await sdk.transferAgent(agentId, newOwner);
  const { txHash } = await submitAndWait(handle);
  outputJson({ agentId, newOwner, txHash });
}

main().catch(handleError);
