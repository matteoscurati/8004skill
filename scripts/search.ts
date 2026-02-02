#!/usr/bin/env npx tsx
/**
 * Agent search script with semantic search support.
 *
 * Usage:
 *   npx tsx search.ts --query "AI coding assistant" [--chain-id 11155111] [--mcp-only] [--limit 10]
 *   npx tsx search.ts --name "MyAgent" --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 */

import { SDK } from 'agent0-sdk';
import type { SearchParams, SearchOptions } from 'agent0-sdk';
import {
  parseArgs,
  parseChainId,
  buildSdkConfig,
  getOverridesFromEnv,
  fetchWithRetry,
  exitWithError,
  handleError,
  outputJson,
} from './lib/shared.js';

const DEFAULT_SEARCH_URL = 'https://agent0-semantic-search.dawid-pisarczyk.workers.dev/api/v1/search';
const FETCH_TIMEOUT_MS = 30_000;

async function semanticSearch(
  query: string,
  options: { chainId?: number; mcpOnly?: boolean; a2aOnly?: boolean; limit?: number },
) {
  const filters: { in?: Record<string, unknown[]>; exists?: string[] } = {};
  if (options.chainId) filters.in = { chainId: [options.chainId] };
  const existsFields = [
    ...(options.mcpOnly ? ['mcpEndpoint'] : []),
    ...(options.a2aOnly ? ['a2aEndpoint'] : []),
  ];
  if (existsFields.length > 0) filters.exists = existsFields;

  const hasFilters = filters.in !== undefined || filters.exists !== undefined;
  const searchUrl = process.env.SEARCH_API_URL || DEFAULT_SEARCH_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchWithRetry(searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        limit: options.limit || 10,
        filters: hasFilters ? filters : undefined,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Search service returned ${response.status}: ${await response.text()}`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error('Search service returned non-JSON response');
  }
}

async function subgraphSearch(args: Record<string, string>) {
  const chainId = parseChainId(args['chain-id']);
  const rpcUrl = args['rpc-url'];

  if (!rpcUrl) {
    exitWithError('--rpc-url is required for subgraph search. Use --query for semantic search without RPC.');
  }

  const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, ...getOverridesFromEnv(chainId) }));
  const filters: SearchParams = {};

  if (args['name']) filters.name = args['name'];
  if (args['mcp-only'] === 'true') filters.mcp = true;
  if (args['a2a-only'] === 'true') filters.a2a = true;
  if (args['active'] === 'true') filters.active = true;
  if (args['chains'] === 'all') filters.chains = 'all';

  const limitRaw = args['limit'];
  let pageSize = 20;
  if (limitRaw) {
    pageSize = parseInt(limitRaw, 10);
    if (Number.isNaN(pageSize)) exitWithError(`Invalid --limit: "${limitRaw}". Must be a number.`);
  }

  const options: SearchOptions = { pageSize };
  return await sdk.searchAgents(filters, options);
}

async function main() {
  const args = parseArgs();

  if (args['query']) {
    const chainId = args['chain-id'] ? parseChainId(args['chain-id']) : undefined;

    let limit: number | undefined;
    if (args['limit']) {
      limit = parseInt(args['limit'], 10);
      if (Number.isNaN(limit)) exitWithError(`Invalid --limit: "${args['limit']}". Must be a number.`);
    }

    const result = await semanticSearch(args['query'], {
      chainId,
      mcpOnly: args['mcp-only'] === 'true',
      a2aOnly: args['a2a-only'] === 'true',
      limit,
    });
    outputJson(result);
  } else {
    outputJson(await subgraphSearch(args));
  }
}

main().catch(handleError);
