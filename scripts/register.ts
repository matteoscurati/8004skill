#!/usr/bin/env npx tsx
/**
 * Agent registration script for ERC-8004.
 * Registers a new agent on-chain with IPFS or HTTP metadata.
 *
 * Usage:
 *   PRIVATE_KEY="0x..." npx tsx register.ts --chain-id 11155111 --rpc-url https://rpc.sepolia.org \
 *     --name "MyAgent" --description "An AI agent" --ipfs pinata --pinata-jwt "..."
 */

import { SDK } from 'agent0-sdk';
import type { RegistrationFile } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  parseChainId,
  buildSdkConfig,
  getOverridesFromEnv,
  exitWithError,
  handleError,
} from './lib/shared.js';

async function main() {
  const args = parseArgs();
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    exitWithError('PRIVATE_KEY environment variable is required');
  }

  const chainId = parseChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');
  const name = requireArg(args, 'name', 'agent name');
  const description = requireArg(args, 'description', 'agent description');
  const ipfsProvider = args['ipfs'];
  const pinataJwt = args['pinata-jwt'] || process.env.PINATA_JWT;
  const filecoinPrivateKey = process.env.FILECOIN_PRIVATE_KEY;
  const ipfsNodeUrl = args['ipfs-node-url'] || process.env.IPFS_NODE_URL;
  const mcpEndpoint = args['mcp-endpoint'];
  const a2aEndpoint = args['a2a-endpoint'];
  const active = args['active'] !== 'false';
  const image = args['image'];
  const httpUri = args['http-uri'];

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

  const agent = sdk.createAgent(name, description, image);

  if (mcpEndpoint) await agent.setMCP(mcpEndpoint);
  if (a2aEndpoint) await agent.setA2A(a2aEndpoint);
  agent.setActive(active);
  agent.setTrust(true);

  let regFile: RegistrationFile;
  let txHash: string;

  if (httpUri) {
    const handle = await agent.registerHTTP(httpUri);
    txHash = handle.hash;
    console.error(JSON.stringify({ status: 'submitted', txHash }));
    const mined = await handle.waitMined({ timeoutMs: 120_000 });
    regFile = mined.result;
    console.log(
      JSON.stringify(
        {
          agentId: regFile.agentId,
          txHash,
          uri: httpUri,
          chain: chainId,
        },
        null,
        2,
      ),
    );
  } else if (ipfsProvider) {
    const handle = await agent.registerIPFS();
    txHash = handle.hash;
    console.error(JSON.stringify({ status: 'submitted', txHash }));
    const mined = await handle.waitMined({ timeoutMs: 120_000 });
    regFile = mined.result;
    console.log(
      JSON.stringify(
        {
          agentId: regFile.agentId,
          txHash,
          uri: regFile.agentURI,
          chain: chainId,
        },
        null,
        2,
      ),
    );
  } else {
    exitWithError('Either --ipfs or --http-uri is required for registration');
  }
}

main().catch(handleError);
