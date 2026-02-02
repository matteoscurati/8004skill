#!/usr/bin/env npx tsx
/**
 * Manage agent wallet on-chain (EIP-712 signed).
 * Signing is done via WalletConnect (user's wallet app).
 *
 * Two flows for `set`:
 *   1. Standard: wallet signing via WalletConnect
 *   2. Pre-signed: --signature flag with an EIP-712 signature (hardware wallet, MPC)
 *
 * Usage:
 *   npx tsx wallet.ts --action set --agent-id 11155111:42 \
 *     --chain-id 11155111 --rpc-url https://rpc.sepolia.org --wallet-address 0x...
 *
 *   npx tsx wallet.ts --action set --agent-id 11155111:42 \
 *     --chain-id 11155111 --rpc-url https://rpc.sepolia.org --wallet-address 0x... \
 *     --signature 0x...
 *
 *   npx tsx wallet.ts --action unset --agent-id 11155111:42 \
 *     --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 *
 *   npx tsx wallet.ts --action get --agent-id 11155111:42 \
 *     --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 */

import { SDK } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  requireChainId,
  validateAgentId,
  validateAddress,
  validateSignature,
  buildSdkConfig,
  getOverridesFromEnv,
  exitWithError,
  loadWalletProvider,
  handleError,
  outputJson,
  submitAndWait,
  emitWalletPrompt,
} from './lib/shared.js';

async function main() {
  const args = parseArgs();
  const action = requireArg(args, 'action', 'set|unset|get');
  const agentId = requireArg(args, 'agent-id', 'agent');
  validateAgentId(agentId);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');
  const chainId = requireChainId(args['chain-id']);

  if (action === 'get') {
    const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, ...getOverridesFromEnv(chainId) }));
    const agent = await sdk.loadAgent(agentId);
    const wallet = await agent.getWallet();
    outputJson({ agentId, walletAddress: wallet || null, action: 'get' });
    return;
  }
  const walletProvider = await loadWalletProvider(chainId);
  const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, walletProvider, ...getOverridesFromEnv(chainId) }));
  const agent = await sdk.loadAgent(agentId);

  emitWalletPrompt();

  if (action === 'set') {
    const walletAddress = requireArg(args, 'wallet-address', 'wallet to set');
    validateAddress(walletAddress, 'wallet-address');
    const preSignedSignature = args['signature'];
    if (preSignedSignature) validateSignature(preSignedSignature);

    // --signature provides a pre-generated EIP-712 signature.
    // If not provided, the SDK signs via WalletConnect.
    const opts: { signature?: string } = {};
    if (preSignedSignature) {
      opts.signature = preSignedSignature;
    }

    const handle = await agent.setWallet(walletAddress, opts);

    if (handle) {
      const { txHash } = await submitAndWait(handle, { timeoutMs: 180_000, confirmations: 2 });
      outputJson({ agentId, walletAddress, txHash, action: 'set' });
    } else {
      outputJson({ agentId, walletAddress, action: 'set', note: 'Wallet already set to this address' });
    }
  } else if (action === 'unset') {
    const handle = await agent.unsetWallet();

    if (handle) {
      const { txHash } = await submitAndWait(handle, { timeoutMs: 180_000, confirmations: 2 });
      outputJson({ agentId, txHash, action: 'unset' });
    } else {
      outputJson({ agentId, action: 'unset', note: 'Wallet already unset' });
    }
  } else {
    exitWithError(`Unknown action: ${action}. Use set, unset, or get.`);
  }
}

main().catch(handleError);
