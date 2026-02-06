import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { SDKConfig, TransactionHandle, TransactionWaitOptions } from 'agent0-sdk';
import type EthereumProvider from '@walletconnect/ethereum-provider';
import { isAddress } from 'viem';
import { initWalletConnectProvider, getConnectedAddress } from './walletconnect.js';

// ── Dotenv loader ───────────────────────────────────────────────────

export const DOT_ENV_PATH = join(homedir(), '.8004skill', '.env');

function stripQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    if ((first === '"' || first === "'") && value[value.length - 1] === first) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function loadDotenv(): void {
  let content: string;
  try {
    content = readFileSync(DOT_ENV_PATH, 'utf-8');
  } catch {
    return; // file missing or unreadable — silently skip
  }
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = stripQuotes(trimmed.slice(eqIndex + 1).trim());
    // shell env takes precedence
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotenv();

// ── Script version ──────────────────────────────────────────────────

export const SCRIPT_VERSION = '2.0.0';

// ── CLI argument parsing ────────────────────────────────────────────

export function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
      args[key] = value;
      if (value !== 'true') i++;
    }
  }
  return args;
}

export function requireArg(args: Record<string, string>, key: string, label: string): string {
  const val = args[key];
  if (!val) exitWithError(`--${key} is required (${label})`);
  return val;
}

// ── Validation helpers ──────────────────────────────────────────────

export function parseChainId(raw: string | undefined): number {
  const val = parseInt(raw ?? '', 10);
  if (Number.isNaN(val) || val < 1) exitWithError(`Invalid chain-id: "${raw}". Must be a positive integer.`);
  return val;
}

export function requireChainId(raw: string | undefined): number {
  if (raw === undefined) {
    exitWithError(
      '--chain-id is required. ' +
        'Specify the target chain explicitly (e.g. --chain-id 11155111 for Sepolia).',
    );
  }
  return parseChainId(raw);
}

export function parseDecimalInRange(raw: string, name: string, min: number, max: number): number {
  const val = parseFloat(raw);
  if (Number.isNaN(val)) {
    exitWithError(`Invalid --${name}: "${raw}". Must be a number (decimals allowed, e.g. 85, 99.77, -3.2).`);
  }
  if (val < min || val > max) {
    exitWithError(`--${name} must be between ${min} and ${max}`);
  }
  return val;
}

/**
 * Split a comma-separated string into trimmed, non-empty values.
 */
export function splitCsv(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export function validateAgentId(id: string): void {
  if (!/^\d+:\d+$/.test(id))
    exitWithError(`Invalid agent-id "${id}". Expected format: chainId:tokenId (e.g. 11155111:42)`);
}

export function validateAddress(addr: string, name: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr))
    exitWithError(`Invalid ${name}: "${addr}". Must be a 0x-prefixed 40-hex-char address.`);
  if (!isAddress(addr, { strict: true })) {
    console.error(JSON.stringify({
      status: 'warning',
      message: `${name} "${addr}" has an invalid EIP-55 checksum. Use all-lowercase or correct mixed-case.`
    }));
  }
}

export function validateSignature(sig: string): void {
  if (!/^0x[0-9a-fA-F]{130,}$/.test(sig))
    exitWithError(`Invalid signature: "${sig}". Must be a 0x-prefixed hex string (at least 65 bytes).`);
}

const VALID_IPFS = ['pinata', 'filecoinPin', 'node'] as const;
export type IpfsProvider = (typeof VALID_IPFS)[number];

export function validateIpfsProvider(raw: string): IpfsProvider {
  if (!VALID_IPFS.includes(raw as IpfsProvider))
    exitWithError(`Invalid --ipfs "${raw}". Must be: ${VALID_IPFS.join(', ')}`);
  return raw as IpfsProvider;
}

// ── Fetch with retry ────────────────────────────────────────────────

const RETRY_MAX = 3;
const RETRY_BASE_MS = 1_000;

export async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let lastError: unknown;
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    if (attempt > 0) {
      await sleep(retryDelay(lastResponse, attempt - 1));
    }

    try {
      lastResponse = await fetch(url, options);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
      lastError = err;
      continue;
    }

    const isRetryable = lastResponse.status === 429 || lastResponse.status >= 500;
    if (!isRetryable) return lastResponse;
  }

  if (lastResponse) return lastResponse;
  throw lastError;
}

function retryDelay(response: Response | undefined, retryIndex: number): number {
  const retryAfter = response?.headers.get('retry-after');
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    return Math.min(Number.isNaN(seconds) ? RETRY_BASE_MS : seconds * 1000, 30_000);
  }
  return RETRY_BASE_MS * 2 ** retryIndex;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── SDK config builder ──────────────────────────────────────────────

export function buildSdkConfig(opts: {
  chainId: number;
  rpcUrl: string;
  walletProvider?: EthereumProvider;
  ipfsProvider?: string;
  pinataJwt?: string;
  filecoinPrivateKey?: string;
  ipfsNodeUrl?: string;
  subgraphUrl?: string;
  registryOverrides?: Record<number, Record<string, string>>;
}): SDKConfig {
  const config: SDKConfig = { chainId: opts.chainId, rpcUrl: opts.rpcUrl };
  if (opts.walletProvider) config.walletProvider = opts.walletProvider;
  if (opts.subgraphUrl) config.subgraphUrl = opts.subgraphUrl;
  if (opts.registryOverrides) config.registryOverrides = opts.registryOverrides;

  if (opts.ipfsProvider) {
    const provider = validateIpfsProvider(opts.ipfsProvider);
    config.ipfs = provider;

    switch (provider) {
      case 'pinata':
        if (!opts.pinataJwt) exitWithError('PINATA_JWT env var required when using --ipfs pinata');
        config.pinataJwt = opts.pinataJwt;
        break;
      case 'filecoinPin':
        if (!opts.filecoinPrivateKey)
          exitWithError('FILECOIN_PRIVATE_KEY env var required when using --ipfs filecoinPin');
        config.filecoinPrivateKey = opts.filecoinPrivateKey;
        break;
      case 'node':
        if (!opts.ipfsNodeUrl) exitWithError('--ipfs-node-url or IPFS_NODE_URL env var required when using --ipfs node');
        config.ipfsNodeUrl = opts.ipfsNodeUrl;
        break;
    }
  }

  return config;
}

// ── WalletConnect provider loader ───────────────────────────────────

export async function loadWalletProvider(chainId: number): Promise<EthereumProvider> {
  const provider = await initWalletConnectProvider({ chainId });
  const address = getConnectedAddress(provider);
  console.error(JSON.stringify({ status: 'wallet_connected', address, chainId: provider.chainId }));
  return provider;
}

// ── Environment overrides for non-default chains ────────────────────

export function getOverridesFromEnv(chainId: number): {
  subgraphUrl?: string;
  registryOverrides?: Record<number, Record<string, string>>;
} {
  const result: {
    subgraphUrl?: string;
    registryOverrides?: Record<number, Record<string, string>>;
  } = {};

  const subgraphUrl = process.env.SUBGRAPH_URL;
  if (subgraphUrl) result.subgraphUrl = subgraphUrl;

  const overrideEntries: Array<[string, string]> = [
    ['IDENTITY', process.env.REGISTRY_ADDRESS_IDENTITY],
    ['REPUTATION', process.env.REGISTRY_ADDRESS_REPUTATION],
  ].filter((pair): pair is [string, string] => !!pair[1]);

  for (const [name, addr] of overrideEntries) {
    validateAddress(addr, `REGISTRY_ADDRESS_${name}`);
  }
  if (overrideEntries.length > 0) {
    result.registryOverrides = { [chainId]: Object.fromEntries(overrideEntries) };
  }

  return result;
}

// ── Config validation ────────────────────────────────────────────────

/**
 * Known public RPC endpoints per chain ID (from reference/chains.md).
 * Used to warn when the configured RPC doesn't match any known default.
 */
const KNOWN_RPC_URLS: Record<number, string[]> = {
  1: ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth'],
  137: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'],
  8453: ['https://mainnet.base.org', 'https://base-rpc.publicnode.com'],
  56: ['https://bsc-dataseed.binance.org', 'https://rpc.ankr.com/bsc'],
  143: ['https://rpc.monad.xyz'],
  534352: ['https://rpc.scroll.io', 'https://scroll-rpc.publicnode.com'],
  100: ['https://rpc.gnosischain.com', 'https://rpc.ankr.com/gnosis'],
  11155111: ['https://rpc.sepolia.org', 'https://ethereum-sepolia-rpc.publicnode.com'],
  84532: ['https://sepolia.base.org'],
  97: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
  10143: ['https://testnet.rpc.monad.xyz'],
  534351: ['https://sepolia-rpc.scroll.io'],
  42161: ['https://arb1.arbitrum.io/rpc'],
  421614: ['https://sepolia-rollup.arbitrum.io/rpc'],
  42220: ['https://forno.celo.org'],
  44787: ['https://alfajores-forno.celo-testnet.org'],
  167000: ['https://rpc.mainnet.taiko.xyz'],
  80002: ['https://rpc-amoy.polygon.technology'],
};

interface ConfigWarning {
  field: string;
  message: string;
}

/**
 * Validate a loaded config object and return warnings (non-blocking).
 */
export function validateConfig(config: { activeChain?: number; rpcUrl?: string }): ConfigWarning[] {
  const warnings: ConfigWarning[] = [];

  if (config.rpcUrl) {
    if (config.rpcUrl.startsWith('http://')) {
      warnings.push({
        field: 'rpcUrl',
        message: `RPC URL uses unencrypted HTTP (${config.rpcUrl}). Signed transactions may be intercepted. Use HTTPS.`,
      });
    }

    if (config.activeChain !== undefined) {
      const knownUrls = KNOWN_RPC_URLS[config.activeChain];
      if (knownUrls && !knownUrls.includes(config.rpcUrl)) {
        warnings.push({
          field: 'rpcUrl',
          message: `RPC URL (${config.rpcUrl}) does not match known public endpoints for chain ${config.activeChain}. ` +
            `Known: ${knownUrls.join(', ')}. If this is a custom or private RPC, this warning can be ignored.`,
        });
      }
    }
  }

  return warnings;
}

// ── Error handling ──────────────────────────────────────────────────

export function exitWithError(message: string, details?: string): never {
  const err: Record<string, string> = { error: message };
  if (details) err.details = details;
  console.error(JSON.stringify(err));
  process.exit(1);
}

export function handleError(err: unknown): never {
  if (err instanceof Error) {
    exitWithError(err.message, process.env.DEBUG ? err.stack : undefined);
  }
  exitWithError(String(err));
}

// ── Output helpers ──────────────────────────────────────────────────

export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function emitWalletPrompt(action: 'transaction' | 'signature' = 'transaction'): void {
  const msg = action === 'signature'
    ? 'Check your wallet to sign the message...'
    : 'Check your wallet to approve the transaction...';
  console.error(JSON.stringify({ status: 'awaiting_wallet', message: msg }));
}

interface AgentLike {
  agentId?: string;
  name: string;
  description: string;
  image?: string;
  mcpEndpoint?: string;
  a2aEndpoint?: string;
  ensEndpoint?: string;
  webEndpoint?: string;
  emailEndpoint?: string;
  mcpTools?: unknown[];
  mcpPrompts?: unknown[];
  mcpResources?: unknown[];
  a2aSkills?: unknown[];
  oasfSkills?: unknown[];
  oasfDomains?: unknown[];
  walletAddress?: string;
}

interface RegFileLike {
  active: boolean;
  trustModels?: unknown;
  owners?: unknown;
  endpoints?: unknown;
}

export function buildAgentDetails(
  agent: AgentLike,
  regFile: RegFileLike,
  extras?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    agentId: agent.agentId,
    name: agent.name,
    description: agent.description,
    image: agent.image,
    active: regFile.active,
    mcpEndpoint: agent.mcpEndpoint,
    a2aEndpoint: agent.a2aEndpoint,
    ensName: agent.ensEndpoint,
    webEndpoint: agent.webEndpoint,
    emailEndpoint: agent.emailEndpoint,
    mcpTools: agent.mcpTools ?? [],
    mcpPrompts: agent.mcpPrompts ?? [],
    mcpResources: agent.mcpResources ?? [],
    a2aSkills: agent.a2aSkills ?? [],
    oasfSkills: agent.oasfSkills ?? [],
    oasfDomains: agent.oasfDomains ?? [],
    trustModels: regFile.trustModels,
    owners: regFile.owners,
    endpoints: regFile.endpoints,
    ...extras,
  };
}

export async function tryCatch<T>(fn: () => Promise<T>): Promise<{ value?: T; error?: string }> {
  try {
    return { value: await fn() };
  } catch (err) {
    if (process.env.DEBUG && err instanceof Error && err.stack) {
      console.error(JSON.stringify({ status: 'debug', error: err.message, stack: err.stack }));
    }
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export interface IpfsConfig {
  ipfsProvider?: string;
  pinataJwt?: string;
  filecoinPrivateKey?: string;
  ipfsNodeUrl?: string;
}

export function extractIpfsConfig(args: Record<string, string>): IpfsConfig {
  return {
    ipfsProvider: args['ipfs'],
    pinataJwt: process.env.PINATA_JWT,
    filecoinPrivateKey: process.env.FILECOIN_PRIVATE_KEY,
    ipfsNodeUrl: args['ipfs-node-url'] || process.env.IPFS_NODE_URL,
  };
}

/**
 * Validate that the required env var for the chosen IPFS provider is set.
 * Call this **before** `loadWalletProvider()` so the user doesn't waste
 * a wallet approval only to fail on a missing env var afterwards.
 */
export function validateIpfsEnv(config: IpfsConfig): void {
  if (!config.ipfsProvider) return;
  const provider = validateIpfsProvider(config.ipfsProvider);
  switch (provider) {
    case 'pinata':
      if (!config.pinataJwt) exitWithError('PINATA_JWT env var required when using --ipfs pinata');
      break;
    case 'filecoinPin':
      if (!config.filecoinPrivateKey) exitWithError('FILECOIN_PRIVATE_KEY env var required when using --ipfs filecoinPin');
      break;
    case 'node':
      if (!config.ipfsNodeUrl) exitWithError('--ipfs-node-url or IPFS_NODE_URL env var required when using --ipfs node');
      break;
  }
}

export async function submitAndWait<T>(
  handle: TransactionHandle<T>,
  opts?: TransactionWaitOptions,
): Promise<{ result: T; txHash: string }> {
  const txHash = handle.hash;
  console.error(JSON.stringify({ status: 'submitted', txHash }));
  const { result } = await handle.waitMined(opts ?? { timeoutMs: 120_000 });
  return { result, txHash };
}
