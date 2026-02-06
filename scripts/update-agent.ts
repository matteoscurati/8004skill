#!/usr/bin/env npx tsx
/**
 * Update an existing agent's registration file.
 * Signing is done via WalletConnect (user's wallet app).
 *
 * Usage:
 *   npx tsx update-agent.ts --agent-id 11155111:42 --chain-id 11155111 \
 *     --rpc-url https://rpc.sepolia.org --ipfs pinata --name "NewName"
 */

import { SDK, EndpointType } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  requireChainId,
  splitCsv,
  validateAgentId,
  buildSdkConfig,
  getOverridesFromEnv,
  extractIpfsConfig,
  validateIpfsEnv,
  exitWithError,
  loadWalletProvider,
  handleError,
  outputJson,
  submitAndWait,
  emitWalletPrompt,
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
] as const;

async function main() {
  const args = parseArgs();

  const agentId = requireArg(args, 'agent-id', 'agent to update');
  validateAgentId(agentId);

  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');
  const ipfsConfig = extractIpfsConfig(args);
  validateIpfsEnv(ipfsConfig);
  const { ipfsProvider, pinataJwt, filecoinPrivateKey, ipfsNodeUrl } = ipfsConfig;

  const hasMutation = MUTATION_FLAGS.some((f) => args[f] !== undefined);
  if (!hasMutation) {
    exitWithError(
      'No update flags provided. Use at least one of: ' + MUTATION_FLAGS.map((f) => `--${f}`).join(', '),
    );
  }

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
    agent.removeEndpoint({ type: EndpointType.MCP });
  }

  if (args['remove-a2a'] === 'true') {
    agent.removeEndpoint({ type: EndpointType.A2A });
  }

  if (args['ens-endpoint']) {
    agent.setENS(args['ens-endpoint']);
  }

  if (args['remove-ens'] === 'true') {
    agent.removeEndpoint({ type: EndpointType.ENS });
  }

  if (args['trust']) {
    const trustValues = splitCsv(args['trust']);
    agent.setTrust(
      trustValues.includes('reputation'),
      trustValues.includes('crypto-economic'),
      trustValues.includes('tee-attestation'),
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

  let handle;
  if (ipfsProvider) {
    handle = await agent.registerIPFS();
  } else if (httpUri) {
    handle = await agent.registerHTTP(httpUri);
  } else {
    exitWithError('--ipfs or --http-uri is required to re-publish updated agent');
  }

  const { result: regFile, txHash } = await submitAndWait(handle);

  outputJson({
    agentId: regFile.agentId,
    txHash,
    uri: httpUri || regFile.agentURI,
    updated: true,
  });
}

main().catch(handleError);
