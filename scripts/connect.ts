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
  handleError,
} from './lib/shared.js';

async function main() {
  const args = parseArgs();
  const agentId = requireArg(args, 'agent-id', 'agent to inspect');
  validateAgentId(agentId);
  const chainId = parseChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  const sdk = new SDK({ chainId, rpcUrl });

  const agent = await sdk.loadAgent(agentId);
  const regFile = agent.getRegistrationFile();

  let reputation = { count: 0, averageValue: 0 };
  let reputationError: string | undefined;
  try {
    reputation = await sdk.getReputationSummary(agentId);
  } catch (err) {
    reputationError = err instanceof Error ? err.message : String(err);
  }

  let onChainWallet: string | undefined;
  let walletError: string | undefined;
  try {
    onChainWallet = await agent.getWallet();
  } catch (err) {
    walletError = err instanceof Error ? err.message : String(err);
  }

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
    reputation,
    walletAddress: onChainWallet || agent.walletAddress,

    owners: regFile.owners,
    endpoints: regFile.endpoints,
  };

  if (reputationError) result.reputationError = reputationError;
  if (walletError) result.walletError = walletError;

  console.log(JSON.stringify(result, null, 2));
}

main().catch(handleError);
