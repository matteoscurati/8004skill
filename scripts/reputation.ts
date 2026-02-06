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
import type { FeedbackSearchFilters, FeedbackSearchOptions } from 'agent0-sdk';
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

/**
 * Build FeedbackSearchFilters and FeedbackSearchOptions from CLI args.
 * Exported as a pure function for testability.
 */
export function buildFeedbackFilters(args: Record<string, string>): {
  filters: FeedbackSearchFilters;
  options: FeedbackSearchOptions;
} {
  const filters: FeedbackSearchFilters = {};

  if (args['agent-id']) filters.agentId = args['agent-id'];
  if (args['agents']) filters.agents = splitCsv(args['agents']);
  if (args['reviewers']) filters.reviewers = splitCsv(args['reviewers']);
  if (args['tags']) filters.tags = splitCsv(args['tags']);
  if (args['capabilities']) filters.capabilities = splitCsv(args['capabilities']);
  if (args['skills']) filters.skills = splitCsv(args['skills']);
  if (args['tasks']) filters.tasks = splitCsv(args['tasks']);
  if (args['names']) filters.names = splitCsv(args['names']);
  if (args['include-revoked'] === 'true') filters.includeRevoked = true;

  const options: FeedbackSearchOptions = {};
  if (args['min-value']) options.minValue = parseFloat(args['min-value']);
  if (args['max-value']) options.maxValue = parseFloat(args['max-value']);

  return { filters, options };
}

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

  const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, ...getOverridesFromEnv(chainId) }));

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

// Only run main when executed directly, not when imported for testing
const isDirectRun = process.argv[1]?.endsWith('reputation.ts') || process.argv[1]?.endsWith('reputation.js');
if (isDirectRun) {
  main().catch(handleError);
}
