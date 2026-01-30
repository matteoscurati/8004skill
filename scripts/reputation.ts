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
  parseChainId,
  validateAgentId,
  handleError,
} from './lib/shared.js';

async function main() {
  const args = parseArgs();
  const agentId = requireArg(args, 'agent-id', 'agent to inspect');
  validateAgentId(agentId);
  const chainId = parseChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  const sdk = new SDK({ chainId, rpcUrl });

  let reputation = { count: 0, averageValue: 0 };
  let reputationError: string | undefined;
  try {
    reputation = await sdk.getReputationSummary(agentId);
  } catch (err) {
    reputationError = err instanceof Error ? err.message : String(err);
  }

  let recentFeedback: unknown[] = [];
  let feedbackError: string | undefined;
  try {
    recentFeedback = await sdk.searchFeedback({ agentId });
  } catch (err) {
    feedbackError = err instanceof Error ? err.message : String(err);
  }

  const result: Record<string, unknown> = {
    reputation,
    recentFeedback,
  };

  if (reputationError) result.reputationError = reputationError;
  if (feedbackError) result.feedbackError = feedbackError;

  console.log(JSON.stringify(result, null, 2));
}

main().catch(handleError);
