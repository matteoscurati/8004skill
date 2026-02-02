#!/usr/bin/env npx tsx
/**
 * Discover and inspect an agent's connection details for agent-to-agent interaction.
 *
 * Usage:
 *   npx tsx connect.ts --agent-id 11155111:42 --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 */

import { SDK } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  parseChainId,
  validateAgentId,
  buildSdkConfig,
  getOverridesFromEnv,
  handleError,
  outputJson,
  tryCatch,
} from './lib/shared.js';

async function main() {
  const args = parseArgs();
  const agentId = requireArg(args, 'agent-id', 'agent to inspect');
  validateAgentId(agentId);
  const chainId = parseChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, ...getOverridesFromEnv(chainId) }));

  const agent = await sdk.loadAgent(agentId);
  const regFile = agent.getRegistrationFile();

  const repResult = await tryCatch(() => sdk.getReputationSummary(agentId));
  const walletResult = await tryCatch(() => agent.getWallet());

  const result: Record<string, unknown> = {
    agentId: agent.agentId,
    name: agent.name,
    description: agent.description,
    image: agent.image,
    active: regFile.active,
    chain: chainId,

    mcpEndpoint: agent.mcpEndpoint,
    a2aEndpoint: agent.a2aEndpoint,
    ensName: agent.ensEndpoint,

    mcpTools: agent.mcpTools || [],
    mcpPrompts: agent.mcpPrompts || [],
    mcpResources: agent.mcpResources || [],
    a2aSkills: agent.a2aSkills || [],

    trustModels: regFile.trustModels,
    reputation: repResult.value ?? { count: 0, averageValue: 0 },
    walletAddress: walletResult.value || agent.walletAddress,

    owners: regFile.owners,
    endpoints: regFile.endpoints,
  };

  if (repResult.error) result.reputationError = repResult.error;
  if (walletResult.error) result.walletError = walletResult.error;

  outputJson(result);
}

main().catch(handleError);
