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
  exitWithError,
  handleError,
} from './lib/shared.js';

const DEFAULT_SEARCH_URL = 'https://search.ag0.xyz/api/v1/search';
const FETCH_TIMEOUT_MS = 30_000;

async function semanticSearch(
  query: string,
  options: { chainId?: number; mcpOnly?: boolean; a2aOnly?: boolean; limit?: number },
) {
  const filters: Record<string, { equals: unknown }> = {};
  if (options.chainId) filters.chainId = { equals: options.chainId };
  if (options.mcpOnly) filters.mcp = { equals: true };
  if (options.a2aOnly) filters.a2a = { equals: true };

  const searchUrl = process.env.SEARCH_API_URL || DEFAULT_SEARCH_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        topK: options.limit || 10,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
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

  const sdk = new SDK({ chainId, rpcUrl });
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
    const chainIdRaw = args['chain-id'];
    let chainId: number | undefined;
    if (chainIdRaw) {
      chainId = parseInt(chainIdRaw, 10);
      if (Number.isNaN(chainId)) exitWithError(`Invalid --chain-id: "${chainIdRaw}". Must be a number.`);
    }

    const limitRaw = args['limit'];
    let limit: number | undefined;
    if (limitRaw) {
      limit = parseInt(limitRaw, 10);
      if (Number.isNaN(limit)) exitWithError(`Invalid --limit: "${limitRaw}". Must be a number.`);
    }

    const result = await semanticSearch(args['query'], {
      chainId,
      mcpOnly: args['mcp-only'] === 'true',
      a2aOnly: args['a2a-only'] === 'true',
      limit,
    });
    console.log(JSON.stringify(result, null, 2));
  } else {
    const result = await subgraphSearch(args);
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch(handleError);
