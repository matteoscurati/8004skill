#!/usr/bin/env npx tsx
/**
 * Check an agent's x402 payment readiness and generate awal CLI commands.
 *
 * Usage:
 *   npx tsx x402-status.ts --agent-id 8453:42 --chain-id 8453 --rpc-url https://mainnet.base.org
 */

import {
  parseArgs,
  requireArg,
  requireChainId,
  validateAgentId,
  createSdk,
  handleError,
  isMainScript,
  outputJson,
  tryCatch,
  buildAgentDetails,
} from './lib/shared.js';

/**
 * Build x402 status object from agent details (as returned by buildAgentDetails).
 */
export function buildX402Status(details: Record<string, unknown>): Record<string, unknown> {
  const x402support = details.x402support === true;
  const hasWallet = typeof details.walletAddress === 'string' && details.walletAddress.length > 0;
  const isActive = details.active === true;

  const mcpEndpoint = details.mcpEndpoint as string | undefined;
  const a2aEndpoint = details.a2aEndpoint as string | undefined;
  const webEndpoint = details.webEndpoint as string | undefined;
  const hasEndpoints = !!(mcpEndpoint || a2aEndpoint || webEndpoint);

  const paymentReady = x402support && hasWallet && isActive && hasEndpoints;

  return {
    agentId: details.agentId,
    name: details.name,
    x402: {
      enabled: x402support,
      paymentReady,
      readinessChecks: {
        x402support,
        hasWallet,
        isActive,
        hasEndpoints,
      },
    },
    walletAddress: details.walletAddress ?? null,
    endpoints: {
      mcp: mcpEndpoint ?? null,
      a2a: a2aEndpoint ?? null,
      web: webEndpoint ?? null,
    },
    reputation: details.reputation ?? null,
    awalCommands: buildAwalCommands({
      mcpEndpoint: mcpEndpoint || undefined,
      a2aEndpoint: a2aEndpoint || undefined,
      webEndpoint: webEndpoint || undefined,
    }),
  };
}

/**
 * Generate ready-to-use awal CLI commands for an agent's endpoints.
 * Priority: MCP > A2A > web.
 */
export function buildAwalCommands(opts: {
  mcpEndpoint?: string;
  a2aEndpoint?: string;
  webEndpoint?: string;
}): Record<string, string> {
  const commands: Record<string, string> = {};

  // Pick the best endpoint for targeted commands (MCP > A2A > web)
  const targetUrl = opts.mcpEndpoint || opts.a2aEndpoint || opts.webEndpoint;

  if (targetUrl) {
    commands.details = `npx awal x402 details ${targetUrl}`;
    commands.pay = `npx awal x402 pay ${targetUrl}`;
  }

  commands.search = 'npx awal x402 bazaar search "<query>"';
  commands.monetize = 'npm install express x402-express';

  return commands;
}

async function main() {
  const args = parseArgs();
  const agentId = requireArg(args, 'agent-id', 'agent to inspect');
  validateAgentId(agentId);
  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  const sdk = createSdk({ chainId, rpcUrl });
  const agent = await sdk.loadAgent(agentId);
  const regFile = agent.getRegistrationFile();

  const [repResult, walletResult] = await Promise.all([
    tryCatch(() => sdk.getReputationSummary(agentId)),
    tryCatch(() => agent.getWallet()),
  ]);

  const details = buildAgentDetails(agent, regFile, {
    chain: chainId,
    reputation: repResult.value ?? { count: 0, averageValue: 0 },
    walletAddress: walletResult.value || agent.walletAddress,
  });

  const result = buildX402Status(details);
  outputJson(result);
}

if (isMainScript(import.meta.url)) {
  main().catch(handleError);
}
