#!/usr/bin/env npx tsx
/**
 * Give feedback to an agent on-chain.
 *
 * Usage:
 *   PRIVATE_KEY="0x..." npx tsx feedback.ts --agent-id 11155111:42 --chain-id 11155111 \
 *     --rpc-url https://rpc.sepolia.org --value 85 --tag1 quality --text "Great agent"
 */

import { SDK } from 'agent0-sdk';
import type { FeedbackFileInput } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  parseChainId,
  parseIntStrict,
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

  const chainId = parseChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');
  const value = parseIntStrict(args['value'], 'value');
  const tag1 = args['tag1'] || '';
  const tag2 = args['tag2'] || '';
  const text = args['text'];
  const ipfsProvider = args['ipfs'];
  const pinataJwt = args['pinata-jwt'] || process.env.PINATA_JWT;
  const filecoinPrivateKey = process.env.FILECOIN_PRIVATE_KEY;
  const ipfsNodeUrl = args['ipfs-node-url'] || process.env.IPFS_NODE_URL;
  const endpoint = args['endpoint'] || '';

  if (value < -100 || value > 100) {
    exitWithError('--value must be between -100 and 100');
  }

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

  const handle = await sdk.giveFeedback(agentId, value, tag1, tag2, endpoint, feedbackFile);

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
