#!/usr/bin/env npx tsx
/**
 * Disconnect WalletConnect session.
 *
 * Usage:
 *   npx tsx wc-disconnect.ts
 */

import { handleError, outputJson } from './lib/shared.js';
import { disconnectSession } from './lib/walletconnect.js';

async function main() {
  await disconnectSession();

  outputJson({ action: 'disconnect', success: true });
}

main().catch(handleError);
