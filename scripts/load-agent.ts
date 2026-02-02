#!/usr/bin/env npx tsx
/**
 * Load agent details by ID (read-only).
 *
 * Usage:
 *   npx tsx load-agent.ts --agent-id 11155111:42 --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 */

import { SDK } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  requireChainId,
  validateAgentId,
  buildSdkConfig,
  getOverridesFromEnv,
  handleError,
  outputJson,
  tryCatch,
  buildAgentDetails,
} from './lib/shared.js';

async function main() {
  const args = parseArgs();
  const agentId = requireArg(args, 'agent-id', 'agent to load');
  validateAgentId(agentId);
  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, ...getOverridesFromEnv(chainId) }));
  const agent = await sdk.loadAgent(agentId);
  const regFile = agent.getRegistrationFile();

  const walletResult = await tryCatch(() => agent.getWallet());
  const walletAddress = walletResult.value || agent.walletAddress;

  const result = buildAgentDetails(agent, regFile, {
    walletAddress: walletAddress || null,
    metadata: regFile.metadata,
  });
  if (walletResult.error) result.walletError = walletResult.error;

  outputJson(result);
}

main().catch(handleError);
