#!/usr/bin/env npx tsx
/**
 * Load agent details by ID (read-only).
 *
 * Usage:
 *   npx tsx load-agent.ts --agent-id 11155111:42 --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 */

import {
  parseArgs,
  requireArg,
  requireChainId,
  validateAgentId,
  createSdk,
  handleError,
  outputJson,
  tryCatch,
  buildAgentDetails,
} from './lib/shared.js';

async function main() {
  const args = parseArgs();
  const agentId = requireArg(args, 'agent-id', 'agent to load');
  validateAgentId(agentId);
  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  const sdk = createSdk({ chainId, rpcUrl });
  const agent = await sdk.loadAgent(agentId);
  const regFile = agent.getRegistrationFile();
  const metadata = agent.getMetadata();

  const walletResult = await tryCatch(() => agent.getWallet());
  const walletAddress = walletResult.value || agent.walletAddress;

  const result = buildAgentDetails(agent, regFile, {
    walletAddress: walletAddress || null,
    wallet: {
      address: walletAddress || null,
    },
    metadata,
    registrationFile: regFile,
  });
  if (walletResult.error) {
    result.walletError = walletResult.error;
    (result.wallet as Record<string, unknown>).error = walletResult.error;
  }

  outputJson(result);
}

main().catch(handleError);
