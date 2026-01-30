#!/usr/bin/env npx tsx
/**
 * Environment preflight check.
 * Derives wallet address from PRIVATE_KEY and reports which env vars are set.
 *
 * Usage:
 *   npx tsx check-env.ts
 */

import { privateKeyToAddress } from 'viem/accounts';
import { handleError } from './lib/shared.js';

function deriveAddress(key: string): { signerAddress: string | null; privateKeyError: string | null } {
  try {
    return { signerAddress: privateKeyToAddress(key as `0x${string}`), privateKeyError: null };
  } catch (err) {
    return { signerAddress: null, privateKeyError: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const { signerAddress, privateKeyError } = privateKey
    ? deriveAddress(privateKey)
    : { signerAddress: null, privateKeyError: null };

  console.log(JSON.stringify({
    signerAddress,
    privateKeyError,
    envVars: {
      PRIVATE_KEY: !!privateKey,
      PINATA_JWT: !!process.env.PINATA_JWT,
      FILECOIN_PRIVATE_KEY: !!process.env.FILECOIN_PRIVATE_KEY,
      WALLET_PRIVATE_KEY: !!process.env.WALLET_PRIVATE_KEY,
      IPFS_NODE_URL: !!process.env.IPFS_NODE_URL,
      SEARCH_API_URL: !!process.env.SEARCH_API_URL,
      SUBGRAPH_URL: !!process.env.SUBGRAPH_URL,
      REGISTRY_ADDRESS_IDENTITY: !!process.env.REGISTRY_ADDRESS_IDENTITY,
      REGISTRY_ADDRESS_REPUTATION: !!process.env.REGISTRY_ADDRESS_REPUTATION,
    },
  }, null, 2));
}

main().catch(handleError);
