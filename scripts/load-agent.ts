#!/usr/bin/env npx tsx
/**
 * Load agent details by ID (read-only).
 *
 * Usage:
 *   npx tsx load-agent.ts --agent-id 11155111:42 --chain-id 11155111 --rpc-url https://rpc.sepolia.org
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
  const agentId = requireArg(args, 'agent-id', 'agent to load');
  validateAgentId(agentId);
  const chainId = parseChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, ...getOverridesFromEnv(chainId) }));
  const agent = await sdk.loadAgent(agentId);
  const regFile = agent.getRegistrationFile();

  const walletResult = await tryCatch(() => agent.getWallet());
  const walletAddress = walletResult.value || agent.walletAddress;

  const result: Record<string, unknown> = {
    agentId: agent.agentId,
    name: agent.name,
    description: agent.description,
    image: agent.image,
    active: regFile.active,

    mcpEndpoint: agent.mcpEndpoint,
    a2aEndpoint: agent.a2aEndpoint,
    ensName: agent.ensEndpoint,

    mcpTools: agent.mcpTools || [],
    mcpPrompts: agent.mcpPrompts || [],
    mcpResources: agent.mcpResources || [],
    a2aSkills: agent.a2aSkills || [],

    walletAddress: walletAddress || null,
    trustModels: regFile.trustModels,
    owners: regFile.owners,
    endpoints: regFile.endpoints,
    metadata: regFile.metadata,
  };

  if (walletResult.error) result.walletError = walletResult.error;

  outputJson(result);
}

main().catch(handleError);
