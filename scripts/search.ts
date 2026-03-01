#!/usr/bin/env npx tsx
/**
 * Agent search script — semantic and structured search via SDK.
 *
 * Both semantic (--keyword) and structured (--name, --mcp-only, etc.) search
 * go through sdk.searchAgents(). Output is always AgentSummary[].
 *
 * Usage:
 *   npx tsx search.ts --keyword "AI coding assistant" --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 *   npx tsx search.ts --name "MyAgent" --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 *   npx tsx search.ts --keyword "MCP" --mcp-only true --chain-id 8453 --rpc-url https://mainnet.base.org
 */

import {
  parseArgs,
  requireChainId,
  createSdk,
  exitWithError,
  handleError,
  outputJson,
  isMainScript,
} from './lib/shared.js';
import { buildSearchFilters } from './lib/filters.js';

async function main() {
  const args = parseArgs();

  // --query is a legacy alias for --keyword
  if (args['query'] && !args['keyword']) {
    args['keyword'] = args['query'];
  }

  // --limit is a legacy alias for --semantic-top-k
  if (args['limit'] && !args['semantic-top-k']) {
    args['semantic-top-k'] = args['limit'];
  }

  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = args['rpc-url'];

  if (!rpcUrl) {
    exitWithError('--rpc-url is required for search.');
  }

  const sdk = createSdk({ chainId, rpcUrl });
  const { filters, options } = buildSearchFilters(args);
  outputJson(await sdk.searchAgents(filters, options));
}

if (isMainScript(import.meta.url)) {
  main().catch(handleError);
}
