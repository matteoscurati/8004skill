import { existsSync, readFileSync, mkdirSync, lstatSync, fstatSync, openSync, writeSync, closeSync, constants as fsConstants } from 'node:fs';
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
  if (lstatSync(WC_STORAGE_FILE).isSymbolicLink()) {
    throw new Error(`Refusing to read symlink: ${WC_STORAGE_FILE}`);
  }
  try {
    return JSON.parse(readFileSync(WC_STORAGE_FILE, 'utf-8')) as StorageData;
  } catch {
    return {};
  }
}

function saveStorageData(data: StorageData): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }

  if (existsSync(WC_STORAGE_FILE) && lstatSync(WC_STORAGE_FILE).isSymbolicLink()) {
    throw new Error(`Refusing to write symlink: ${WC_STORAGE_FILE}`);
  }

  // O_NOFOLLOW prevents writing through symlinks; cast needed because Node types omit it on some platforms
  const O_NOFOLLOW = (fsConstants as Record<string, number>).O_NOFOLLOW ?? 0;
  const flags = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_TRUNC | O_NOFOLLOW;
  const fd = openSync(WC_STORAGE_FILE, flags, 0o600);
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
  const fromEnv = process.env.WC_PROJECT_ID;
  if (fromEnv) return fromEnv;
  const fromConfig = readProjectIdFromConfig();
  if (fromConfig) return fromConfig;
  return DEFAULT_PROJECT_ID;
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
      let settled = false;

      function done(outcome: () => void): void {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        outcome();
      }

      const timeout = setTimeout(() => {
        done(() => reject(new Error('WalletConnect pairing timed out (120s). Run wc-pair.ts to pair again.')));
      }, 120_000);

      // Fail fast on fatal relay errors (typed Event union omits 'error')
      const emitter = provider as unknown as NodeJS.EventEmitter;
      emitter.on('error', (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Project not found')) {
          done(() => reject(new Error(
            'WalletConnect project ID not found. ' +
            'Set WC_PROJECT_ID env var or configure it via the Configure operation. ' +
            'Get a free project ID at https://cloud.walletconnect.com',
          )));
        }
      });

      provider.on('display_uri', (uri: string) => {
        console.error(JSON.stringify({ status: 'pairing', message: 'Scan QR code with your wallet app' }));
        qrcode.generate(uri, { small: true }, (code: string) => {
          console.error(code);
        });
      });

      provider.connect().then(() => {
        done(() => resolve());
      }).catch((err: unknown) => {
        done(() => reject(err));
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
        throw new Error(
          `Wallet is on chain ${provider.chainId} but script requires chain ${opts.chainId}. ` +
          `Switch chains in your wallet or start a new session with wc-pair.ts --chain-id ${opts.chainId}`,
        );
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
  const sessionInfo = getSessionInfo();
  const chainId = sessionInfo.chainId ?? 1;
  const storage = new FileSystemStorage();
  const provider = await EthereumProvider.init({
    projectId: resolveProjectId(),
    chains: [chainId],
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
