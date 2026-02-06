#!/usr/bin/env npx tsx
/**
 * Agent search script with semantic search support.
 *
 * Usage:
 *   npx tsx search.ts --query "AI coding assistant" [--chain-id 11155111] [--mcp-only] [--limit 10]
 *   npx tsx search.ts --name "MyAgent" --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 */

import { SDK } from 'agent0-sdk';
import type { SearchFilters, SearchOptions, FeedbackFilters } from 'agent0-sdk';
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

/**
 * Build SearchFilters from CLI args. Exported as a pure function for testability.
 */
export function buildSearchFilters(args: Record<string, string>): { filters: SearchFilters; options: SearchOptions } {
  const filters: SearchFilters = {};

  // Text/identity filters
  if (args['name']) filters.name = args['name'];
  if (args['description']) filters.description = args['description'];
  if (args['agent-ids']) filters.agentIds = splitCsv(args['agent-ids']);
  if (args['keyword']) filters.keyword = args['keyword'];

  // Owner/operator filters
  if (args['owners']) filters.owners = splitCsv(args['owners']);
  if (args['operators']) filters.operators = splitCsv(args['operators']);

  // Boolean existence filters
  if (args['mcp-only'] === 'true') filters.hasMCP = true;
  if (args['a2a-only'] === 'true') filters.hasA2A = true;
  if (args['has-oasf'] === 'true') filters.hasOASF = true;
  if (args['has-web'] === 'true') filters.hasWeb = true;
  if (args['active'] === 'true') filters.active = true;
  if (args['has-registration-file'] === 'true') filters.hasRegistrationFile = true;
  if (args['has-endpoints'] === 'true') filters.hasEndpoints = true;

  // Endpoint substring filters
  if (args['web-contains']) filters.webContains = args['web-contains'];
  if (args['mcp-contains']) filters.mcpContains = args['mcp-contains'];
  if (args['a2a-contains']) filters.a2aContains = args['a2a-contains'];
  if (args['ens-contains']) filters.ensContains = args['ens-contains'];
  if (args['did-contains']) filters.didContains = args['did-contains'];

  // Capability filters
  if (args['supported-trust']) filters.supportedTrust = splitCsv(args['supported-trust']);
  if (args['a2a-skills']) filters.a2aSkills = splitCsv(args['a2a-skills']);
  if (args['mcp-tools']) filters.mcpTools = splitCsv(args['mcp-tools']);
  if (args['mcp-prompts']) filters.mcpPrompts = splitCsv(args['mcp-prompts']);
  if (args['mcp-resources']) filters.mcpResources = splitCsv(args['mcp-resources']);
  if (args['oasf-skills']) filters.oasfSkills = splitCsv(args['oasf-skills']);
  if (args['oasf-domains']) filters.oasfDomains = splitCsv(args['oasf-domains']);

  // Status filters
  if (args['x402-support'] === 'true') filters.x402support = true;
  if (args['wallet-address']) filters.walletAddress = args['wallet-address'];

  // Chain filters
  if (args['chains'] === 'all') filters.chains = 'all';

  // Time filters
  if (args['registered-from']) filters.registeredAtFrom = args['registered-from'];
  if (args['registered-to']) filters.registeredAtTo = args['registered-to'];
  if (args['updated-from']) filters.updatedAtFrom = args['updated-from'];
  if (args['updated-to']) filters.updatedAtTo = args['updated-to'];

  // Metadata filters
  if (args['has-metadata-key']) filters.hasMetadataKey = args['has-metadata-key'];
  if (args['metadata-key'] && args['metadata-value']) {
    filters.metadataValue = { key: args['metadata-key'], value: args['metadata-value'] };
  }

  // Feedback sub-filters
  const feedback: FeedbackFilters = {};

  if (args['has-feedback'] === 'true') feedback.hasFeedback = true;
  if (args['has-no-feedback'] === 'true') feedback.hasNoFeedback = true;
  if (args['min-feedback-value']) feedback.minValue = parseFloat(args['min-feedback-value']);
  if (args['max-feedback-value']) feedback.maxValue = parseFloat(args['max-feedback-value']);
  if (args['min-feedback-count']) feedback.minCount = parseInt(args['min-feedback-count'], 10);
  if (args['max-feedback-count']) feedback.maxCount = parseInt(args['max-feedback-count'], 10);
  if (args['feedback-reviewers']) feedback.fromReviewers = splitCsv(args['feedback-reviewers']);
  if (args['feedback-endpoint']) feedback.endpoint = args['feedback-endpoint'];
  if (args['has-feedback-response'] === 'true') feedback.hasResponse = true;
  if (args['feedback-tag']) feedback.tag = args['feedback-tag'];
  if (args['feedback-tag1']) feedback.tag1 = args['feedback-tag1'];
  if (args['feedback-tag2']) feedback.tag2 = args['feedback-tag2'];
  if (args['include-revoked-feedback'] === 'true') feedback.includeRevoked = true;

  if (Object.keys(feedback).length > 0) {
    filters.feedback = feedback;
  }

  // Search options
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

  return { filters, options };
}

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
  const { filters, options } = buildSearchFilters(args);
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

// Only run main when executed directly, not when imported for testing
const isDirectRun = process.argv[1]?.endsWith('search.ts') || process.argv[1]?.endsWith('search.js');
if (isDirectRun) {
  main().catch(handleError);
}
