#!/usr/bin/env npx tsx
/**
 * Discover and inspect an agent's connection details for agent-to-agent interaction.
 *
 * Usage:
 *   npx tsx connect.ts --agent-id 11155111:42 --chain-id 11155111 --rpc-url https://rpc.sepolia.org
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
  const agentId = requireArg(args, 'agent-id', 'agent to inspect');
  validateAgentId(agentId);
  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, ...getOverridesFromEnv(chainId) }));

  const agent = await sdk.loadAgent(agentId);
  const regFile = agent.getRegistrationFile();

  const repResult = await tryCatch(() => sdk.getReputationSummary(agentId));
  const walletResult = await tryCatch(() => agent.getWallet());

  const result = buildAgentDetails(agent, regFile, {
    chain: chainId,
    reputation: repResult.value ?? { count: 0, averageValue: 0 },
    walletAddress: walletResult.value || agent.walletAddress,
  });
  if (repResult.error) result.reputationError = repResult.error;
  if (walletResult.error) result.walletError = walletResult.error;

  outputJson(result);
}

main().catch(handleError);
