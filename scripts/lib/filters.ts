import type { SearchFilters, SearchOptions, FeedbackFilters, FeedbackSearchFilters, FeedbackSearchOptions } from 'agent0-sdk';
import { splitCsv, exitWithError, parseChainId } from './shared.js';

/** Build SearchFilters and SearchOptions from CLI args. */
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
  if (args['chains']) {
    if (args['chains'] === 'all') {
      filters.chains = 'all';
    } else {
      filters.chains = splitCsv(args['chains']).map((v) => parseChainId(v));
    }
  }

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

/** Build FeedbackSearchFilters and FeedbackSearchOptions from CLI args. */
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
