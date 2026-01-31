import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, chmodSync, lstatSync, openSync, writeSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ── Types ───────────────────────────────────────────────────────────

export interface KdfParams {
  iterations: number;
  digest: string;
  salt: string;
  keyLength: number;
}

export interface KeystoreEntry {
  label: string;
  address: string;
  cipher: string;
  kdf: string;
  kdfParams: KdfParams;
  ciphertext: string;
  iv: string;
  authTag: string;
  createdAt: string;
}

export interface KeystoreFile {
  version: number;
  entries: KeystoreEntry[];
}

export type EncryptedPayload = Omit<KeystoreEntry, 'label' | 'address' | 'createdAt'>;

// ── Constants ───────────────────────────────────────────────────────

const KEYSTORE_DIR = join(homedir(), '.8004skill');
const KEYSTORE_FILENAME = 'keystore.json';
const KDF_ITERATIONS = 262_144;
const KDF_DIGEST = 'sha256';
const KDF_KEY_LENGTH = 32;
const CIPHER_ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

// ── Path helpers ────────────────────────────────────────────────────

export function getKeystorePath(): string {
  return join(KEYSTORE_DIR, KEYSTORE_FILENAME);
}

export function keystoreExists(): boolean {
  return existsSync(getKeystorePath());
}

// ── Security helpers ────────────────────────────────────────────────

function checkNotSymlink(path: string): void {
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) {
    throw new Error(`Refusing to operate on symlink: ${path}`);
  }
}

const HEX_RE = /^[0-9a-fA-F]+$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function validateKeystoreFile(parsed: unknown): KeystoreFile {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid keystore: not an object');
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.version !== 1) {
    throw new Error(`Unsupported keystore version: ${obj.version}`);
  }
  if (!Array.isArray(obj.entries)) {
    throw new Error('Invalid keystore: "entries" is not an array');
  }
  for (let i = 0; i < obj.entries.length; i++) {
    const e = obj.entries[i];
    if (typeof e !== 'object' || e === null) {
      throw new Error(`Invalid keystore entry at index ${i}: not an object`);
    }
    const entry = e as Record<string, unknown>;
    for (const field of ['label', 'address', 'cipher', 'kdf', 'ciphertext', 'iv', 'authTag', 'createdAt']) {
      if (typeof entry[field] !== 'string') {
        throw new Error(`Invalid keystore entry at index ${i}: missing or non-string field "${field}"`);
      }
    }
    if (!ADDRESS_RE.test(entry.address as string)) {
      throw new Error(`Invalid keystore entry at index ${i}: "address" is not a valid Ethereum address`);
    }
    for (const hexField of ['ciphertext', 'iv', 'authTag']) {
      if (!HEX_RE.test(entry[hexField] as string)) {
        throw new Error(`Invalid keystore entry at index ${i}: "${hexField}" is not valid hex`);
      }
    }
    const kdf = entry.kdfParams;
    if (typeof kdf !== 'object' || kdf === null) {
      throw new Error(`Invalid keystore entry at index ${i}: "kdfParams" is not an object`);
    }
    const kdfObj = kdf as Record<string, unknown>;
    for (const [field, type] of [['iterations', 'number'], ['keyLength', 'number'], ['digest', 'string']] as const) {
      if (typeof kdfObj[field] !== type) {
        throw new Error(`Invalid keystore entry at index ${i}: "kdfParams.${field}" is not a ${type}`);
      }
    }
    if (typeof kdfObj.salt !== 'string' || !HEX_RE.test(kdfObj.salt)) {
      throw new Error(`Invalid keystore entry at index ${i}: "kdfParams.salt" is not valid hex`);
    }
  }
  return parsed as KeystoreFile;
}

// ── File I/O ────────────────────────────────────────────────────────

export function loadKeystoreFile(): KeystoreFile {
  const path = getKeystorePath();
  checkNotSymlink(path);
  const raw = readFileSync(path, 'utf-8');
  return validateKeystoreFile(JSON.parse(raw));
}

export function saveKeystoreFile(ks: KeystoreFile): void {
  if (!existsSync(KEYSTORE_DIR)) {
    mkdirSync(KEYSTORE_DIR, { recursive: true });
    chmodSync(KEYSTORE_DIR, 0o700);
  }
  const path = getKeystorePath();
  checkNotSymlink(path);
  const fd = openSync(path, 'w', 0o600);
  try {
    writeSync(fd, JSON.stringify(ks, null, 2));
  } finally {
    closeSync(fd);
  }
}

// ── Crypto ──────────────────────────────────────────────────────────

export function encryptKey(privateKey: string, password: string): EncryptedPayload {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  const dk = pbkdf2Sync(password, salt, KDF_ITERATIONS, KDF_KEY_LENGTH, KDF_DIGEST);

  const cipher = createCipheriv(CIPHER_ALGO, dk, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(privateKey, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  dk.fill(0);

  return {
    cipher: CIPHER_ALGO,
    kdf: 'pbkdf2',
    kdfParams: {
      iterations: KDF_ITERATIONS,
      digest: KDF_DIGEST,
      salt: salt.toString('hex'),
      keyLength: KDF_KEY_LENGTH,
    },
    ciphertext: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

export function decryptKey(entry: KeystoreEntry, password: string): string {
  const { kdfParams, ciphertext, iv, authTag } = entry;

  function tamperCheck(condition: boolean, detail: string): void {
    if (condition) throw new Error(`${detail}. Keystore may be tampered.`);
  }
  tamperCheck(kdfParams.iterations < KDF_ITERATIONS, `KDF iterations ${kdfParams.iterations} below minimum ${KDF_ITERATIONS}`);
  tamperCheck(kdfParams.keyLength !== KDF_KEY_LENGTH, `KDF key length ${kdfParams.keyLength} does not match expected ${KDF_KEY_LENGTH}`);
  tamperCheck(kdfParams.digest !== KDF_DIGEST, `KDF digest "${kdfParams.digest}" does not match expected "${KDF_DIGEST}"`);
  tamperCheck(entry.cipher !== CIPHER_ALGO, `Cipher "${entry.cipher}" does not match expected "${CIPHER_ALGO}"`);
  tamperCheck(entry.kdf !== 'pbkdf2', `KDF "${entry.kdf}" does not match expected "pbkdf2"`);

  const salt = Buffer.from(kdfParams.salt, 'hex');
  const dk = pbkdf2Sync(password, salt, kdfParams.iterations, kdfParams.keyLength, kdfParams.digest);

  const decipher = createDecipheriv(CIPHER_ALGO, dk, Buffer.from(iv, 'hex'), {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final(),
  ]);

  dk.fill(0);

  const result = decrypted.toString('utf-8');
  decrypted.fill(0);

  return result;
}

// ── Entry helpers ───────────────────────────────────────────────────

export function findEntry(ks: KeystoreFile, label: string): KeystoreEntry | undefined {
  return ks.entries.find((e) => e.label === label);
}

export function listEntries(ks: KeystoreFile): Pick<KeystoreEntry, 'label' | 'address' | 'createdAt'>[] {
  return ks.entries.map(({ label, address, createdAt }) => ({ label, address, createdAt }));
}
