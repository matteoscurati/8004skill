#!/usr/bin/env npx tsx
/**
 * View reputation summary and recent feedback for an agent (read-only).
 *
 * Usage:
 *   npx tsx reputation.ts --agent-id 11155111:42 --chain-id 11155111 --rpc-url https://rpc.sepolia.org
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
} from './lib/shared.js';

async function main() {
  const args = parseArgs();
  const agentId = requireArg(args, 'agent-id', 'agent to inspect');
  validateAgentId(agentId);
  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, ...getOverridesFromEnv(chainId) }));

  const repResult = await tryCatch(() => sdk.getReputationSummary(agentId));
  const fbResult = await tryCatch(() => sdk.searchFeedback({ agentId }));

  const result: Record<string, unknown> = {
    reputation: repResult.value ?? { count: 0, averageValue: 0 },
    recentFeedback: fbResult.value ?? [],
  };

  if (repResult.error) result.reputationError = repResult.error;
  if (fbResult.error) result.feedbackError = fbResult.error;

  outputJson(result);
}

main().catch(handleError);
