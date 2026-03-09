#!/usr/bin/env npx tsx
/**
 * Agent registration script for ERC-8004.
 * Registers a new agent on-chain with IPFS or HTTP metadata.
 * Signing is done via WalletConnect (user's wallet app).
 *
 * Usage:
 *   npx tsx register.ts --chain-id 11155111 --rpc-url https://rpc.sepolia.org \
 *     --name "MyAgent" --description "An AI agent" --ipfs pinata
 */

import type { RegistrationFile } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  requireChainId,
  splitCsv,
  createSdk,
  extractIpfsConfig,
  validateIpfsEnv,
  exitWithError,
  loadWalletProvider,
  handleError,
  outputJson,
  submitAndWait,
  emitWalletPrompt,
} from './lib/shared.js';

function resolveStorage(args: Record<string, string>): 'ipfs' | 'http' | 'onchain' {
  const storage = args['storage'] || (args['http-uri'] ? 'http' : 'ipfs');
  if (storage !== 'ipfs' && storage !== 'http' && storage !== 'onchain') {
    exitWithError(`Invalid --storage "${storage}". Must be one of: ipfs, http, onchain.`);
  }
  return storage;
}

async function main() {
  const args = parseArgs();

  const chainId = requireChainId(args['chain-id']);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');
  const name = requireArg(args, 'name', 'agent name');
  const description = requireArg(args, 'description', 'agent description');
  const storage = resolveStorage(args);
  const ipfsConfig = extractIpfsConfig(args);
  if (storage === 'ipfs') validateIpfsEnv(ipfsConfig);
  const mcpEndpoint = args['mcp-endpoint'];
  const a2aEndpoint = args['a2a-endpoint'];
  const active = args['active'] !== 'false';
  const image = args['image'];
  const httpUri = args['http-uri'];
  const skills = args['skills'];
  const domains = args['domains'];
  const validateOasf = args['validate-oasf'] !== 'false';
  const x402 = args['x402'] === 'true';

  const walletProvider = await loadWalletProvider(chainId);

  const sdk = createSdk({
    chainId,
    rpcUrl,
    walletProvider,
    ipfs: storage === 'ipfs' ? ipfsConfig : undefined,
  });

  const agent = sdk.createAgent(name, description, image);

  if (mcpEndpoint) await agent.setMCP(mcpEndpoint);
  if (a2aEndpoint) await agent.setA2A(a2aEndpoint);
  agent.setActive(active);
  agent.setTrust(true);
  if (x402) agent.setX402Support(true);

  if (skills) {
    for (const slug of splitCsv(skills)) agent.addSkill(slug, validateOasf);
  }
  if (domains) {
    for (const slug of splitCsv(domains)) agent.addDomain(slug, validateOasf);
  }

  emitWalletPrompt();

  const handle =
    storage === 'onchain'
      ? await agent.registerOnChain()
      : storage === 'http'
        ? await agent.registerHTTP(requireArg(args, 'http-uri', 'HTTP/data URI for --storage http'))
        : ipfsConfig.ipfsProvider
          ? await agent.registerIPFS()
          : exitWithError('An IPFS provider is required when using --storage ipfs');

  const { result: regFile, txHash } = await submitAndWait<RegistrationFile>(handle);

  outputJson({
    agentId: regFile.agentId,
    txHash,
    uri: storage === 'http' ? httpUri : regFile.agentURI,
    chain: chainId,
    storage,
  });
}

main().catch(handleError);
