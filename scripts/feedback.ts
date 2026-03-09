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

import type { FeedbackFileInput } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  requireChainId,
  parseDecimalInRange,
  validateAgentId,
  createSdk,
  extractIpfsConfig,
  validateIpfsEnv,
  exitWithError,
  loadWalletProvider,
  handleError,
  outputJson,
  submitAndWait,
  emitWalletPrompt,
  splitCsv,
  validateAddress,
} from './lib/shared.js';

function parseFeedbackIndex(raw: string, key = 'feedback-index'): number {
  const feedbackIndex = parseInt(raw, 10);
  if (Number.isNaN(feedbackIndex) || feedbackIndex < 0) {
    exitWithError(`--${key} must be a non-negative integer`);
  }
  return feedbackIndex;
}

function parseJsonObject(raw: string, key: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    exitWithError(`Invalid --${key}: ${error instanceof Error ? error.message : 'not valid JSON'}`);
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    exitWithError(`--${key} must be a JSON object`);
  }

  return parsed as Record<string, unknown>;
}

function buildFeedbackFileInput(
  args: Record<string, string>,
  sdk: { prepareFeedbackFile: (input: FeedbackFileInput, extra?: Record<string, unknown>) => FeedbackFileInput },
): FeedbackFileInput | undefined {
  if (args['capability']) {
    exitWithError(
      '--capability is no longer supported in agent0-sdk 1.6.0. Use --mcp-tool, --mcp-prompt, --mcp-resource, --a2a-skills, --a2a-context-id, --a2a-task-id, --oasf-skills, or --oasf-domains instead.',
    );
  }

  const input: FeedbackFileInput = {
    text: args['text'],
    mcpTool: args['mcp-tool'] || args['tool-name'],
    mcpPrompt: args['mcp-prompt'],
    mcpResource: args['mcp-resource'],
    a2aSkills: args['a2a-skills'] ? splitCsv(args['a2a-skills']) : args['skill'] ? [args['skill']] : undefined,
    a2aContextId: args['a2a-context-id'],
    a2aTaskId: args['a2a-task-id'] || args['task'],
    oasfSkills: args['oasf-skills'] ? splitCsv(args['oasf-skills']) : undefined,
    oasfDomains: args['oasf-domains'] ? splitCsv(args['oasf-domains']) : undefined,
    proofOfPayment: args['proof-of-payment-json']
      ? parseJsonObject(args['proof-of-payment-json'], 'proof-of-payment-json')
      : undefined,
  };

  const hasFileFields = Object.values(input).some((value) => value !== undefined);
  return hasFileFields ? sdk.prepareFeedbackFile(input) : undefined;
}

async function main() {
  const args = parseArgs();

  const agentId = requireArg(args, 'agent-id', 'target agent');
  validateAgentId(agentId);

  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');
  const action = args['action'] || 'give';
  const ipfsConfig = extractIpfsConfig(args);

  if (action === 'get') {
    if (ipfsConfig.ipfsProvider) validateIpfsEnv(ipfsConfig);

    const clientAddress = requireArg(args, 'client-address', 'reviewer address for feedback lookup');
    validateAddress(clientAddress, 'client-address');
    const feedbackIndex = parseFeedbackIndex(requireArg(args, 'feedback-index', 'feedback index to read'));
    const sdk = createSdk({ chainId, rpcUrl, ipfs: ipfsConfig.ipfsProvider ? ipfsConfig : undefined });
    const feedback = await sdk.getFeedback(agentId, clientAddress, feedbackIndex);

    outputJson({
      ...feedback,
      action: 'get',
    });
    return;
  }

  if (action !== 'give' && action !== 'revoke') {
    exitWithError(`Unknown action: ${action}. Use get, give, or revoke.`);
  }

  if (action === 'revoke') {
    const walletProvider = await loadWalletProvider(chainId);
    const sdk = createSdk({ chainId, rpcUrl, walletProvider });
    emitWalletPrompt();

    const feedbackIndex = parseFeedbackIndex(requireArg(args, 'feedback-index', 'feedback index to revoke'));
    const { result: feedback, txHash } = await submitAndWait(await sdk.revokeFeedback(agentId, feedbackIndex));

    outputJson({
      ...feedback,
      txHash: feedback.txHash || txHash,
      feedbackIndex,
      action: 'revoke',
    });
    return;
  }

  if (ipfsConfig.ipfsProvider) {
    validateIpfsEnv(ipfsConfig);
  }

  const readOnlySdk = createSdk({
    chainId,
    rpcUrl,
    ipfs: ipfsConfig.ipfsProvider ? ipfsConfig : undefined,
  });
  const feedbackFile = buildFeedbackFileInput(args, readOnlySdk);
  if (feedbackFile && !ipfsConfig.ipfsProvider) {
    exitWithError(
      'An IPFS backend is required when attaching off-chain feedback fields. Use --ipfs helia|pinata|filecoinPin|node.',
    );
  }

  const walletProvider = await loadWalletProvider(chainId);
  const sdk = createSdk({
    chainId,
    rpcUrl,
    walletProvider,
    ipfs: ipfsConfig.ipfsProvider ? ipfsConfig : undefined,
  });

  emitWalletPrompt();

  // Validate the value as a decimal in range; the SDK accepts the raw string for encoding
  const valueRaw = requireArg(args, 'value', 'feedback value');
  parseDecimalInRange(valueRaw, 'value', -100, 100);

  const tag1 = args['tag1'] || '';
  const tag2 = args['tag2'] || '';
  const endpoint = args['endpoint'] || '';

  // Pass the raw string to the SDK — it handles encoding (value + valueDecimals)
  const { result: feedback, txHash } = await submitAndWait(
    await sdk.giveFeedback(agentId, valueRaw, tag1, tag2, endpoint, feedbackFile),
  );

  outputJson({
    ...feedback,
    txHash: feedback.txHash || txHash,
    action: 'give',
  });
}

main().catch(handleError);
