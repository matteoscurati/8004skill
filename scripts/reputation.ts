#!/usr/bin/env npx tsx
/**
 * View reputation summary and recent feedback for an agent (read-only).
 *
 * Usage:
 *   npx tsx reputation.ts --agent-id 11155111:42 --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 *   npx tsx reputation.ts --agents "11155111:1,11155111:2" --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 *   npx tsx reputation.ts --agent-id 11155111:42 --reviewers "0x123...,0x456..." --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 */

import { SDK } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  requireChainId,
  validateAgentId,
  splitCsv,
  buildSdkConfig,
  getOverridesFromEnv,
  exitWithError,
  handleError,
  outputJson,
  tryCatch,
} from './lib/shared.js';

async function main() {
  const args = parseArgs();
  const agentId = args['agent-id'];
  const agentsRaw = args['agents'];

  if (!agentId && !agentsRaw) {
    exitWithError('At least one of --agent-id or --agents is required');
  }

  if (agentId) validateAgentId(agentId);

  const agents = agentsRaw ? splitCsv(agentsRaw) : undefined;
  if (agents) agents.forEach((id) => validateAgentId(id));

  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');
  const reviewers = args['reviewers'] ? splitCsv(args['reviewers']) : undefined;

  const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, ...getOverridesFromEnv(chainId) }));

  const repResult = agentId
    ? await tryCatch(() => sdk.getReputationSummary(agentId))
    : { value: undefined };

  const fbFilters: Record<string, unknown> = {};
  if (agentId) fbFilters.agentId = agentId;
  if (agents) fbFilters.agents = agents;
  if (reviewers) fbFilters.reviewers = reviewers;

  const fbResult = await tryCatch(() => sdk.searchFeedback(fbFilters as Parameters<typeof sdk.searchFeedback>[0]));

  const result: Record<string, unknown> = {
    reputation: repResult.value ?? { count: 0, averageValue: 0 },
    recentFeedback: fbResult.value ?? [],
  };

  if (repResult.error) result.reputationError = repResult.error;
  if (fbResult.error) result.feedbackError = fbResult.error;

  outputJson(result);
}

main().catch(handleError);
