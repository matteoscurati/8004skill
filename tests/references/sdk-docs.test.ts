import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

function read(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('sdk documentation alignment', () => {
  it('documents the 1.6.0 registration and feedback deltas', () => {
    const api = read('references/sdk-api.md');
    const types = read('references/sdk-types.md');
    const schema = read('references/agent-schema.md');

    expect(api).toContain('registerOnChain()');
    expect(api).toContain(`ipfs?: 'pinata' | 'filecoinPin' | 'node' | 'helia'`);
    expect(api).toContain('mcpTool?');

    expect(types).toContain('mcpTool?: string');
    expect(types).toContain('a2aContextId?: string');
    expect(types).not.toContain('capability?: string');

    expect(schema).toContain('data:application/json;base64');
    expect(schema).toContain('mcpTool');
    expect(schema).not.toContain('context');
  });

  it('documents the new operational flows in the skill body', () => {
    const skill = read('SKILL.md');

    expect(skill).toContain('get-agent.ts');
    expect(skill).toContain('ownership.ts');
    expect(skill).toContain('sdk-info.ts');
    expect(skill).toContain('--storage');
    expect(skill).toContain('--action get');
  });
});
