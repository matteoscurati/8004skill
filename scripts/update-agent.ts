#!/usr/bin/env npx tsx
/**
 * Update an existing agent's registration file.
 * Signing is done via WalletConnect (user's wallet app).
 *
 * Usage:
 *   npx tsx update-agent.ts --agent-id 11155111:42 --chain-id 11155111 \
 *     --rpc-url https://rpc.sepolia.org --ipfs pinata --name "NewName"
 */

import { TrustModel } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  requireChainId,
  splitCsv,
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
  parseEndpointType,
} from './lib/shared.js';

const MUTATION_FLAGS = [
  'name',
  'description',
  'image',
  'mcp-endpoint',
  'a2a-endpoint',
  'ens-endpoint',
  'active',
  'remove-mcp',
  'remove-a2a',
  'remove-ens',
  'trust',
  'skills',
  'domains',
  'remove-skills',
  'remove-domains',
  'x402',
  'metadata',
  'del-metadata',
  'remove-endpoint-type',
  'remove-endpoint-value',
  'remove-all-endpoints',
] as const;

function resolveStorage(args: Record<string, string>): 'ipfs' | 'http' | 'onchain' {
  const storage = args['storage'] || (args['http-uri'] ? 'http' : 'ipfs');
  if (storage !== 'ipfs' && storage !== 'http' && storage !== 'onchain') {
    exitWithError(`Invalid --storage "${storage}". Must be one of: ipfs, http, onchain.`);
  }
  return storage;
}

async function main() {
  const args = parseArgs();

  const agentId = requireArg(args, 'agent-id', 'agent to update');
  validateAgentId(agentId);

  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');
  const storage = resolveStorage(args);
  const ipfsConfig = extractIpfsConfig(args);
  const shouldRepublish =
    args['storage'] !== undefined || args['http-uri'] !== undefined || args['ipfs'] !== undefined;
  if (storage === 'ipfs') validateIpfsEnv(ipfsConfig);

  const hasMutation = MUTATION_FLAGS.some((f) => args[f] !== undefined);
  if (!hasMutation && !shouldRepublish) {
    exitWithError(
      'No update flags provided. Use at least one of: ' +
        [...MUTATION_FLAGS.map((f) => `--${f}`), '--storage', '--http-uri', '--ipfs'].join(', '),
    );
  }

  const walletProvider = await loadWalletProvider(chainId);

  const sdk = createSdk({
    chainId,
    rpcUrl,
    walletProvider,
    ipfs: storage === 'ipfs' ? ipfsConfig : undefined,
  });

  const agent = await sdk.loadAgent(agentId);

  if (args['name'] || args['description'] || args['image']) {
    agent.updateInfo(args['name'], args['description'], args['image']);
  }

  if (args['mcp-endpoint']) {
    await agent.setMCP(args['mcp-endpoint']);
  }

  if (args['a2a-endpoint']) {
    await agent.setA2A(args['a2a-endpoint']);
  }

  if (args['active'] !== undefined) {
    agent.setActive(args['active'] !== 'false');
  }

  if (args['remove-mcp'] === 'true') {
    agent.removeEndpoint({ type: parseEndpointType('mcp') });
  }

  if (args['remove-a2a'] === 'true') {
    agent.removeEndpoint({ type: parseEndpointType('a2a') });
  }

  if (args['ens-endpoint']) {
    agent.setENS(args['ens-endpoint']);
  }

  if (args['remove-ens'] === 'true') {
    agent.removeEndpoint({ type: parseEndpointType('ens') });
  }

  if (args['remove-all-endpoints'] === 'true') {
    agent.removeEndpoints();
  } else if (args['remove-endpoint-type'] || args['remove-endpoint-value']) {
    agent.removeEndpoint({
      type: args['remove-endpoint-type'] ? parseEndpointType(args['remove-endpoint-type']) : undefined,
      value: args['remove-endpoint-value'],
    });
  }

  if (args['trust']) {
    const validModels = Object.values(TrustModel) as string[];
    const trustValues = splitCsv(args['trust']);
    const invalid = trustValues.filter((v) => !validModels.includes(v));
    if (invalid.length) {
      exitWithError(`Unknown trust model(s): ${invalid.join(', ')}. Valid: ${validModels.join(', ')}`);
    }
    agent.setTrust(
      trustValues.includes(TrustModel.REPUTATION),
      trustValues.includes(TrustModel.CRYPTO_ECONOMIC),
      trustValues.includes(TrustModel.TEE_ATTESTATION),
    );
  }

  if (args['x402'] !== undefined) {
    agent.setX402Support(args['x402'] !== 'false');
  }

  const validateOasf = args['validate-oasf'] !== 'false';

  if (args['skills']) {
    for (const slug of splitCsv(args['skills'])) agent.addSkill(slug, validateOasf);
  }
  if (args['domains']) {
    for (const slug of splitCsv(args['domains'])) agent.addDomain(slug, validateOasf);
  }
  if (args['remove-skills']) {
    for (const slug of splitCsv(args['remove-skills'])) agent.removeSkill(slug);
  }
  if (args['remove-domains']) {
    for (const slug of splitCsv(args['remove-domains'])) agent.removeDomain(slug);
  }

  if (args['metadata']) {
    let kv: Record<string, unknown>;
    try {
      kv = JSON.parse(args['metadata']);
    } catch (e) {
      exitWithError(`Invalid --metadata: ${e instanceof Error ? e.message : 'not valid JSON'}. Expected format: '{"key":"value"}'`);
    }
    agent.setMetadata(kv);
  }
  if (args['del-metadata']) {
    for (const key of splitCsv(args['del-metadata'])) agent.delMetadata(key);
  }

  emitWalletPrompt();

  const httpUri = args['http-uri'];

  const handle =
    storage === 'onchain'
      ? await agent.registerOnChain()
      : storage === 'http'
        ? await agent.registerHTTP(requireArg(args, 'http-uri', 'HTTP/data URI for --storage http'))
        : ipfsConfig.ipfsProvider
          ? await agent.registerIPFS()
          : exitWithError('An IPFS provider is required when using --storage ipfs');

  const { result: regFile, txHash } = await submitAndWait(handle);

  outputJson({
    agentId: regFile.agentId,
    txHash,
    uri: storage === 'http' ? httpUri : regFile.agentURI,
    updated: true,
    storage,
  });
}

main().catch(handleError);
