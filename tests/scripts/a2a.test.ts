import { describe, it, expect } from 'vitest';
import { buildA2AMessage, formatTaskStatus } from '../../scripts/a2a.js';
import { setupCliSpies } from '../helpers/cli-spies.js';

setupCliSpies();

describe('buildA2AMessage', () => {
  it('parses send action with all required args', () => {
    const result = buildA2AMessage({
      'action': 'send',
      'agent-id': '11155111:42',
      'message': 'Hello agent',
    });
    expect(result.action).toBe('send');
    expect(result.agentId).toBe('11155111:42');
    expect(result.message).toBe('Hello agent');
    expect(result.blocking).toBe(true);
  });

  it('parses list-tasks action', () => {
    const result = buildA2AMessage({
      'action': 'list-tasks',
      'agent-id': '8453:17',
    });
    expect(result.action).toBe('list-tasks');
    expect(result.agentId).toBe('8453:17');
  });

  it('parses get-task action with task-id', () => {
    const result = buildA2AMessage({
      'action': 'get-task',
      'agent-id': '8453:17',
      'task-id': 'task-abc-123',
    });
    expect(result.action).toBe('get-task');
    expect(result.taskId).toBe('task-abc-123');
  });

  it('parses cancel-task action with task-id', () => {
    const result = buildA2AMessage({
      'action': 'cancel-task',
      'agent-id': '8453:17',
      'task-id': 'task-abc-123',
    });
    expect(result.action).toBe('cancel-task');
    expect(result.taskId).toBe('task-abc-123');
  });

  it('passes credential and context-id when provided', () => {
    const result = buildA2AMessage({
      'action': 'send',
      'agent-id': '11155111:42',
      'message': 'Test',
      'credential': 'my-api-key',
      'context-id': 'ctx-123',
    });
    expect(result.credential).toBe('my-api-key');
    expect(result.contextId).toBe('ctx-123');
  });

  it('sets blocking to false when explicitly disabled', () => {
    const result = buildA2AMessage({
      'action': 'send',
      'agent-id': '11155111:42',
      'message': 'Test',
      'blocking': 'false',
    });
    expect(result.blocking).toBe(false);
  });

  it('exits on invalid action', () => {
    expect(() => buildA2AMessage({
      'action': 'invalid' as string,
      'agent-id': '11155111:42',
    })).toThrow('process.exit(1)');
  });

  it('exits when action is missing', () => {
    expect(() => buildA2AMessage({
      'agent-id': '11155111:42',
    })).toThrow('process.exit(1)');
  });

  it('exits when agent-id is missing', () => {
    expect(() => buildA2AMessage({
      'action': 'send',
      'message': 'Hello',
    })).toThrow('process.exit(1)');
  });

  it('exits when agent-id has invalid format', () => {
    expect(() => buildA2AMessage({
      'action': 'send',
      'agent-id': 'not-valid',
      'message': 'Hello',
    })).toThrow('process.exit(1)');
  });

  it('exits when send action is missing message', () => {
    expect(() => buildA2AMessage({
      'action': 'send',
      'agent-id': '11155111:42',
    })).toThrow('process.exit(1)');
  });

  it('exits when get-task is missing task-id', () => {
    expect(() => buildA2AMessage({
      'action': 'get-task',
      'agent-id': '11155111:42',
    })).toThrow('process.exit(1)');
  });

  it('exits when cancel-task is missing task-id', () => {
    expect(() => buildA2AMessage({
      'action': 'cancel-task',
      'agent-id': '11155111:42',
    })).toThrow('process.exit(1)');
  });
});

describe('formatTaskStatus', () => {
  it('formats a task with all fields', () => {
    const result = formatTaskStatus({
      taskId: 'task-1',
      contextId: 'ctx-1',
      status: { state: 'completed' },
      artifacts: [{ data: 'result' }],
      messages: [{ role: 'agent', content: 'Done' }],
    });
    expect(result.taskId).toBe('task-1');
    expect(result.contextId).toBe('ctx-1');
    expect(result.status).toEqual({ state: 'completed' });
    expect(result.artifacts).toEqual([{ data: 'result' }]);
    expect(result.messages).toEqual([{ role: 'agent', content: 'Done' }]);
  });

  it('omits optional fields when not present', () => {
    const result = formatTaskStatus({
      taskId: 'task-2',
      contextId: 'ctx-2',
      status: { state: 'open' },
    });
    expect(result.taskId).toBe('task-2');
    expect(result.artifacts).toBeUndefined();
    expect(result.messages).toBeUndefined();
  });

  it('handles undefined status', () => {
    const result = formatTaskStatus({
      taskId: 'task-3',
      contextId: 'ctx-3',
    });
    expect(result.status).toBeUndefined();
  });

  it('handles empty artifacts and messages arrays', () => {
    const result = formatTaskStatus({
      taskId: 'task-4',
      contextId: 'ctx-4',
      status: { state: 'working' },
      artifacts: [],
      messages: [],
    });
    // Empty arrays are falsy-ish but are truthy in JS
    expect(result.artifacts).toEqual([]);
    expect(result.messages).toEqual([]);
  });
});
