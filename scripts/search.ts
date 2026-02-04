#!/usr/bin/env npx tsx
/**
 * Agent search script with semantic search support.
 *
 * Usage:
 *   npx tsx search.ts --query "AI coding assistant" [--chain-id 11155111] [--mcp-only] [--limit 10]
 *   npx tsx search.ts --name "MyAgent" --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 */

import { SDK } from 'agent0-sdk';
import type { SearchFilters, SearchOptions } from 'agent0-sdk';
import {
  parseArgs,
  parseChainId,
  requireChainId,
  buildSdkConfig,
  getOverridesFromEnv,
  fetchWithRetry,
  splitCsv,
  exitWithError,
  handleError,
  outputJson,
} from './lib/shared.js';

function parseLimit(raw: string | undefined, fallback = 20): number {
  if (!raw) return fallback;
  const val = parseInt(raw, 10);
  if (Number.isNaN(val) || val < 1) exitWithError(`Invalid --limit: "${raw}". Must be a positive integer.`);
  return val;
}

const DEFAULT_SEARCH_URL = 'https://agent0-semantic-search.dawid-pisarczyk.workers.dev/api/v1/search';
const FETCH_TIMEOUT_MS = 30_000;

async function semanticSearch(
  query: string,
  options: { chainId?: number; mcpOnly?: boolean; a2aOnly?: boolean; limit?: number },
) {
  const filters: { in?: Record<string, unknown[]>; exists?: string[] } = {};
  if (options.chainId) filters.in = { chainId: [options.chainId] };
  if (options.mcpOnly) (filters.exists ??= []).push('mcpEndpoint');
  if (options.a2aOnly) (filters.exists ??= []).push('a2aEndpoint');

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
        ...(filters.in || filters.exists ? { filters } : undefined),
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
  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = args['rpc-url'];

  if (!rpcUrl) {
    exitWithError('--rpc-url is required for subgraph search. Use --query for semantic search without RPC.');
  }

  const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, ...getOverridesFromEnv(chainId) }));
  const filters: SearchFilters = {};

  if (args['name']) filters.name = args['name'];
  if (args['mcp-only'] === 'true') filters.hasMCP = true;
  if (args['a2a-only'] === 'true') filters.hasA2A = true;
  if (args['active'] === 'true') filters.active = true;
  if (args['chains'] === 'all') filters.chains = 'all';
  if (args['has-oasf'] === 'true') filters.hasOASF = true;
  if (args['has-web'] === 'true') filters.hasWeb = true;
  if (args['oasf-skills']) filters.oasfSkills = splitCsv(args['oasf-skills']);
  if (args['oasf-domains']) filters.oasfDomains = splitCsv(args['oasf-domains']);
  if (args['keyword']) filters.keyword = args['keyword'];

  const options: SearchOptions = {};
  if (args['sort']) options.sort = splitCsv(args['sort']);
  if (args['semantic-min-score']) {
    const score = parseFloat(args['semantic-min-score']);
    if (Number.isNaN(score)) exitWithError(`Invalid --semantic-min-score: "${args['semantic-min-score']}". Must be a number.`);
    options.semanticMinScore = score;
  }
  if (args['semantic-top-k']) {
    const topK = parseInt(args['semantic-top-k'], 10);
    if (Number.isNaN(topK) || topK < 1) exitWithError(`Invalid --semantic-top-k: "${args['semantic-top-k']}". Must be a positive integer.`);
    options.semanticTopK = topK;
  }
  return sdk.searchAgents(filters, options);
}

async function main() {
  const args = parseArgs();

  if (args['query']) {
    const chainId = args['chain-id'] ? parseChainId(args['chain-id']) : undefined;

    const result = await semanticSearch(args['query'], {
      chainId,
      mcpOnly: args['mcp-only'] === 'true',
      a2aOnly: args['a2a-only'] === 'true',
      limit: args['limit'] ? parseLimit(args['limit']) : undefined,
    });
    outputJson(result);
  } else {
    outputJson(await subgraphSearch(args));
  }
}

main().catch(handleError);
