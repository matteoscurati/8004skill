#!/usr/bin/env npx tsx
/**
 * Agent identity verification: sign messages and verify signatures
 * against ERC-8004 registered wallets.
 * Signing is done via WalletConnect (user's wallet app).
 *
 * Usage:
 *   # Sign (prove identity) — requires WalletConnect session
 *   npx tsx verify.ts --action sign --agent-id 11155111:42 \
 *     --chain-id 11155111 --rpc-url https://rpc.sepolia.org [--message "custom message"]
 *
 *   # Verify (check identity) — read-only
 *   npx tsx verify.ts --action verify --agent-id 11155111:42 \
 *     --chain-id 11155111 --rpc-url https://rpc.sepolia.org \
 *     --signature 0x... --message "erc8004:verify:11155111:42:a1b2c3d4:1706000000"
 */

import { randomBytes } from 'node:crypto';
import { verifyMessage } from 'viem';
import { SDK } from 'agent0-sdk';
import {
  parseArgs,
  requireArg,
  parseChainId,
  requireChainId,
  validateAgentId,
  validateSignature,
  buildSdkConfig,
  getOverridesFromEnv,
  exitWithError,
  loadWalletProvider,
  handleError,
  outputJson,
  tryCatch,
  emitWalletPrompt,
} from './lib/shared.js';
import { getConnectedAddress } from './lib/walletconnect.js';

// ── Structured challenge format ─────────────────────────────────────

function buildChallenge(agentId: string): string {
  const nonce = randomBytes(4).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  return `erc8004:verify:${agentId}:${nonce}:${timestamp}`;
}

const CHALLENGE_RE = /^erc8004:verify:(\d+:\d+):([0-9a-f]{8}):(\d+)$/;

interface Challenge {
  agentId: string;
  nonce: string;
  timestamp: number;
}

function parseChallenge(msg: string): Challenge | null {
  const m = CHALLENGE_RE.exec(msg);
  if (!m) return null;
  return { agentId: m[1], nonce: m[2], timestamp: Number(m[3]) };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  const action = requireArg(args, 'action', 'sign|verify');
  const agentId = requireArg(args, 'agent-id', 'agent');
  validateAgentId(agentId);
  const rpcUrl = requireArg(args, 'rpc-url', 'RPC endpoint');

  if (action === 'sign') {
    const chainId = requireChainId(args['chain-id']);
    const walletProvider = await loadWalletProvider(chainId);
    const signerAddress = getConnectedAddress(walletProvider);

    const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, walletProvider, ...getOverridesFromEnv(chainId) }));
    const agent = await sdk.loadAgent(agentId);
    const onChainWallet = await agent.getWallet();

    const message = args['message'] || buildChallenge(agentId);

    emitWalletPrompt('signature');

    // Sign via WalletConnect (personal_sign)
    const signature = await walletProvider.request<string>({
      method: 'personal_sign',
      params: [`0x${Buffer.from(message).toString('hex')}`, signerAddress],
    });

    outputJson({
      action: 'sign',
      agentId,
      message,
      signature,
      signerAddress,
      onChainWallet: onChainWallet || null,
      walletMatch: onChainWallet ? signerAddress.toLowerCase() === onChainWallet.toLowerCase() : false,
    });
  } else if (action === 'verify') {
    const chainId = parseChainId(args['chain-id']);
    const signature = requireArg(args, 'signature', 'signature to verify');
    validateSignature(signature);
    const message = requireArg(args, 'message', 'signed message');

    const sdk = new SDK(buildSdkConfig({ chainId, rpcUrl, ...getOverridesFromEnv(chainId) }));
    const agent = await sdk.loadAgent(agentId);
    const onChainWallet = await agent.getWallet();

    if (!onChainWallet) {
      exitWithError(`Agent ${agentId} has no wallet registered on-chain. Cannot verify identity.`);
    }

    const verified = await verifyMessage({
      address: onChainWallet as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    const regFile = await agent.getRegistrationFile();
    const active = regFile?.active ?? false;

    const warnings: string[] = [];
    if (!active) warnings.push('agent_inactive');

    const challenge = parseChallenge(message);
    if (challenge) {
      if (challenge.agentId !== agentId) warnings.push('agent_id_mismatch');
      const age = Math.floor(Date.now() / 1000) - challenge.timestamp;
      if (age > 300) warnings.push('timestamp_expired');
    }

    // Reputation lookup is non-fatal
    const repResult = await tryCatch(() => sdk.getReputationSummary(agentId));
    const reputation = repResult.value
      ? { count: repResult.value.count, averageValue: repResult.value.averageValue }
      : null;
    if (repResult.error) warnings.push('reputation_unavailable');

    outputJson({
      action: 'verify',
      agentId,
      verified,
      message,
      onChainWallet,
      active,
      reputation,
      warnings,
    });
  } else {
    exitWithError(`Unknown action: ${action}. Use sign or verify.`);
  }
}

main().catch(handleError);
