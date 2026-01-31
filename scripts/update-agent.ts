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
  validateAgentId,
  buildSdkConfig,
  getOverridesFromEnv,
  exitWithError,
  loadPrivateKey,
  handleError,
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
] as const;

async function main() {
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
