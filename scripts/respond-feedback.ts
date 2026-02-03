#!/usr/bin/env npx tsx
/**
 * Respond to feedback on-chain via appendResponse.
 * Signing is done via WalletConnect (user's wallet app).
 *
 * Usage:
 *   npx tsx respond-feedback.ts --agent-id 11155111:42 --client-address 0x... \
 *     --feedback-index 0 --response-uri "ipfs://Qm..." --response-hash "0x..." \
 *     --chain-id 11155111 --rpc-url https://rpc.sepolia.org
 */

import { SDK } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  requireChainId,
  validateAgentId,
  validateAddress,
  buildSdkConfig,
  getOverridesFromEnv,
  exitWithError,
  loadWalletProvider,
  handleError,
  outputJson,
  submitAndWait,
  emitWalletPrompt,
} from './lib/shared.js';

async function main() {
  const args = parseArgs();

  const agentId = requireArg(args, 'agent-id', 'target agent');
  validateAgentId(agentId);

  const clientAddress = requireArg(args, 'client-address', 'feedback client address');
  validateAddress(clientAddress, 'client-address');

  const feedbackIndexRaw = requireArg(args, 'feedback-index', 'feedback index to respond to');
  const feedbackIndex = parseInt(feedbackIndexRaw, 10);
  if (Number.isNaN(feedbackIndex) || feedbackIndex < 0) {
    exitWithError('--feedback-index must be a non-negative integer');
  }

  const responseUri = requireArg(args, 'response-uri', 'response URI (IPFS or HTTP)');
  const responseHash = requireArg(args, 'response-hash', 'response content hash');

  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  const walletProvider = await loadWalletProvider(chainId);

  const sdk = new SDK(
    buildSdkConfig({
      chainId,
      rpcUrl,
      walletProvider,
      ...getOverridesFromEnv(chainId),
    }),
  );

  emitWalletPrompt();

  const { result: feedback, txHash } = await submitAndWait(
    await sdk.appendResponse(agentId, clientAddress, feedbackIndex, {
      uri: responseUri,
      hash: responseHash,
    }),
  );

  outputJson({
    agentId: feedback.agentId,
    feedbackIndex,
    txHash: feedback.txHash || txHash,
    responseUri,
  });
}

main().catch(handleError);
