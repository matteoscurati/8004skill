#!/usr/bin/env npx tsx
/**
 * A2A messaging and task lifecycle management.
 *
 * Usage:
 *   npx tsx a2a.ts --action send --agent-id <id> --message <text> --chain-id <id> --rpc-url <url>
 *   npx tsx a2a.ts --action list-tasks --agent-id <id> --chain-id <id> --rpc-url <url>
 *   npx tsx a2a.ts --action get-task --agent-id <id> --task-id <tid> --chain-id <id> --rpc-url <url>
 *   npx tsx a2a.ts --action cancel-task --agent-id <id> --task-id <tid> --chain-id <id> --rpc-url <url>
 */

import type { A2APaymentRequired } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  requireChainId,
  validateAgentId,
  createSdk,
  handleError,
  isMainScript,
  outputJson,
  exitWithError,
} from './lib/shared.js';

const VALID_ACTIONS = ['send', 'list-tasks', 'get-task', 'cancel-task'] as const;
type A2AAction = (typeof VALID_ACTIONS)[number];

/**
 * Build the A2A message payload from CLI args.
 */
export function buildA2AMessage(args: Record<string, string>): {
  action: A2AAction;
  agentId: string;
  message?: string;
  taskId?: string;
  credential?: string;
  contextId?: string;
  blocking?: boolean;
} {
  const action = requireArg(args, 'action', 'A2A action') as A2AAction;
  if (!VALID_ACTIONS.includes(action)) {
    exitWithError(`Invalid --action "${action}". Must be one of: ${VALID_ACTIONS.join(', ')}`);
  }

  const agentId = requireArg(args, 'agent-id', 'target agent');
  validateAgentId(agentId);

  const message = args['message'];
  if (action === 'send' && !message) {
    exitWithError('--message is required for the "send" action.');
  }

  const taskId = args['task-id'];
  if ((action === 'get-task' || action === 'cancel-task') && !taskId) {
    exitWithError(`--task-id is required for the "${action}" action.`);
  }

  const credential = args['credential'];
  const contextId = args['context-id'];
  const blocking = args['blocking'] !== 'false';

  return { action, agentId, message, taskId, credential, contextId, blocking };
}

/**
 * Format a task status object for JSON output.
 */
export function formatTaskStatus(task: {
  taskId?: unknown;
  contextId?: unknown;
  status?: unknown;
  artifacts?: unknown;
  messages?: unknown;
}): Record<string, unknown> {
  const result: Record<string, unknown> = {
    taskId: task.taskId,
    contextId: task.contextId,
    status: task.status,
  };
  if (task.artifacts) result.artifacts = task.artifacts;
  if (task.messages) result.messages = task.messages;
  return result;
}

/**
 * Type guard for A2A payment-required responses.
 */
function isA2APaymentRequired(result: unknown): result is A2APaymentRequired {
  return typeof result === 'object' && result !== null &&
    (result as Record<string, unknown>).x402Required === true;
}

/**
 * Format a 402 payment-required response for output.
 */
function formatPaymentRequired(payment: A2APaymentRequired['x402Payment']): Record<string, unknown> {
  const accepts = Array.isArray(payment.accepts) ? payment.accepts : [];
  return {
    status: 'payment_required',
    paymentRequired: true,
    price: payment.price,
    token: payment.token,
    network: payment.network,
    accepts: accepts.map((entry: unknown, i: number) => {
      const a = entry as Record<string, unknown>;
      return { index: i, price: a.price, token: a.token, network: a.network ?? 'same as SDK chain', destination: a.destination };
    }),
    hint: 'The A2A endpoint requires payment. Use x402-pay.ts to pay, or re-run with --credential.',
  };
}

/**
 * If result is a 402 payment-required response, output it and return true.
 */
function outputIfPaymentRequired(result: unknown): boolean {
  if (isA2APaymentRequired(result)) {
    outputJson(formatPaymentRequired(result.x402Payment));
    return true;
  }
  return false;
}

/**
 * Format a message/task response for output, handling both direct messages and task creation.
 */
function formatMessageResponse(result: unknown): Record<string, unknown> {
  if (isA2APaymentRequired(result)) {
    return formatPaymentRequired(result.x402Payment);
  }

  const r = result as Record<string, unknown>;

  if ('task' in r) {
    return {
      status: 'task_created',
      taskId: r.taskId,
      contextId: r.contextId,
      taskStatus: (r.status as Record<string, unknown> | undefined)?.state ?? 'unknown',
    };
  }

  const out: Record<string, unknown> = {
    status: 'message_received',
    content: r.content,
  };
  if (r.parts) out.parts = r.parts;
  if (r.contextId) out.contextId = r.contextId;
  return out;
}

async function main() {
  const args = parseArgs();
  const payload = buildA2AMessage(args);
  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  const sdk = createSdk({ chainId, rpcUrl });

  // loadAgent (full IPFS metadata) rather than getAgent (indexed summary) because
  // getAgent requires subgraph which isn't available on all chains.
  console.error(JSON.stringify({ status: 'loading_agent', agentId: payload.agentId }));
  const agent = await sdk.loadAgent(payload.agentId);

  // Verify agent has A2A endpoint
  if (!agent.a2aEndpoint) {
    exitWithError(`Agent ${payload.agentId} has no A2A endpoint. A2A messaging requires an agent with an A2A endpoint registered.`);
  }

  // Agent satisfies A2AClient interface (messageA2A, listTasks, loadTask)
  const a2aClient = agent;

  switch (payload.action) {
    case 'send': {
      console.error(JSON.stringify({ status: 'sending', agentId: payload.agentId }));
      const result = await a2aClient.messageA2A(payload.message!, {
        blocking: payload.blocking,
        credential: payload.credential,
        contextId: payload.contextId,
      });
      outputJson(formatMessageResponse(result));
      break;
    }

    case 'list-tasks': {
      console.error(JSON.stringify({ status: 'listing_tasks', agentId: payload.agentId }));
      const tasks = await a2aClient.listTasks({ credential: payload.credential });
      if (!outputIfPaymentRequired(tasks)) {
        const taskList = tasks as Array<Record<string, unknown>>;
        outputJson({
          status: 'success',
          agentId: payload.agentId,
          taskCount: taskList.length,
          tasks: taskList.map(formatTaskStatus),
        });
      }
      break;
    }

    case 'get-task': {
      console.error(JSON.stringify({ status: 'loading_task', agentId: payload.agentId, taskId: payload.taskId }));
      const taskResult = await a2aClient.loadTask(payload.taskId!, { credential: payload.credential });
      if (!outputIfPaymentRequired(taskResult)) {
        const task = taskResult as { taskId: string; contextId: string; query: (opts?: unknown) => Promise<unknown> };
        const queryResult = await task.query() as Record<string, unknown>;
        outputJson({ status: 'success', ...formatTaskStatus(queryResult) });
      }
      break;
    }

    case 'cancel-task': {
      console.error(JSON.stringify({ status: 'cancelling_task', agentId: payload.agentId, taskId: payload.taskId }));
      const taskResult = await a2aClient.loadTask(payload.taskId!, { credential: payload.credential });
      if (!outputIfPaymentRequired(taskResult)) {
        const task = taskResult as { taskId: string; contextId: string; cancel: () => Promise<unknown> };
        const cancelResult = await task.cancel() as Record<string, unknown>;
        outputJson({ status: 'cancelled', ...formatTaskStatus(cancelResult) });
      }
      break;
    }
  }
}

if (isMainScript(import.meta.url)) {
  main().catch(handleError);
}
