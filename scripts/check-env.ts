#!/usr/bin/env npx tsx
/**
 * Environment preflight check.
 * Reports WalletConnect session status and configured env vars.
 *
 * Usage:
 *   npx tsx check-env.ts
 */

import { existsSync, realpathSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { handleError, SCRIPT_VERSION, validateConfig, outputJson, DOT_ENV_PATH } from './lib/shared.js';
import { getSessionInfo, getWcStoragePath } from './lib/walletconnect.js';

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
  const wcStoragePath = getWcStoragePath();
  if (!existsSync(wcStoragePath)) return null;

  let resolvedPath: string;
  try {
    resolvedPath = realpathSync(wcStoragePath);
  } catch {
    return 'Could not resolve real path of WC storage file; cloud-sync detection skipped.';
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
    `WalletConnect storage path (${resolvedPath}) appears to be inside a cloud-synced directory. ` +
    'The WC session file may be replicated to cloud storage. ' +
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
    warnings.push(`Could not stat ${configPath}; permission checks skipped.`);
  }

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    warnings.push(...validateConfig({ activeChain: raw.activeChain, rpcUrl: raw.rpcUrl }).map((w) => w.message));
  } catch {
    warnings.push(`Could not parse ${configPath}; config validation skipped.`);
  }

  return warnings;
}

function main(): void {
  const wcSession = getSessionInfo();

  const warnings = [
    detectOpenClaw(),
    detectCloudSync(),
    ...checkConfigFile(),
  ].filter((w): w is string => w !== null);

  outputJson({
    version: SCRIPT_VERSION,
    walletConnect: {
      sessionActive: wcSession.sessionActive,
      connectedAddress: wcSession.connectedAddress,
      chainId: wcSession.chainId,
      storagePath: getWcStoragePath(),
    },
    dotenvFile: existsSync(DOT_ENV_PATH),
    envVars: {
      WC_PROJECT_ID: !!process.env.WC_PROJECT_ID,
      PINATA_JWT: !!process.env.PINATA_JWT,
      FILECOIN_PRIVATE_KEY: !!process.env.FILECOIN_PRIVATE_KEY,
      IPFS_NODE_URL: !!process.env.IPFS_NODE_URL,
      SEARCH_API_URL: !!process.env.SEARCH_API_URL,
      SUBGRAPH_URL: !!process.env.SUBGRAPH_URL,
      REGISTRY_ADDRESS_IDENTITY: !!process.env.REGISTRY_ADDRESS_IDENTITY,
      REGISTRY_ADDRESS_REPUTATION: !!process.env.REGISTRY_ADDRESS_REPUTATION,
    },
    ...(warnings.length > 0 && { warnings }),
  });
}

try {
  main();
} catch (err) {
  handleError(err);
}
