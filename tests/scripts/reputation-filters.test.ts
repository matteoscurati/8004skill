import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildFeedbackFilters } from '../../scripts/reputation.js';

beforeEach(() => {
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code})`);
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildFeedbackFilters', () => {
  it('returns empty filters and options for empty args', () => {
    const { filters, options } = buildFeedbackFilters({});
    expect(filters).toEqual({});
    expect(options).toEqual({});
  });

  it('maps --agent-id to filters.agentId', () => {
    const { filters } = buildFeedbackFilters({ 'agent-id': '1:42' });
    expect(filters.agentId).toBe('1:42');
  });

  it('maps --agents CSV to filters.agents', () => {
    const { filters } = buildFeedbackFilters({ agents: '1:1,1:2' });
    expect(filters.agents).toEqual(['1:1', '1:2']);
  });

  it('maps --reviewers CSV to filters.reviewers', () => {
    const { filters } = buildFeedbackFilters({ reviewers: '0xabc,0xdef' });
    expect(filters.reviewers).toEqual(['0xabc', '0xdef']);
  });

  it('maps --tags CSV to filters.tags', () => {
    const { filters } = buildFeedbackFilters({ tags: 'starred,reachable' });
    expect(filters.tags).toEqual(['starred', 'reachable']);
  });

  it('maps --capabilities CSV to filters.capabilities', () => {
    const { filters } = buildFeedbackFilters({ capabilities: 'nlp,vision' });
    expect(filters.capabilities).toEqual(['nlp', 'vision']);
  });

  it('maps --skills CSV to filters.skills', () => {
    const { filters } = buildFeedbackFilters({ skills: 'summarize,translate' });
    expect(filters.skills).toEqual(['summarize', 'translate']);
  });

  it('maps --tasks CSV to filters.tasks', () => {
    const { filters } = buildFeedbackFilters({ tasks: 'task1,task2' });
    expect(filters.tasks).toEqual(['task1', 'task2']);
  });

  it('maps --names CSV to filters.names', () => {
    const { filters } = buildFeedbackFilters({ names: 'agent1,agent2' });
    expect(filters.names).toEqual(['agent1', 'agent2']);
  });

  it('maps --include-revoked true to filters.includeRevoked', () => {
    const { filters } = buildFeedbackFilters({ 'include-revoked': 'true' });
    expect(filters.includeRevoked).toBe(true);
  });

  it('does not set includeRevoked when value is not "true"', () => {
    const { filters } = buildFeedbackFilters({ 'include-revoked': 'false' });
    expect(filters.includeRevoked).toBeUndefined();
  });

  it('maps --min-value to options.minValue', () => {
    const { options } = buildFeedbackFilters({ 'min-value': '50' });
    expect(options.minValue).toBe(50);
  });

  it('maps --max-value to options.maxValue', () => {
    const { options } = buildFeedbackFilters({ 'max-value': '95.5' });
    expect(options.maxValue).toBe(95.5);
  });

  it('maps both --min-value and --max-value', () => {
    const { options } = buildFeedbackFilters({ 'min-value': '-10', 'max-value': '100' });
    expect(options.minValue).toBe(-10);
    expect(options.maxValue).toBe(100);
  });

  // Edge cases
  it('handles single-element CSV for array filters', () => {
    const { filters } = buildFeedbackFilters({ tags: 'starred' });
    expect(filters.tags).toEqual(['starred']);
  });

  it('handles CSV with spaces', () => {
    const { filters } = buildFeedbackFilters({ tags: ' starred , reachable ' });
    expect(filters.tags).toEqual(['starred', 'reachable']);
  });

  it('builds complete filters and options together', () => {
    const { filters, options } = buildFeedbackFilters({
      'agent-id': '1:42',
      reviewers: '0xabc',
      tags: 'starred',
      'include-revoked': 'true',
      'min-value': '50',
      'max-value': '100',
    });
    expect(filters.agentId).toBe('1:42');
    expect(filters.reviewers).toEqual(['0xabc']);
    expect(filters.tags).toEqual(['starred']);
    expect(filters.includeRevoked).toBe(true);
    expect(options.minValue).toBe(50);
    expect(options.maxValue).toBe(100);
  });
});
