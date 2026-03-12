import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, basename } from 'node:path';
import { SDK, EndpointType } from 'agent0-sdk';
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

export function formatPermissions(mode: number): string {
  return (mode & 0o777).toString(8).padStart(3, '0');
}

function warnIfWorldReadable(filePath: string): void {
  try {
    const st = statSync(filePath);
    if ((st.mode & 0o077) !== 0) {
      console.error(JSON.stringify({
        status: 'warning',
        message: `.env file ${filePath} has permissions ${formatPermissions(st.mode)} ` +
          '(expected 600). Other users may be able to read IPFS secrets. Run: chmod 600 ' + filePath,
      }));
    }
  } catch {
    // statSync failed — skip permission check
  }
}

function loadDotenv(): void {
  let content: string;
  try {
    content = readFileSync(DOT_ENV_PATH, 'utf-8');
  } catch {
    return; // file missing or unreadable — silently skip
  }

  warnIfWorldReadable(DOT_ENV_PATH);

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

// ── Main-script guard ───────────────────────────────────────────────

/**
 * Return true when the current process was launched as `scriptPath`
 * (i.e. the file is run directly, not imported for testing).
 *
 * Usage: `if (isMainScript(import.meta.url)) main().catch(handleError);`
 */
export function isMainScript(importMetaUrl: string): boolean {
  const scriptPath = process.argv[1];
  if (!scriptPath) return false;
  const stripExt = (p: string): string => basename(p).replace(/\.[tj]s$/, '');
  return stripExt(scriptPath) === stripExt(new URL(importMetaUrl).pathname);
}

// ── Script version ──────────────────────────────────────────────────

export const SCRIPT_VERSION = '2.1.0';

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
  const val = Number(raw ?? '');
  if (!Number.isInteger(val) || val < 1) exitWithError(`Invalid chain-id: "${raw}". Must be a positive integer.`);
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

const VALID_IPFS = ['pinata', 'filecoinPin', 'node', 'helia'] as const;
export type IpfsProvider = (typeof VALID_IPFS)[number];

export function validateIpfsProvider(raw: string): IpfsProvider {
  if (!VALID_IPFS.includes(raw as IpfsProvider))
    exitWithError(`Invalid --ipfs "${raw}". Must be: ${VALID_IPFS.join(', ')}`);
  return raw as IpfsProvider;
}

export function parseEndpointType(raw: string): EndpointType {
  const normalized = raw.trim().toLowerCase();
  switch (normalized) {
    case 'mcp':
      return EndpointType.MCP;
    case 'a2a':
      return EndpointType.A2A;
    case 'ens':
      return EndpointType.ENS;
    case 'did':
      return EndpointType.DID;
    case 'wallet':
    case 'agentwallet':
      return EndpointType.WALLET;
    case 'oasf':
      return EndpointType.OASF;
    default:
      exitWithError(
        `Invalid endpoint type "${raw}". Must be one of: mcp, a2a, ens, did, wallet, oasf.`,
      );
  }
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
      case 'helia':
        break;
    }
  }

  return config;
}

/**
 * Create an SDK instance with environment overrides applied automatically.
 */
export function createSdk(opts: {
  chainId: number;
  rpcUrl: string;
  walletProvider?: EthereumProvider;
  ipfs?: IpfsConfig;
}): SDK {
  const { ipfs, ...rest } = opts;
  return new SDK(buildSdkConfig({
    ...rest,
    ...ipfs,
    ...getOverridesFromEnv(opts.chainId),
  }));
}

// ── WalletConnect provider loader ───────────────────────────────────

export async function loadWalletProvider(chainId: number): Promise<EthereumProvider> {
  const provider = await initWalletConnectProvider({ chainId });
  const address = getConnectedAddress(provider);
  console.error(JSON.stringify({ status: 'wallet_connected', address, chainId: provider.chainId }));
  return provider;
}

// ── Environment overrides for non-default chains ────────────────────

/** Env vars take precedence; empty because all supported chains have built-in SDK addresses. */
const REGISTRY_DEFAULTS: Record<number, Record<string, string>> = {};

interface EnvOverrides {
  subgraphUrl?: string;
  registryOverrides?: Record<number, Record<string, string>>;
}

export function getOverridesFromEnv(chainId: number): EnvOverrides {
  const result: EnvOverrides = {};

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
  } else if (chainId in REGISTRY_DEFAULTS) {
    result.registryOverrides = { [chainId]: REGISTRY_DEFAULTS[chainId] };
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
  11155111: ['https://rpc.sepolia.org', 'https://ethereum-sepolia-rpc.publicnode.com'],
  137: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon'],
  8453: ['https://mainnet.base.org', 'https://rpc.ankr.com/base'],
  84532: ['https://sepolia.base.org', 'https://rpc.ankr.com/base_sepolia'],
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

// ── Untrusted data sanitisation ─────────────────────────────────────

/** Strip control characters (U+0000-U+001F except \n and \t) and enforce a max-length limit. */
export function sanitizeString(
  raw: string,
  maxLength: number,
): { value: string; truncated: boolean } {
  const cleaned = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const truncated = cleaned.length > maxLength;
  return { value: truncated ? cleaned.slice(0, maxLength) : cleaned, truncated };
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
  x402support?: boolean;
  trustModels?: unknown;
  owners?: unknown;
  endpoints?: unknown;
}

export function buildAgentDetails(
  agent: AgentLike,
  regFile: RegFileLike,
  extras?: Record<string, unknown>,
): Record<string, unknown> {
  const sName = sanitizeString(agent.name, 500);
  const sDesc = sanitizeString(agent.description, 2000);

  // The SDK Agent class doesn't expose oasfSkills/oasfDomains getters.
  // Fall back to extracting from the OASF endpoint in regFile.endpoints.
  const endpoints = Array.isArray(regFile.endpoints) ? regFile.endpoints : [];
  const oasfEp = endpoints.find((e: { type?: string }) => e.type === EndpointType.OASF);

  return {
    agentId: agent.agentId,
    name: sName.value,
    description: sDesc.value,
    image: agent.image,
    active: regFile.active,
    x402support: regFile.x402support ?? false,
    mcpEndpoint: agent.mcpEndpoint,
    a2aEndpoint: agent.a2aEndpoint,
    ensName: agent.ensEndpoint,
    webEndpoint: agent.webEndpoint,
    emailEndpoint: agent.emailEndpoint,
    mcpTools: agent.mcpTools ?? [],
    mcpPrompts: agent.mcpPrompts ?? [],
    mcpResources: agent.mcpResources ?? [],
    a2aSkills: agent.a2aSkills ?? [],
    oasfSkills: agent.oasfSkills ?? (oasfEp as { meta?: { skills?: unknown[] } })?.meta?.skills ?? [],
    oasfDomains: agent.oasfDomains ?? (oasfEp as { meta?: { domains?: unknown[] } })?.meta?.domains ?? [],
    trustModels: regFile.trustModels,
    owners: regFile.owners,
    endpoints: regFile.endpoints,
    ...extras,
    ...((sName.truncated || sDesc.truncated) && { _truncated: true }),
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
    case 'helia':
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
