#!/usr/bin/env npx tsx
/**
 * WalletConnect pairing and session status.
 * Shows QR code if no active session, or reports current connection.
 *
 * Usage:
 *   npx tsx wc-pair.ts [--chain-id <chainId>]
 */

import { parseArgs, parseChainId, handleError, outputJson } from './lib/shared.js';
import { initWalletConnectProvider, getConnectedAddress } from './lib/walletconnect.js';

async function main() {
  const args = parseArgs();
  const chainId = parseChainId(args['chain-id'] || '11155111');

  const provider = await initWalletConnectProvider({ chainId });
  const address = getConnectedAddress(provider);

  outputJson({ address, chainId: provider.chainId, sessionActive: true });
}

main().catch(handleError);
