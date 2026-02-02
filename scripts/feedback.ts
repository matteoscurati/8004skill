#!/usr/bin/env npx tsx
/**
 * Give or revoke feedback to an agent on-chain.
 * Signing is done via WalletConnect (user's wallet app).
 *
 * Usage:
 *   npx tsx feedback.ts --agent-id 11155111:42 --chain-id 11155111 \
 *     --rpc-url https://rpc.sepolia.org --value 85 --tag1 quality --text "Great agent"
 *
 *   npx tsx feedback.ts --action revoke --agent-id 11155111:42 \
 *     --chain-id 11155111 --rpc-url https://rpc.sepolia.org --feedback-index 0
 */

import { SDK } from 'agent0-sdk';
import type { FeedbackFileInput } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  requireChainId,
  parseDecimalInRange,
  validateAgentId,
  buildSdkConfig,
  getOverridesFromEnv,
  extractIpfsConfig,
  exitWithError,
  loadWalletProvider,
  handleError,
  outputJson,
  submitAndWait,
} from './lib/shared.js';

async function main() {
  const args = parseArgs();

  const agentId = requireArg(args, 'agent-id', 'target agent');
  validateAgentId(agentId);

  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');
  const action = args['action'] || 'give';

  const { ipfsProvider, pinataJwt, filecoinPrivateKey, ipfsNodeUrl } = extractIpfsConfig(args);

  const walletProvider = await loadWalletProvider(chainId);

  const sdk = new SDK(
    buildSdkConfig({
      chainId,
      rpcUrl,
      walletProvider,
      ipfsProvider,
      pinataJwt,
      filecoinPrivateKey,
      ipfsNodeUrl,
      ...getOverridesFromEnv(chainId),
    }),
  );

  console.error(JSON.stringify({ status: 'awaiting_wallet', message: 'Check your wallet to approve the transaction...' }));

  if (action === 'revoke') {
    const feedbackIndexRaw = requireArg(args, 'feedback-index', 'feedback index to revoke');
    const feedbackIndex = parseInt(feedbackIndexRaw, 10);
    if (Number.isNaN(feedbackIndex) || feedbackIndex < 0) {
      exitWithError('--feedback-index must be a non-negative integer');
    }

    const { result: feedback, txHash } = await submitAndWait(await sdk.revokeFeedback(agentId, feedbackIndex));

    outputJson({
      agentId: feedback.agentId,
      txHash: feedback.txHash || txHash,
      feedbackIndex,
      action: 'revoke',
    });
    return;
  }

  if (action !== 'give') {
    exitWithError(`Unknown action: ${action}. Use give or revoke.`);
  }

  // Validate the value as a decimal in range; the SDK accepts the raw string for encoding
  const valueRaw = requireArg(args, 'value', 'feedback value');
  parseDecimalInRange(valueRaw, 'value', -100, 100);

  const tag1 = args['tag1'] || '';
  const tag2 = args['tag2'] || '';
  const text = args['text'];
  const endpoint = args['endpoint'] || '';

  let feedbackFile: FeedbackFileInput | undefined;
  if (text) {
    feedbackFile = sdk.prepareFeedbackFile({
      text,
      capability: args['capability'],
      name: args['tool-name'],
      skill: args['skill'],
      task: args['task'],
    });
  }

  // Pass the raw string to the SDK — it handles encoding (value + valueDecimals)
  const { result: feedback, txHash } = await submitAndWait(
    await sdk.giveFeedback(agentId, valueRaw, tag1, tag2, endpoint, feedbackFile),
  );

  outputJson({
    agentId: feedback.agentId,
    txHash: feedback.txHash || txHash,
    value: feedback.value,
    tags: feedback.tags,
    reviewer: feedback.reviewer,
  });
}

main().catch(handleError);
