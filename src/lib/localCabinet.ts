import { emptyNotebook, parseNotebook, type Notebook } from './notebook';

const ACCOUNTS_KEY = 'today-cat.cabinets.v1';
const SESSION_KEY = 'today-cat.cabinet-session';
const ATTEMPTS_KEY = 'today-cat.cabinet-attempts';
const NOTEBOOK_LIMIT = 500_000;
const LOGIN_PATTERN = /^[\p{L}\p{N}_-]+$/u;

type MemoryStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

type AccountRecord = {
  login: string;
  salt: string;
  verify: string;
  notebook: string;
};

type AccountsFile = {
  users: Record<string, AccountRecord>;
};

type SessionFile = {
  loginKey: string;
  key: string;
};

export type LocalCabinet = {
  readSession: () => Promise<{ login: string; notebook: Notebook } | null>;
  register: (login: string, password: string) => Promise<{ login: string; notebook: Notebook }>;
  login: (login: string, password: string) => Promise<{ login: string; notebook: Notebook }>;
  save: (notebook: Notebook) => Promise<void>;
  logout: () => void;
};

function loginIdentity(value: string) {
  const display = value.trim();
  if (display.length < 3 || display.length > 24 || !LOGIN_PATTERN.test(display)) return null;
  return { display, key: display.toLocaleLowerCase('ru-RU') };
}

function validPassword(value: string) {
  return value.length >= 6 && value.length <= 72;
}

function bytesToBase64(bytes: Uint8Array) {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

function base64ToBytes(value: string) {
  const text = atob(value);
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index);
  return bytes;
}

function asBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function sameBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

async function deriveBits(password: string, salt: Uint8Array, label: string) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const saltBytes = new Uint8Array(salt.length + label.length);
  saltBytes.set(salt);
  saltBytes.set(new TextEncoder().encode(label), salt.length);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 120_000, hash: 'SHA-256' },
    base,
    256,
  );
  return new Uint8Array(bits);
}

async function encryptNotebook(keyBytes: Uint8Array, notebook: Notebook) {
  const encoded = JSON.stringify(notebook);
  if (encoded.length > NOTEBOOK_LIMIT) throw new Error('notebook');
  const key = await crypto.subtle.importKey('raw', asBuffer(keyBytes), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(encoded)));
  return `${bytesToBase64(iv)}.${bytesToBase64(cipher)}`;
}

async function decryptNotebook(keyBytes: Uint8Array, payload: string) {
  const [ivText, cipherText] = payload.split('.');
  if (!ivText || !cipherText) throw new Error('cabinet');
  const key = await crypto.subtle.importKey('raw', asBuffer(keyBytes), 'AES-GCM', false, ['decrypt']);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(ivText) },
      key,
      base64ToBytes(cipherText),
    );
  } catch {
    throw new Error('cabinet');
  }
  const parsed = parseNotebook(JSON.parse(new TextDecoder().decode(plain)));
  if (!parsed) throw new Error('cabinet');
  return parsed;
}

function readJson<T>(storage: MemoryStorage, key: string): T | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error('cabinet');
  }
}

function writeJson(storage: MemoryStorage, key: string, value: unknown) {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error('browser');
  }
}

function freshNotebook(login: string): Notebook {
  return { ...emptyNotebook(), name: login.slice(0, 40) };
}

export function createLocalCabinet(persistent: MemoryStorage, session: MemoryStorage): LocalCabinet {
  function accounts() {
    const file = readJson<AccountsFile>(persistent, ACCOUNTS_KEY);
    if (!file) return { users: {} };
    if (!file.users || typeof file.users !== 'object') throw new Error('cabinet');
    return file;
  }

  function blocked(loginKey: string) {
    const now = Date.now();
    const all = readJson<Record<string, number[]>>(persistent, ATTEMPTS_KEY) ?? {};
    const recent = (all[loginKey] ?? []).filter((stamp) => now - stamp < 15 * 60 * 1000);
    all[loginKey] = recent;
    writeJson(persistent, ATTEMPTS_KEY, all);
    return recent.length >= 8;
  }

  function recordFailure(loginKey: string) {
    const now = Date.now();
    const all = readJson<Record<string, number[]>>(persistent, ATTEMPTS_KEY) ?? {};
    const recent = (all[loginKey] ?? []).filter((stamp) => now - stamp < 15 * 60 * 1000);
    recent.push(now);
    all[loginKey] = recent;
    writeJson(persistent, ATTEMPTS_KEY, all);
  }

  function clearFailures(loginKey: string) {
    const all = readJson<Record<string, number[]>>(persistent, ATTEMPTS_KEY) ?? {};
    delete all[loginKey];
    writeJson(persistent, ATTEMPTS_KEY, all);
  }

  async function open(loginKey: string, login: string, password: string, record: AccountRecord | null, creating: boolean) {
    if (!creating && blocked(loginKey)) throw new Error('rate');
    const salt = creating ? crypto.getRandomValues(new Uint8Array(16)) : base64ToBytes(record?.salt || '');
    const verify = await deriveBits(password, salt, 'verify');
    if (!creating) {
      const expected = record ? base64ToBytes(record.verify) : new Uint8Array(32);
      const matches = Boolean(record) && sameBytes(verify, expected);
      if (!matches) {
        recordFailure(loginKey);
        throw new Error('credentials');
      }
      clearFailures(loginKey);
    }
    const key = await deriveBits(password, salt, 'notebook');
    const notebook = creating ? freshNotebook(login) : await decryptNotebook(key, record?.notebook || '');
    const next: AccountRecord = {
      login,
      salt: bytesToBase64(salt),
      verify: bytesToBase64(verify),
      notebook: await encryptNotebook(key, notebook),
    };
    const file = accounts();
    file.users[loginKey] = next;
    writeJson(persistent, ACCOUNTS_KEY, file);
    writeJson(session, SESSION_KEY, { loginKey, key: bytesToBase64(key) } satisfies SessionFile);
    return { login, notebook };
  }

  return {
    async readSession() {
      const current = readJson<SessionFile>(session, SESSION_KEY);
      if (!current?.loginKey || !current.key) return null;
      const record = accounts().users[current.loginKey];
      if (!record) return null;
      try {
        return { login: record.login, notebook: await decryptNotebook(base64ToBytes(current.key), record.notebook) };
      } catch {
        session.removeItem(SESSION_KEY);
        return null;
      }
    },
    async register(loginValue, password) {
      const login = loginIdentity(loginValue);
      if (!login) throw new Error('login');
      if (!validPassword(password)) throw new Error('password');
      if (accounts().users[login.key]) throw new Error('taken');
      return open(login.key, login.display, password, null, true);
    },
    async login(loginValue, password) {
      const login = loginIdentity(loginValue);
      if (!login) throw new Error('login');
      if (!validPassword(password)) throw new Error('password');
      const record = accounts().users[login.key] ?? null;
      return open(login.key, record?.login || login.display, password, record, false);
    },
    async save(notebook) {
      const current = readJson<SessionFile>(session, SESSION_KEY);
      if (!current?.loginKey || !current.key) throw new Error('auth');
      const file = accounts();
      const record = file.users[current.loginKey];
      if (!record) throw new Error('auth');
      record.notebook = await encryptNotebook(base64ToBytes(current.key), notebook);
      file.users[current.loginKey] = record;
      writeJson(persistent, ACCOUNTS_KEY, file);
    },
    logout() {
      session.removeItem(SESSION_KEY);
    },
  };
}
