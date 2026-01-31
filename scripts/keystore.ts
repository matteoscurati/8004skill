#!/usr/bin/env npx tsx
/**
 * Manage the encrypted keystore for private key security.
 * Interactive CLI — run directly by the user, not by Claude.
 *
 * Usage:
 *   npx tsx keystore.ts --action import [--label <name>]
 *   npx tsx keystore.ts --action export --label <name>
 *   npx tsx keystore.ts --action list
 *   npx tsx keystore.ts --action delete --label <name>
 *   npx tsx keystore.ts --action verify --label <name>
 */

import { createInterface } from 'node:readline/promises';
import { stdin, stderr } from 'node:process';
import { privateKeyToAddress } from 'viem/accounts';
import { parseArgs, requireArg, handleError, exitWithError } from './lib/shared.js';
import {
  keystoreExists,
  loadKeystoreFile,
  saveKeystoreFile,
  encryptKey,
  decryptKey,
  findEntry,
  listEntries,
  getKeystorePath,
  type KeystoreFile,
  type KeystoreEntry,
} from './lib/keystore.js';

async function readHidden(prompt: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stderr });
  if (stdin.isTTY) stdin.setRawMode(true);
  stderr.write(prompt);

  let value = '';

  function cleanup(): void {
    if (stdin.isTTY) stdin.setRawMode(false);
    rl.close();
  }

  return new Promise((resolve) => {
    stdin.on('data', function onData(chunk: Buffer) {
      for (const byte of chunk) {
        if (byte === 3) {
          stdin.removeListener('data', onData);
          cleanup();
          process.exit(130);
        }
        if (byte === 13 || byte === 10) {
          stderr.write('\n');
          stdin.removeListener('data', onData);
          cleanup();
          resolve(value);
          return;
        }
        if (byte === 127 || byte === 8) {
          value = value.slice(0, -1);
        } else {
          value += String.fromCharCode(byte);
        }
      }
    });
  });
}

async function readLine(prompt: string): Promise<string> {
  const rl = createInterface({ input: stdin, output: stderr });
  const answer = await rl.question(prompt);
  rl.close();
  return answer;
}

function getOrCreateKeystore(): KeystoreFile {
  if (keystoreExists()) return loadKeystoreFile();
  return { version: 1, entries: [] };
}

function requireKeystoreEntry(label: string): { ks: KeystoreFile; entry: KeystoreEntry } {
  if (!keystoreExists()) exitWithError('No keystore found.');
  const ks = loadKeystoreFile();
  const entry = findEntry(ks, label);
  if (!entry) exitWithError(`No entry with label "${label}".`);
  return { ks, entry };
}

async function actionImport(label: string): Promise<void> {
  const ks = getOrCreateKeystore();

  if (findEntry(ks, label)) {
    exitWithError(`Entry "${label}" already exists. Delete it first or choose a different label.`);
  }

  const privateKey = await readHidden('Enter private key (0x-prefixed hex): ');
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    exitWithError('Invalid private key format. Must be 0x-prefixed 64 hex characters.');
  }

  let address: string;
  try {
    address = privateKeyToAddress(privateKey as `0x${string}`);
  } catch {
    exitWithError('Failed to derive address from private key.');
  }

  const password = await readHidden('Enter encryption password: ');
  if (password.length < 12) {
    exitWithError('Password must be at least 12 characters.');
  }

  const confirm = await readHidden('Confirm encryption password: ');
  if (password !== confirm) {
    exitWithError('Passwords do not match.');
  }

  stderr.write('Encrypting (this may take a moment)...\n');
  const encrypted = encryptKey(privateKey, password);

  ks.entries.push({
    ...encrypted,
    label,
    address,
    createdAt: new Date().toISOString(),
  });

  saveKeystoreFile(ks);

  console.log(
    JSON.stringify(
      {
        action: 'import',
        label,
        address,
        path: getKeystorePath(),
      },
      null,
      2,
    ),
  );
}

async function actionExport(label: string): Promise<void> {
  const { entry } = requireKeystoreEntry(label);

  stderr.write('WARNING: This will display your private key in plaintext.\n');
  const confirm = await readLine('Type "yes" to continue: ');
  if (confirm.trim().toLowerCase() !== 'yes') {
    exitWithError('Export cancelled.');
  }

  const password = await readHidden('Enter decryption password: ');
  let privateKey: string;
  try {
    privateKey = decryptKey(entry, password);
  } catch {
    exitWithError('Decryption failed. Wrong password or corrupted entry.');
  }

  console.log(
    JSON.stringify(
      {
        action: 'export',
        label,
        address: entry.address,
        privateKey,
      },
      null,
      2,
    ),
  );
}

function actionList(): void {
  const entries = keystoreExists() ? listEntries(loadKeystoreFile()) : [];
  console.log(JSON.stringify({ action: 'list', entries, path: getKeystorePath() }, null, 2));
}

async function actionDelete(label: string): Promise<void> {
  const { ks, entry } = requireKeystoreEntry(label);
  const idx = ks.entries.indexOf(entry);

  stderr.write(`About to delete entry "${label}" (address: ${entry.address}).\n`);
  const confirm = await readLine('Type "yes" to confirm deletion: ');
  if (confirm.trim().toLowerCase() !== 'yes') {
    exitWithError('Delete cancelled.');
  }

  ks.entries.splice(idx, 1);
  saveKeystoreFile(ks);

  console.log(JSON.stringify({ action: 'delete', label, remaining: ks.entries.length }, null, 2));
}

async function actionVerify(label: string): Promise<void> {
  const { entry } = requireKeystoreEntry(label);

  const password = await readHidden('Enter decryption password: ');
  let privateKey: string;
  try {
    privateKey = decryptKey(entry, password);
  } catch {
    exitWithError('Decryption failed. Wrong password or corrupted entry.');
  }

  let derivedAddress: string;
  try {
    derivedAddress = privateKeyToAddress(privateKey as `0x${string}`);
  } catch {
    exitWithError('Decrypted key is not a valid private key.');
  }

  const match = derivedAddress.toLowerCase() === entry.address.toLowerCase();

  console.log(
    JSON.stringify(
      {
        action: 'verify',
        label,
        storedAddress: entry.address,
        derivedAddress,
        match,
      },
      null,
      2,
    ),
  );
}

async function main(): Promise<void> {
  const args = parseArgs();
  const action = requireArg(args, 'action', 'import|export|list|delete|verify');

  switch (action) {
    case 'import':
      await actionImport(args['label'] || 'default');
      break;
    case 'export':
      await actionExport(requireArg(args, 'label', 'entry label'));
      break;
    case 'list':
      actionList();
      break;
    case 'delete':
      await actionDelete(requireArg(args, 'label', 'entry label'));
      break;
    case 'verify':
      await actionVerify(requireArg(args, 'label', 'entry label'));
      break;
    default:
      exitWithError(`Unknown action: ${action}. Use import, export, list, delete, or verify.`);
  }
}

main().catch(handleError);
