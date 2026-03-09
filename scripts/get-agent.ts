#!/usr/bin/env npx tsx
/**
 * Fetch agent summary from the indexer/search layer.
 *
 * Usage:
 *   npx tsx get-agent.ts --agent-id 11155111:42 --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 */

import {
  parseArgs,
  requireArg,
  requireChainId,
  validateAgentId,
  createSdk,
  handleError,
  outputJson,
} from './lib/shared.js';

async function main() {
  const args = parseArgs();
  const agentId = requireArg(args, 'agent-id', 'agent to fetch');
  validateAgentId(agentId);
  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  const sdk = createSdk({ chainId, rpcUrl });
  const summary = await sdk.getAgent(agentId);

  outputJson(summary ? { ...summary, found: true } : { agentId, found: false });
}

main().catch(handleError);
