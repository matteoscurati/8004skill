#!/usr/bin/env npx tsx
/**
 * Manage agent wallet on-chain (EIP-712 signed).
 *
 * Usage:
 *   PRIVATE_KEY="0x..." npx tsx wallet.ts --action set --agent-id 11155111:42 \
 *     --chain-id 11155111 --rpc-url https://rpc.sepolia.org --wallet-address 0x...
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
  validateAgentId,
  validateAddress,
  exitWithError,
  handleError,
} from './lib/shared.js';

async function main() {
  const args = parseArgs();
  const action = requireArg(args, 'action', 'set|unset|get');
  const agentId = requireArg(args, 'agent-id', 'agent');
  validateAgentId(agentId);
  const chainId = parseChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');
  const privateKey = process.env.PRIVATE_KEY;

  if (action === 'get') {
    const sdk = new SDK({ chainId, rpcUrl });
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

  if (!privateKey) {
    exitWithError('PRIVATE_KEY environment variable is required for set/unset');
  }

  const sdk = new SDK({ chainId, rpcUrl, privateKey });
  const agent = await sdk.loadAgent(agentId);

  if (action === 'set') {
    const walletAddress = requireArg(args, 'wallet-address', 'wallet to set');
    validateAddress(walletAddress, 'wallet-address');
    const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;

    const handle = await agent.setWallet(walletAddress, {
      newWalletPrivateKey: walletPrivateKey,
    });

    if (handle) {
      console.error(JSON.stringify({ status: 'submitted', txHash: handle.hash }));
      await handle.waitMined({ timeoutMs: 120_000 });
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
      await handle.waitMined({ timeoutMs: 120_000 });
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
