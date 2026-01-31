#!/usr/bin/env npx tsx
/**
 * Manage agent wallet on-chain (EIP-712 signed).
 *
 * Three flows for `set`:
 *   1. One-wallet: wallet address = signer address → no WALLET_PRIVATE_KEY needed
 *   2. Two-wallet: wallet address ≠ signer → WALLET_PRIVATE_KEY required
 *   3. Pre-signed: --signature flag with an EIP-712 signature (hardware wallet, MPC)
 *
 * Usage:
 *   PRIVATE_KEY="0x..." npx tsx wallet.ts --action set --agent-id 11155111:42 \
 *     --chain-id 11155111 --rpc-url https://rpc.sepolia.org --wallet-address 0x...
 *
 *   PRIVATE_KEY="0x..." npx tsx wallet.ts --action set --agent-id 11155111:42 \
 *     --chain-id 11155111 --rpc-url https://rpc.sepolia.org --wallet-address 0x... \
 *     --signature 0x...
 *
 *   PRIVATE_KEY="0x..." npx tsx wallet.ts --action unset --agent-id 11155111:42 \
 *     --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 *
 *   npx tsx wallet.ts --action get --agent-id 11155111:42 \
 *     --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 */

import { SDK } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  parseChainId,
  requireChainId,
  validateAgentId,
  validateAddress,
  validateSignature,
  buildSdkConfig,
  getOverridesFromEnv,
  exitWithError,
  loadPrivateKey,
  handleError,
  initSecurityHardening,
} from './lib/shared.js';

async function main() {
  const args = parseArgs();
  const action = requireArg(args, 'action', 'set|unset|get');
  const agentId = requireArg(args, 'agent-id', 'agent');
  validateAgentId(agentId);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  if (action === 'get') {
    const chainId = parseChainId(args['chain-id']);
    const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, ...getOverridesFromEnv(chainId) }));
    const agent = await sdk.loadAgent(agentId);
    const wallet = await agent.getWallet();
    console.log(
      JSON.stringify(
        {
          agentId,
          walletAddress: wallet || null,
          action: 'get',
        },
        null,
        2,
      ),
    );
    return;
  }

  const chainId = requireChainId(args['chain-id']);
  initSecurityHardening();
  const privateKey = loadPrivateKey();
  const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, privateKey, ...getOverridesFromEnv(chainId) }));
  const agent = await sdk.loadAgent(agentId);

  if (action === 'set') {
    const walletAddress = requireArg(args, 'wallet-address', 'wallet to set');
    validateAddress(walletAddress, 'wallet-address');
    const preSignedSignature = args['signature'];
    if (preSignedSignature) validateSignature(preSignedSignature);
    const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;

    if (walletPrivateKey && !/^0x[0-9a-fA-F]{64}$/.test(walletPrivateKey)) {
      exitWithError(
        'Invalid WALLET_PRIVATE_KEY format. Must be a 0x-prefixed 64 hex character private key.',
      );
    }

    // --signature takes priority over WALLET_PRIVATE_KEY.
    // If neither is provided, the SDK uses the signer key (one-wallet flow).
    let opts: { signature?: string; newWalletPrivateKey?: string } = {};
    if (preSignedSignature) {
      opts = { signature: preSignedSignature };
    } else if (walletPrivateKey) {
      opts = { newWalletPrivateKey: walletPrivateKey };
    }

    const handle = await agent.setWallet(walletAddress, opts);

    if (handle) {
      console.error(JSON.stringify({ status: 'submitted', txHash: handle.hash }));
      await handle.waitMined({ timeoutMs: 180_000, confirmations: 2 });
      console.log(
        JSON.stringify(
          {
            agentId,
            walletAddress,
            txHash: handle.hash,
            action: 'set',
          },
          null,
          2,
        ),
      );
    } else {
      console.log(
        JSON.stringify(
          {
            agentId,
            walletAddress,
            action: 'set',
            note: 'Wallet already set to this address',
          },
          null,
          2,
        ),
      );
    }
  } else if (action === 'unset') {
    const handle = await agent.unsetWallet();

    if (handle) {
      console.error(JSON.stringify({ status: 'submitted', txHash: handle.hash }));
      await handle.waitMined({ timeoutMs: 180_000, confirmations: 2 });
      console.log(
        JSON.stringify(
          {
            agentId,
            txHash: handle.hash,
            action: 'unset',
          },
          null,
          2,
        ),
      );
    } else {
      console.log(
        JSON.stringify(
          {
            agentId,
            action: 'unset',
            note: 'Wallet already unset',
          },
          null,
          2,
        ),
      );
    }
  } else {
    exitWithError(`Unknown action: ${action}. Use set, unset, or get.`);
  }
}

main().catch(handleError);
