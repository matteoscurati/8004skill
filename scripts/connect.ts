#!/usr/bin/env npx tsx
/**
 * Discover and inspect an agent's connection details for agent-to-agent interaction.
 *
 * Usage:
 *   npx tsx connect.ts --agent-id 11155111:42 --chain-id 11155111 --rpc-url https://rpc.sepolia.org
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

  const result = buildAgentDetails(agent, regFile, {
    chain: chainId,
    reputation: repResult.value ?? { count: 0, averageValue: 0 },
    walletAddress: walletResult.value || agent.walletAddress,
  });
  if (repResult.error) result.reputationError = repResult.error;
  if (walletResult.error) result.walletError = walletResult.error;

  outputJson(result);
}

if (isMainScript(import.meta.url)) {
  main().catch(handleError);
}
