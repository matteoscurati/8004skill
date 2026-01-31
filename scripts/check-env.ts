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
import {
  keystoreExists,
  loadKeystoreFile,
  listEntries,
  findEntry,
  decryptKey,
  getKeystorePath,
  type KeystoreFile,
} from './lib/keystore.js';

interface SignerResult {
  signerAddress: string | null;
  privateKeyError: string | null;
}

const NO_SIGNER: SignerResult = { signerAddress: null, privateKeyError: null };

function deriveAddress(key: string): SignerResult {
  try {
    return { signerAddress: privateKeyToAddress(key as `0x${string}`), privateKeyError: null };
  } catch (err) {
    return { signerAddress: null, privateKeyError: err instanceof Error ? err.message : String(err) };
  }
}

function resolveSignerFromKeystore(ksFile: KeystoreFile): SignerResult {
  const password = process.env.KEYSTORE_PASSWORD;
  if (!password) return NO_SIGNER;

  const label = process.env.KEYSTORE_LABEL || 'default';
  const entry = findEntry(ksFile, label);
  if (!entry) return NO_SIGNER;

  try {
    return deriveAddress(decryptKey(entry, password));
  } catch {
    return { signerAddress: null, privateKeyError: `Keystore decryption failed for entry "${label}"` };
  }
}

function main(): void {
  const privateKey = process.env.PRIVATE_KEY;
  let signer: SignerResult = privateKey ? deriveAddress(privateKey) : NO_SIGNER;

  const ksExists = keystoreExists();
  let entries: Array<{ label: string; address: string }> = [];
  let keystoreError: string | null = null;

  if (ksExists) {
    try {
      const ksFile = loadKeystoreFile();
      entries = listEntries(ksFile).map(({ label, address }) => ({ label, address }));

      if (!privateKey) {
        signer = resolveSignerFromKeystore(ksFile);
      }
    } catch (err) {
      keystoreError = err instanceof Error ? err.message : String(err);
    }
  }

  console.log(JSON.stringify({
    signerAddress: signer.signerAddress,
    privateKeyError: signer.privateKeyError,
    keystore: {
      exists: ksExists,
      path: getKeystorePath(),
      entryCount: entries.length,
      entries,
      ...(keystoreError && { error: keystoreError }),
    },
    envVars: {
      PRIVATE_KEY: !!privateKey,
      KEYSTORE_PASSWORD: !!process.env.KEYSTORE_PASSWORD,
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

try {
  main();
} catch (err) {
  handleError(err);
}
