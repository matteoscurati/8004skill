import { existsSync, readFileSync, mkdirSync, chmodSync, lstatSync, fstatSync, openSync, writeSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { IKeyValueStorage } from '@walletconnect/keyvaluestorage';
import EthereumProvider from '@walletconnect/ethereum-provider';
import type { EthereumProviderOptions } from '@walletconnect/ethereum-provider';
import qrcode from 'qrcode-terminal';

// ── Constants ────────────────────────────────────────────────────────

const CONFIG_DIR = join(homedir(), '.8004skill');
const WC_STORAGE_FILE = join(CONFIG_DIR, 'wc-storage.json');

const DEFAULT_PROJECT_ID = 'e1a2f95c34367e8cca697e98d8fce582';

const REQUIRED_METHODS = [
  'eth_sendTransaction',
  'personal_sign',
  'eth_signTypedData_v4',
];

const REQUIRED_EVENTS = ['chainChanged', 'accountsChanged'];

// ── FileSystemStorage (IKeyValueStorage for WC) ─────────────────────

type StorageData = Record<string, unknown>;

function loadStorageData(): StorageData {
  if (!existsSync(WC_STORAGE_FILE)) return {};
  try {
    if (lstatSync(WC_STORAGE_FILE).isSymbolicLink()) {
      throw new Error(`Refusing to read symlink: ${WC_STORAGE_FILE}`);
    }
    return JSON.parse(readFileSync(WC_STORAGE_FILE, 'utf-8')) as StorageData;
  } catch {
    return {};
  }
}

function saveStorageData(data: StorageData): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
    chmodSync(CONFIG_DIR, 0o700);
  }

  if (existsSync(WC_STORAGE_FILE) && lstatSync(WC_STORAGE_FILE).isSymbolicLink()) {
    throw new Error(`Refusing to write symlink: ${WC_STORAGE_FILE}`);
  }

  const fd = openSync(WC_STORAGE_FILE, 'w', 0o600);
  try {
    const fdStat = fstatSync(fd);
    if (!fdStat.isFile()) {
      throw new Error(`Refusing to write: ${WC_STORAGE_FILE} is not a regular file.`);
    }
    writeSync(fd, JSON.stringify(data, null, 2));
  } finally {
    closeSync(fd);
  }
}

export class FileSystemStorage extends IKeyValueStorage {
  private data: StorageData;

  constructor() {
    super();
    this.data = loadStorageData();
  }

  async getKeys(): Promise<string[]> {
    return Object.keys(this.data);
  }

  async getEntries<T = unknown>(): Promise<[string, T][]> {
    return Object.entries(this.data) as [string, T][];
  }

  async getItem<T = unknown>(key: string): Promise<T | undefined> {
    return this.data[key] as T | undefined;
  }

  async setItem<T = unknown>(key: string, value: T): Promise<void> {
    this.data[key] = value;
    saveStorageData(this.data);
  }

  async removeItem(key: string): Promise<void> {
    delete this.data[key];
    saveStorageData(this.data);
  }
}

// ── WalletConnect Provider Init ─────────────────────────────────────

export function resolveProjectId(): string {
  return process.env.WC_PROJECT_ID || readProjectIdFromConfig() || DEFAULT_PROJECT_ID;
}

function readProjectIdFromConfig(): string | undefined {
  const configPath = join(CONFIG_DIR, 'config.json');
  if (!existsSync(configPath)) return undefined;
  try {
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return config.wcProjectId as string | undefined;
  } catch {
    return undefined;
  }
}

export async function initWalletConnectProvider(opts: {
  chainId: number;
  projectId?: string;
}): Promise<EthereumProvider> {
  const projectId = opts.projectId || resolveProjectId();
  const storage = new FileSystemStorage();

  const providerOpts: EthereumProviderOptions = {
    projectId,
    chains: [opts.chainId],
    methods: REQUIRED_METHODS,
    events: REQUIRED_EVENTS,
    showQrModal: false,
    storage,
    storageOptions: { database: WC_STORAGE_FILE },
  };

  const provider = await EthereumProvider.init(providerOpts);

  // If no active session, trigger pairing and show QR in terminal
  if (!provider.session) {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WalletConnect pairing timed out (120s). Run wc-pair.ts to pair again.'));
      }, 120_000);

      provider.on('display_uri', (uri: string) => {
        console.error(JSON.stringify({ status: 'pairing', message: 'Scan QR code with your wallet app' }));
        qrcode.generate(uri, { small: true }, (code: string) => {
          console.error(code);
        });
      });

      provider.connect().then(() => {
        clearTimeout(timeout);
        resolve();
      }).catch((err: unknown) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  } else {
    // Existing session — ensure correct chain
    if (provider.chainId !== opts.chainId) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${opts.chainId.toString(16)}` }],
        });
      } catch {
        console.error(JSON.stringify({
          status: 'warning',
          message: `Could not switch wallet to chain ${opts.chainId}. Current chain: ${provider.chainId}`,
        }));
      }
    }
  }

  // Register cleanup handler
  provider.on('session_delete', () => {
    console.error(JSON.stringify({ status: 'session_deleted', message: 'WalletConnect session ended. Run wc-pair.ts to reconnect.' }));
  });

  return provider;
}

// ── Helpers ──────────────────────────────────────────────────────────

export function getConnectedAddress(provider: EthereumProvider): string {
  const account = provider.accounts[0];
  if (!account) {
    throw new Error('No connected account. Run wc-pair.ts to connect a wallet.');
  }
  return account;
}

export async function disconnectSession(): Promise<void> {
  const storage = new FileSystemStorage();
  const provider = await EthereumProvider.init({
    projectId: resolveProjectId(),
    chains: [1],
    showQrModal: false,
    storage,
    storageOptions: { database: WC_STORAGE_FILE },
  });

  if (provider.session) {
    await provider.disconnect();
  }

  // Clear all WC storage entries
  const keys = await storage.getKeys();
  for (const key of keys) {
    await storage.removeItem(key);
  }
}

export function getWcStoragePath(): string {
  return WC_STORAGE_FILE;
}

export function hasActiveSession(): boolean {
  return getSessionInfo().sessionActive;
}

export function getSessionInfo(): {
  sessionActive: boolean;
  connectedAddress: string | null;
  chainId: number | null;
} {
  if (!existsSync(WC_STORAGE_FILE)) {
    return { sessionActive: false, connectedAddress: null, chainId: null };
  }
  try {
    const data = loadStorageData();
    // Look for ethereum provider session data
    const sessionKey = Object.keys(data).find((k) => k.startsWith('wc@2:ethereum_provider:'));
    if (!sessionKey || !data[sessionKey]) {
      return { sessionActive: false, connectedAddress: null, chainId: null };
    }
    const session = data[sessionKey] as { accounts?: string[]; chainId?: number };
    const address = session.accounts?.[0] ?? null;
    const chainId = session.chainId ?? null;
    return { sessionActive: true, connectedAddress: address, chainId };
  } catch {
    return { sessionActive: false, connectedAddress: null, chainId: null };
  }
}
