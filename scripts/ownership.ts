#!/usr/bin/env npx tsx
/**
 * Read agent ownership information.
 *
 * Usage:
 *   npx tsx ownership.ts --action get-owner --agent-id 11155111:42 --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 *   npx tsx ownership.ts --action is-owner --agent-id 11155111:42 --address 0x... --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 */

import {
  parseArgs,
  requireArg,
  requireChainId,
  validateAddress,
  validateAgentId,
  createSdk,
  handleError,
  outputJson,
  exitWithError,
} from './lib/shared.js';

async function main() {
  const args = parseArgs();
  const action = args['action'] || 'get-owner';
  const agentId = requireArg(args, 'agent-id', 'agent');
  validateAgentId(agentId);
  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  const sdk = createSdk({ chainId, rpcUrl });

  if (action === 'get-owner') {
    const owner = await sdk.getAgentOwner(agentId);
    outputJson({ agentId, owner, action });
    return;
  }

  if (action === 'is-owner') {
    const address = requireArg(args, 'address', 'address to verify');
    validateAddress(address, 'address');
    const isOwner = await sdk.isAgentOwner(agentId, address);
    outputJson({ agentId, address, isOwner, action });
    return;
  }

  exitWithError(`Unknown action: ${action}. Use get-owner or is-owner.`);
}

main().catch(handleError);
