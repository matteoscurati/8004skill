import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildSearchFilters } from '../../scripts/search.js';

let exitSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildSearchFilters', () => {
  it('returns empty filters and options for empty args', () => {
    const { filters, options } = buildSearchFilters({});
    expect(filters).toEqual({});
    expect(options).toEqual({});
  });

  // Text/identity filters
  it('maps --name to filters.name', () => {
    const { filters } = buildSearchFilters({ name: 'TestAgent' });
    expect(filters.name).toBe('TestAgent');
  });

  it('maps --description to filters.description', () => {
    const { filters } = buildSearchFilters({ description: 'AI assistant' });
    expect(filters.description).toBe('AI assistant');
  });

  it('maps --agent-ids CSV to filters.agentIds', () => {
    const { filters } = buildSearchFilters({ 'agent-ids': '1:1,1:2,1:3' });
    expect(filters.agentIds).toEqual(['1:1', '1:2', '1:3']);
  });

  it('maps --keyword to filters.keyword', () => {
    const { filters } = buildSearchFilters({ keyword: 'trading' });
    expect(filters.keyword).toBe('trading');
  });

  // Owner/operator filters
  it('maps --owners CSV to filters.owners', () => {
    const { filters } = buildSearchFilters({ owners: '0xabc,0xdef' });
    expect(filters.owners).toEqual(['0xabc', '0xdef']);
  });

  it('maps --operators CSV to filters.operators', () => {
    const { filters } = buildSearchFilters({ operators: '0x111,0x222' });
    expect(filters.operators).toEqual(['0x111', '0x222']);
  });

  // Boolean existence filters
  it('maps --has-registration-file true', () => {
    const { filters } = buildSearchFilters({ 'has-registration-file': 'true' });
    expect(filters.hasRegistrationFile).toBe(true);
  });

  it('maps --has-endpoints true', () => {
    const { filters } = buildSearchFilters({ 'has-endpoints': 'true' });
    expect(filters.hasEndpoints).toBe(true);
  });

  it('maps --mcp-only true to filters.hasMCP', () => {
    const { filters } = buildSearchFilters({ 'mcp-only': 'true' });
    expect(filters.hasMCP).toBe(true);
  });

  it('maps --a2a-only true to filters.hasA2A', () => {
    const { filters } = buildSearchFilters({ 'a2a-only': 'true' });
    expect(filters.hasA2A).toBe(true);
  });

  it('maps --has-oasf true', () => {
    const { filters } = buildSearchFilters({ 'has-oasf': 'true' });
    expect(filters.hasOASF).toBe(true);
  });

  it('maps --has-web true', () => {
    const { filters } = buildSearchFilters({ 'has-web': 'true' });
    expect(filters.hasWeb).toBe(true);
  });

  it('maps --active true', () => {
    const { filters } = buildSearchFilters({ active: 'true' });
    expect(filters.active).toBe(true);
  });

  // Endpoint substring filters
  it('maps --web-contains', () => {
    const { filters } = buildSearchFilters({ 'web-contains': 'example.com' });
    expect(filters.webContains).toBe('example.com');
  });

  it('maps --mcp-contains', () => {
    const { filters } = buildSearchFilters({ 'mcp-contains': 'mcp.io' });
    expect(filters.mcpContains).toBe('mcp.io');
  });

  it('maps --a2a-contains', () => {
    const { filters } = buildSearchFilters({ 'a2a-contains': 'a2a.io' });
    expect(filters.a2aContains).toBe('a2a.io');
  });

  it('maps --ens-contains', () => {
    const { filters } = buildSearchFilters({ 'ens-contains': '.eth' });
    expect(filters.ensContains).toBe('.eth');
  });

  it('maps --did-contains', () => {
    const { filters } = buildSearchFilters({ 'did-contains': 'did:key' });
    expect(filters.didContains).toBe('did:key');
  });

  // Capability filters
  it('maps --supported-trust CSV', () => {
    const { filters } = buildSearchFilters({ 'supported-trust': 'reputation,tee-attestation' });
    expect(filters.supportedTrust).toEqual(['reputation', 'tee-attestation']);
  });

  it('maps --a2a-skills CSV', () => {
    const { filters } = buildSearchFilters({ 'a2a-skills': 'skill1,skill2' });
    expect(filters.a2aSkills).toEqual(['skill1', 'skill2']);
  });

  it('maps --mcp-tools CSV', () => {
    const { filters } = buildSearchFilters({ 'mcp-tools': 'tool1,tool2' });
    expect(filters.mcpTools).toEqual(['tool1', 'tool2']);
  });

  it('maps --mcp-prompts CSV', () => {
    const { filters } = buildSearchFilters({ 'mcp-prompts': 'p1,p2' });
    expect(filters.mcpPrompts).toEqual(['p1', 'p2']);
  });

  it('maps --mcp-resources CSV', () => {
    const { filters } = buildSearchFilters({ 'mcp-resources': 'r1' });
    expect(filters.mcpResources).toEqual(['r1']);
  });

  it('maps --oasf-skills CSV', () => {
    const { filters } = buildSearchFilters({ 'oasf-skills': 'nlp/summarization,trading/dex' });
    expect(filters.oasfSkills).toEqual(['nlp/summarization', 'trading/dex']);
  });

  it('maps --oasf-domains CSV', () => {
    const { filters } = buildSearchFilters({ 'oasf-domains': 'finance/trading' });
    expect(filters.oasfDomains).toEqual(['finance/trading']);
  });

  // Status filters
  it('maps --x402-support true', () => {
    const { filters } = buildSearchFilters({ 'x402-support': 'true' });
    expect(filters.x402support).toBe(true);
  });

  it('maps --wallet-address', () => {
    const { filters } = buildSearchFilters({ 'wallet-address': '0xabc123' });
    expect(filters.walletAddress).toBe('0xabc123');
  });

  // Chain filters
  it('maps --chains all', () => {
    const { filters } = buildSearchFilters({ chains: 'all' });
    expect(filters.chains).toBe('all');
  });

  // Time filters
  it('maps --registered-from and --registered-to', () => {
    const { filters } = buildSearchFilters({
      'registered-from': '2025-01-01',
      'registered-to': '2025-12-31',
    });
    expect(filters.registeredAtFrom).toBe('2025-01-01');
    expect(filters.registeredAtTo).toBe('2025-12-31');
  });

  it('maps --updated-from and --updated-to', () => {
    const { filters } = buildSearchFilters({
      'updated-from': '2025-06-01',
      'updated-to': '2025-06-30',
    });
    expect(filters.updatedAtFrom).toBe('2025-06-01');
    expect(filters.updatedAtTo).toBe('2025-06-30');
  });

  // Metadata filters
  it('maps --has-metadata-key', () => {
    const { filters } = buildSearchFilters({ 'has-metadata-key': 'version' });
    expect(filters.hasMetadataKey).toBe('version');
  });

  it('maps --metadata-key + --metadata-value', () => {
    const { filters } = buildSearchFilters({ 'metadata-key': 'version', 'metadata-value': '2.0' });
    expect(filters.metadataValue).toEqual({ key: 'version', value: '2.0' });
  });

  it('ignores --metadata-key without --metadata-value', () => {
    const { filters } = buildSearchFilters({ 'metadata-key': 'version' });
    expect(filters.metadataValue).toBeUndefined();
  });

  // Feedback sub-filters
  it('builds feedback sub-filter for --has-feedback', () => {
    const { filters } = buildSearchFilters({ 'has-feedback': 'true' });
    expect(filters.feedback).toBeDefined();
    expect(filters.feedback!.hasFeedback).toBe(true);
  });

  it('builds feedback sub-filter for --has-no-feedback', () => {
    const { filters } = buildSearchFilters({ 'has-no-feedback': 'true' });
    expect(filters.feedback).toBeDefined();
    expect(filters.feedback!.hasNoFeedback).toBe(true);
  });

  it('builds feedback sub-filter for --min-feedback-value / --max-feedback-value', () => {
    const { filters } = buildSearchFilters({
      'min-feedback-value': '50',
      'max-feedback-value': '100',
    });
    expect(filters.feedback!.minValue).toBe(50);
    expect(filters.feedback!.maxValue).toBe(100);
  });

  it('builds feedback sub-filter for --min-feedback-count / --max-feedback-count', () => {
    const { filters } = buildSearchFilters({
      'min-feedback-count': '5',
      'max-feedback-count': '20',
    });
    expect(filters.feedback!.minCount).toBe(5);
    expect(filters.feedback!.maxCount).toBe(20);
  });

  it('builds feedback sub-filter for --feedback-reviewers CSV', () => {
    const { filters } = buildSearchFilters({ 'feedback-reviewers': '0xabc,0xdef' });
    expect(filters.feedback!.fromReviewers).toEqual(['0xabc', '0xdef']);
  });

  it('builds feedback sub-filter for --feedback-endpoint', () => {
    const { filters } = buildSearchFilters({ 'feedback-endpoint': 'https://mcp.example.com' });
    expect(filters.feedback!.endpoint).toBe('https://mcp.example.com');
  });

  it('builds feedback sub-filter for --has-feedback-response', () => {
    const { filters } = buildSearchFilters({ 'has-feedback-response': 'true' });
    expect(filters.feedback!.hasResponse).toBe(true);
  });

  it('builds feedback sub-filter for --feedback-tag', () => {
    const { filters } = buildSearchFilters({ 'feedback-tag': 'starred' });
    expect(filters.feedback!.tag).toBe('starred');
  });

  it('builds feedback sub-filter for --feedback-tag1 / --feedback-tag2', () => {
    const { filters } = buildSearchFilters({ 'feedback-tag1': 'quality', 'feedback-tag2': 'speed' });
    expect(filters.feedback!.tag1).toBe('quality');
    expect(filters.feedback!.tag2).toBe('speed');
  });

  it('builds feedback sub-filter for --include-revoked-feedback', () => {
    const { filters } = buildSearchFilters({ 'include-revoked-feedback': 'true' });
    expect(filters.feedback!.includeRevoked).toBe(true);
  });

  it('does not set feedback when no feedback flags are present', () => {
    const { filters } = buildSearchFilters({ name: 'test' });
    expect(filters.feedback).toBeUndefined();
  });

  // Search options
  it('maps --sort CSV to options.sort', () => {
    const { options } = buildSearchFilters({ sort: 'name:asc,createdAt:desc' });
    expect(options.sort).toEqual(['name:asc', 'createdAt:desc']);
  });

  it('maps --semantic-min-score to options', () => {
    const { options } = buildSearchFilters({ 'semantic-min-score': '0.7' });
    expect(options.semanticMinScore).toBe(0.7);
  });

  it('maps --semantic-top-k to options', () => {
    const { options } = buildSearchFilters({ 'semantic-top-k': '50' });
    expect(options.semanticTopK).toBe(50);
  });

  it('exits on invalid --semantic-min-score', () => {
    expect(() => buildSearchFilters({ 'semantic-min-score': 'notanumber' })).toThrow('process.exit(1)');
  });

  it('exits on invalid --semantic-top-k', () => {
    expect(() => buildSearchFilters({ 'semantic-top-k': '-1' })).toThrow('process.exit(1)');
  });

  // CSV edge cases
  it('handles single-element CSV for array filters', () => {
    const { filters } = buildSearchFilters({ 'mcp-tools': 'singletool' });
    expect(filters.mcpTools).toEqual(['singletool']);
  });

  it('handles CSV with spaces for array filters', () => {
    const { filters } = buildSearchFilters({ 'mcp-tools': ' tool1 , tool2 ' });
    expect(filters.mcpTools).toEqual(['tool1', 'tool2']);
  });

  // Boolean parsing edge case
  it('does not set boolean filters when value is not "true"', () => {
    const { filters } = buildSearchFilters({ 'mcp-only': 'false', active: 'false' });
    expect(filters.hasMCP).toBeUndefined();
    expect(filters.active).toBeUndefined();
  });
});
