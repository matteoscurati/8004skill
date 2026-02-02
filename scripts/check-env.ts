#!/usr/bin/env npx tsx
/**
 * Environment preflight check.
 * Derives wallet address from PRIVATE_KEY and reports which env vars are set.
 *
 * Usage:
 *   npx tsx check-env.ts
 */

import { existsSync, realpathSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { privateKeyToAddress } from 'viem/accounts';
import { handleError, SCRIPT_VERSION, validateConfig } from './lib/shared.js';
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

// ── Security warnings ──────────────────────────────────────────────

function detectOpenClaw(): string | null {
  const openclawDir = join(homedir(), '.openclaw');
  const hasDir = existsSync(openclawDir);
  const hasEnv = !!process.env.OPENCLAW_HOME || !!process.env.OPENCLAW_SESSION;
  if (hasDir || hasEnv) {
    return (
      'OpenClaw environment detected. Command strings in ProcessSession and exec approvals may ' +
      'capture secrets in plaintext. Recommendations: ' +
      '(1) Configure secrets via OpenClaw skill config "env" field rather than inline commands. ' +
      '(2) Never type secrets directly in the chat. ' +
      '(3) Verify that "logging.redactSensitive" is not set to "off" in openclaw.json.'
    );
  }
  return null;
}

function detectCloudSync(): string | null {
  const keystorePath = getKeystorePath();
  if (!existsSync(keystorePath)) return null;

  let resolvedPath: string;
  try {
    resolvedPath = realpathSync(keystorePath);
  } catch {
    return null;
  }

  const home = homedir();
  const cloudPrefixes = [
    join(home, 'Library', 'Mobile Documents'),  // iCloud
    join(home, 'Library', 'CloudStorage'),       // iCloud alt
    join(home, 'Dropbox'),
    join(home, 'Google Drive'),
    join(home, 'OneDrive'),
  ];

  const isCloudSynced = cloudPrefixes.some((prefix) => resolvedPath.startsWith(prefix));
  if (!isCloudSynced) return null;

  return (
    `Keystore path (${resolvedPath}) appears to be inside a cloud-synced directory. ` +
    'The encrypted keystore may be replicated to cloud storage. ' +
    'Consider moving ~/.8004skill outside of synced directories.'
  );
}

function checkConfigFile(): string[] {
  const configPath = join(homedir(), '.8004skill', 'config.json');
  const warnings: string[] = [];

  if (!existsSync(configPath)) return warnings;

  try {
    const st = statSync(configPath);
    const uid = process.getuid?.();

    if (uid !== undefined && st.uid !== uid) {
      warnings.push(
        `Config file ${configPath} is not owned by current user (file uid: ${st.uid}, current uid: ${uid}). ` +
          'A same-UID attacker may have substituted it.',
      );
    }

    const permBits = st.mode & 0o777;
    if (permBits & 0o077) {
      warnings.push(
        `Config file ${configPath} has permissions ${permBits.toString(8).padStart(3, '0')} (expected 600). ` +
          'Group or other users may be able to read it. Run: chmod 600 ' + configPath,
      );
    }
  } catch {
    // Can't stat — not critical, skip
  }

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    warnings.push(...validateConfig({ activeChain: raw.activeChain, rpcUrl: raw.rpcUrl }).map((w) => w.message));
  } catch {
    // Can't parse — not critical, skip
  }

  return warnings;
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

  const warnings = [
    detectOpenClaw(),
    detectCloudSync(),
    ...checkConfigFile(),
  ].filter((w): w is string => w !== null);

  console.log(JSON.stringify({
    version: SCRIPT_VERSION,
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
    ...(warnings.length > 0 && { warnings }),
  }, null, 2));
}

try {
  main();
} catch (err) {
  handleError(err);
}
