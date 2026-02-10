#!/usr/bin/env npx tsx
/**
 * View reputation summary and recent feedback for an agent (read-only).
 *
 * Usage:
 *   npx tsx reputation.ts --agent-id 11155111:42 --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 *   npx tsx reputation.ts --agents "11155111:1,11155111:2" --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 *   npx tsx reputation.ts --agent-id 11155111:42 --reviewers "0x123...,0x456..." --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 */

import {
  parseArgs,
  requireArg,
  requireChainId,
  validateAgentId,
  splitCsv,
  createSdk,
  exitWithError,
  handleError,
  outputJson,
  tryCatch,
  isMainScript,
} from './lib/shared.js';
import { buildFeedbackFilters } from './lib/filters.js';

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

  const sdk = createSdk({ chainId, rpcUrl });

  const repResult = agentId
    ? await tryCatch(() => sdk.getReputationSummary(agentId))
    : { value: undefined };

  const { filters: fbFilters, options: fbOptions } = buildFeedbackFilters(args);

  const fbResult = await tryCatch(() =>
    sdk.searchFeedback(fbFilters as Parameters<typeof sdk.searchFeedback>[0], fbOptions),
  );

  const result: Record<string, unknown> = {
    reputation: repResult.value ?? { count: 0, averageValue: 0 },
    recentFeedback: fbResult.value ?? [],
  };

  if (repResult.error) result.reputationError = repResult.error;
  if (fbResult.error) result.feedbackError = fbResult.error;

  outputJson(result);
}

if (isMainScript(import.meta.url)) {
  main().catch(handleError);
}
