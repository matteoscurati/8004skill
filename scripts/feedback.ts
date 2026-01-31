#!/usr/bin/env npx tsx
/**
 * Give or revoke feedback to an agent on-chain.
 *
 * Usage:
 *   PRIVATE_KEY="0x..." npx tsx feedback.ts --agent-id 11155111:42 --chain-id 11155111 \
 *     --rpc-url https://rpc.sepolia.org --value 85 --tag1 quality --text "Great agent"
 *
 *   PRIVATE_KEY="0x..." npx tsx feedback.ts --action revoke --agent-id 11155111:42 \
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
  exitWithError,
  loadPrivateKey,
  handleError,
  initSecurityHardening,
} from './lib/shared.js';

async function main() {
  initSecurityHardening();
  const args = parseArgs();
  const privateKey = loadPrivateKey();

  const agentId = requireArg(args, 'agent-id', 'target agent');
  validateAgentId(agentId);

  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');
  const action = args['action'] || 'give';

  const ipfsProvider = args['ipfs'];
  const pinataJwt = args['pinata-jwt'] || process.env.PINATA_JWT;
  const filecoinPrivateKey = process.env.FILECOIN_PRIVATE_KEY;
  const ipfsNodeUrl = args['ipfs-node-url'] || process.env.IPFS_NODE_URL;

  const sdk = new SDK(
    buildSdkConfig({
      chainId,
      rpcUrl,
      privateKey,
      ipfsProvider,
      pinataJwt,
      filecoinPrivateKey,
      ipfsNodeUrl,
      ...getOverridesFromEnv(chainId),
    }),
  );

  if (action === 'revoke') {
    const feedbackIndexRaw = requireArg(args, 'feedback-index', 'feedback index to revoke');
    const feedbackIndex = parseInt(feedbackIndexRaw, 10);
    if (Number.isNaN(feedbackIndex) || feedbackIndex < 0 || feedbackIndex.toString() !== feedbackIndexRaw) {
      exitWithError('--feedback-index must be a non-negative integer');
    }

    const handle = await sdk.revokeFeedback(agentId, feedbackIndex);
    console.error(JSON.stringify({ status: 'submitted', txHash: handle.hash }));
    const { result: feedback } = await handle.waitMined({ timeoutMs: 120_000 });

    console.log(
      JSON.stringify(
        {
          agentId: feedback.agentId,
          txHash: feedback.txHash || handle.hash,
          feedbackIndex,
          action: 'revoke',
        },
        null,
        2,
      ),
    );
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
  const handle = await sdk.giveFeedback(agentId, valueRaw, tag1, tag2, endpoint, feedbackFile);

  console.error(JSON.stringify({ status: 'submitted', txHash: handle.hash }));
  const { result: feedback } = await handle.waitMined({ timeoutMs: 120_000 });

  console.log(
    JSON.stringify(
      {
        agentId: feedback.agentId,
        txHash: feedback.txHash || handle.hash,
        value: feedback.value,
        tags: feedback.tags,
        reviewer: feedback.reviewer,
      },
      null,
      2,
    ),
  );
}

main().catch(handleError);
