import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    lstatSync: vi.fn(),
  };
});

vi.mock('qrcode-terminal', () => ({
  default: { generate: vi.fn() },
}));

vi.mock('@walletconnect/ethereum-provider', () => ({
  default: { init: vi.fn() },
}));

const {
  resolveProjectId,
  getSessionInfo,
  hasActiveSession,
  getWcStoragePath,
  getConnectedAddress,
} = await import('../../scripts/lib/walletconnect.js');

const WC_STORAGE_FILE = join(homedir(), '.8004skill', 'wc-storage.json');
const CONFIG_FILE = join(homedir(), '.8004skill', 'config.json');

const existsSyncMock = vi.mocked(existsSync);
const readFileSyncMock = vi.mocked(readFileSync);
const lstatSyncMock = vi.mocked(lstatSync);

beforeEach(() => {
  existsSyncMock.mockReturnValue(false);
  lstatSyncMock.mockReturnValue({ isSymbolicLink: () => false } as ReturnType<typeof lstatSync>);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('resolveProjectId', () => {
  it('uses WC_PROJECT_ID env var when set', () => {
    vi.stubEnv('WC_PROJECT_ID', 'env-project-id');
    expect(resolveProjectId()).toBe('env-project-id');
  });

  it('reads from config.json when env var is not set', () => {
    vi.stubEnv('WC_PROJECT_ID', '');
    existsSyncMock.mockImplementation((p) => String(p) === CONFIG_FILE);
    readFileSyncMock.mockReturnValue(JSON.stringify({ wcProjectId: 'config-project-id' }));
    expect(resolveProjectId()).toBe('config-project-id');
  });

  it('returns default when neither env nor config are set', () => {
    vi.stubEnv('WC_PROJECT_ID', '');
    existsSyncMock.mockReturnValue(false);
    expect(resolveProjectId()).toBe('e1a2f95c34367e8cca697e98d8fce582');
  });
});

describe('getSessionInfo', () => {
  it('returns inactive when storage file does not exist', () => {
    existsSyncMock.mockReturnValue(false);
    const info = getSessionInfo();
    expect(info).toEqual({ sessionActive: false, connectedAddress: null, chainId: null });
  });

  it('extracts address and chainId from valid session', () => {
    existsSyncMock.mockImplementation((p) => String(p) === WC_STORAGE_FILE);
    readFileSyncMock.mockReturnValue(
      JSON.stringify({
        'wc@2:ethereum_provider:session': {
          accounts: ['0x1234567890abcdef1234567890abcdef12345678'],
          chainId: 11155111,
        },
      }),
    );
    const info = getSessionInfo();
    expect(info.sessionActive).toBe(true);
    expect(info.connectedAddress).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(info.chainId).toBe(11155111);
  });

  it('returns inactive on invalid JSON', () => {
    existsSyncMock.mockImplementation((p) => String(p) === WC_STORAGE_FILE);
    readFileSyncMock.mockReturnValue('not valid json{{{');
    const info = getSessionInfo();
    expect(info).toEqual({ sessionActive: false, connectedAddress: null, chainId: null });
  });
});

describe('hasActiveSession', () => {
  it('delegates to getSessionInfo', () => {
    existsSyncMock.mockReturnValue(false);
    expect(hasActiveSession()).toBe(false);
  });
});

describe('getWcStoragePath', () => {
  it('returns the expected path', () => {
    expect(getWcStoragePath()).toBe(WC_STORAGE_FILE);
  });
});

describe('getConnectedAddress', () => {
  it('returns first account from provider', () => {
    const provider = { accounts: ['0xabc'] } as any;
    expect(getConnectedAddress(provider)).toBe('0xabc');
  });

  it('throws when no accounts', () => {
    const provider = { accounts: [] } as any;
    expect(() => getConnectedAddress(provider)).toThrow('No connected account');
  });
});
