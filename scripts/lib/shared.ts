import type { SDKConfig } from 'agent0-sdk';

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

export function parseChainId(raw: string | undefined, fallback = '11155111'): number {
  const val = parseInt(raw || fallback, 10);
  if (Number.isNaN(val)) exitWithError(`Invalid chain-id: "${raw}". Must be a number.`);
  return val;
}

export function parseIntStrict(raw: string | undefined, name: string): number {
  if (raw === undefined) exitWithError(`--${name} is required`);
  const val = parseInt(raw, 10);
  if (Number.isNaN(val)) exitWithError(`Invalid --${name}: "${raw}". Must be a number.`);
  return val;
}

export function validateAgentId(id: string): void {
  if (!/^\d+:\d+$/.test(id))
    exitWithError(`Invalid agent-id "${id}". Expected format: chainId:tokenId (e.g. 11155111:42)`);
}

export function validateAddress(addr: string, name: string): void {
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr))
    exitWithError(`Invalid ${name}: "${addr}". Must be a 0x-prefixed 40-hex-char address.`);
}

const VALID_IPFS = ['pinata', 'filecoinPin', 'node'] as const;
export type IpfsProvider = (typeof VALID_IPFS)[number];

export function validateIpfsProvider(raw: string): IpfsProvider {
  if (!VALID_IPFS.includes(raw as IpfsProvider))
    exitWithError(`Invalid --ipfs "${raw}". Must be: ${VALID_IPFS.join(', ')}`);
  return raw as IpfsProvider;
}

// ── SDK config builder ──────────────────────────────────────────────

export function buildSdkConfig(opts: {
  chainId: number;
  rpcUrl: string;
  privateKey?: string;
  ipfsProvider?: string;
  pinataJwt?: string;
  filecoinPrivateKey?: string;
  ipfsNodeUrl?: string;
  subgraphUrl?: string;
  registryOverrides?: Record<number, Record<string, string>>;
}): SDKConfig {
  const config: SDKConfig = { chainId: opts.chainId, rpcUrl: opts.rpcUrl };
  if (opts.privateKey) config.privateKey = opts.privateKey;
  if (opts.subgraphUrl) config.subgraphUrl = opts.subgraphUrl;
  if (opts.registryOverrides) config.registryOverrides = opts.registryOverrides;

  if (opts.ipfsProvider) {
    const provider = validateIpfsProvider(opts.ipfsProvider);
    config.ipfs = provider;

    if (provider === 'pinata') {
      if (!opts.pinataJwt) exitWithError('--pinata-jwt or PINATA_JWT env var required when using --ipfs pinata');
      config.pinataJwt = opts.pinataJwt;
    }
    if (provider === 'filecoinPin') {
      if (!opts.filecoinPrivateKey)
        exitWithError('FILECOIN_PRIVATE_KEY env var required when using --ipfs filecoinPin');
      config.filecoinPrivateKey = opts.filecoinPrivateKey;
    }
    if (provider === 'node') {
      if (!opts.ipfsNodeUrl) exitWithError('--ipfs-node-url or IPFS_NODE_URL env var required when using --ipfs node');
      config.ipfsNodeUrl = opts.ipfsNodeUrl;
    }
  }

  return config;
}

// ── Environment overrides for non-default chains ────────────────────

export function getOverridesFromEnv(chainId: number): {
  subgraphUrl?: string;
  registryOverrides?: Record<number, Record<string, string>>;
} {
  const result: ReturnType<typeof getOverridesFromEnv> = {};

  const subgraphUrl = process.env.SUBGRAPH_URL;
  if (subgraphUrl) result.subgraphUrl = subgraphUrl;

  const identity = process.env.REGISTRY_ADDRESS_IDENTITY;
  const reputation = process.env.REGISTRY_ADDRESS_REPUTATION;
  if (identity || reputation) {
    const reg: Record<string, string> = {};
    if (identity) reg.IDENTITY = identity;
    if (reputation) reg.REPUTATION = reputation;
    result.registryOverrides = { [chainId]: reg };
  }

  return result;
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
    exitWithError(err.message, err.stack);
  }
  exitWithError(String(err));
}
