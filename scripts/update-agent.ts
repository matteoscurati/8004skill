#!/usr/bin/env npx tsx
/**
 * Update an existing agent's registration file.
 *
 * Usage:
 *   PRIVATE_KEY="0x..." npx tsx update-agent.ts --agent-id 11155111:42 --chain-id 11155111 \
 *     --rpc-url https://rpc.sepolia.org --ipfs pinata --pinata-jwt "..." --name "NewName"
 */

import { SDK, EndpointType } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  parseChainId,
  splitCsv,
  validateAgentId,
  buildSdkConfig,
  getOverridesFromEnv,
  exitWithError,
  loadPrivateKey,
  handleError,
  initSecurityHardening,
} from './lib/shared.js';

const MUTATION_FLAGS = [
  'name',
  'description',
  'image',
  'mcp-endpoint',
  'a2a-endpoint',
  'active',
  'remove-mcp',
  'remove-a2a',
  'skills',
  'domains',
  'remove-skills',
  'remove-domains',
  'x402',
  'metadata',
  'del-metadata',
] as const;

async function main() {
  initSecurityHardening();
  const args = parseArgs();
  const privateKey = loadPrivateKey();

  const agentId = requireArg(args, 'agent-id', 'agent to update');
  validateAgentId(agentId);

  const chainId = parseChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');
  const ipfsProvider = args['ipfs'];
  const pinataJwt = args['pinata-jwt'] || process.env.PINATA_JWT;
  const filecoinPrivateKey = process.env.FILECOIN_PRIVATE_KEY;
  const ipfsNodeUrl = args['ipfs-node-url'] || process.env.IPFS_NODE_URL;

  const hasMutation = MUTATION_FLAGS.some((f) => args[f] !== undefined);
  if (!hasMutation) {
    exitWithError(
      'No update flags provided. Use at least one of: ' + MUTATION_FLAGS.map((f) => `--${f}`).join(', '),
    );
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
    } catch {
      exitWithError(`Invalid --metadata: not valid JSON. Expected format: '{"key":"value"}'`);
    }
    agent.setMetadata(kv);
  }
  if (args['del-metadata']) {
    for (const key of splitCsv(args['del-metadata'])) agent.delMetadata(key);
  }

  if (ipfsProvider) {
    const handle = await agent.registerIPFS();
    console.error(JSON.stringify({ status: 'submitted', txHash: handle.hash }));
    const { result: regFile } = await handle.waitMined({ timeoutMs: 120_000 });
    console.log(
      JSON.stringify(
        {
          agentId: regFile.agentId,
          txHash: handle.hash,
          uri: regFile.agentURI,
          updated: true,
        },
        null,
        2,
      ),
    );
  } else if (args['http-uri']) {
    const handle = await agent.registerHTTP(args['http-uri']);
    console.error(JSON.stringify({ status: 'submitted', txHash: handle.hash }));
    const { result: regFile } = await handle.waitMined({ timeoutMs: 120_000 });
    console.log(
      JSON.stringify(
        {
          agentId: regFile.agentId,
          txHash: handle.hash,
          uri: args['http-uri'],
          updated: true,
        },
        null,
        2,
      ),
    );
  } else {
    exitWithError('--ipfs or --http-uri is required to re-publish updated agent');
  }
}

main().catch(handleError);
