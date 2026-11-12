import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { sessionCookie, type AccountResult } from './account';
import { databaseUrl } from './db';
import { ensureSchema } from './schema';
import { hashPassword, normalizeLogin, validPassword, verifyPassword } from './password';
import { emptyNotebook, parseNotebook, type Notebook } from '../src/lib/notebook';

type CabinetUser = {
  id: string;
  login: string;
  loginKey: string;
  passwordHash: string;
};

type SessionRow = {
  tokenHash: string;
  userId: string;
  expiresAt: string;
};

type NotebookRow = {
  userId: string;
  data: unknown;
};

type FileDatabase = {
  users: CabinetUser[];
  sessions: SessionRow[];
  notebooks: NotebookRow[];
};

export type CabinetStore = {
  findByLogin: (loginKey: string) => Promise<CabinetUser | null>;
  insertUser: (user: CabinetUser) => Promise<'ok' | 'taken'>;
  createSession: (userId: string, tokenHash: string) => Promise<void>;
  deleteSession: (tokenHash: string) => Promise<void>;
  userForToken: (tokenHash: string) => Promise<CabinetUser | null>;
  readNotebook: (userId: string) => Promise<unknown | null>;
  writeNotebook: (userId: string, data: Notebook) => Promise<void>;
};

const NOTEBOOK_LIMIT = 500_000;
let dummyHash: Promise<string> | null = null;

function token() {
  return randomBytes(32).toString('base64url');
}

function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function dummyPasswordHash() {
  dummyHash ??= hashPassword('not-a-real-password');
  return dummyHash;
}

function freshNotebook(login: string): Notebook {
  return { ...emptyNotebook(), name: login.slice(0, 40) };
}

function sessionExpiry() {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

function emptyFileDatabase(): FileDatabase {
  return { users: [], sessions: [], notebooks: [] };
}

export function createFileStore(filePath: string): CabinetStore {
  let queue = Promise.resolve();

  function update<T>(recipe: (db: FileDatabase) => { db: FileDatabase; result: T } | Promise<{ db: FileDatabase; result: T }>) {
    const run = queue.then(async () => {
      const db = await readFileDatabase(filePath);
      const next = await recipe(db);
      await writeFileDatabase(filePath, next.db);
      return next.result;
    });
    queue = run.then(() => undefined, () => undefined);
    return run;
  }

  return {
    findByLogin(loginKey) {
      return update(async (db) => ({ db, result: db.users.find((user) => user.loginKey === loginKey) ?? null }));
    },
    insertUser(user) {
      return update(async (db) => {
        if (db.users.some((item) => item.loginKey === user.loginKey)) return { db, result: 'taken' as const };
        return { db: { ...db, users: [...db.users, user] }, result: 'ok' as const };
      });
    },
    createSession(userId, tokenHash) {
      return update(async (db) => ({
        db: {
          ...db,
          sessions: [...db.sessions, { tokenHash, userId, expiresAt: sessionExpiry() }],
        },
        result: undefined,
      }));
    },
    deleteSession(tokenHash) {
      return update(async (db) => ({
        db: { ...db, sessions: db.sessions.filter((session) => session.tokenHash !== tokenHash) },
        result: undefined,
      }));
    },
    userForToken(tokenHash) {
      return update(async (db) => {
        const now = new Date().toISOString();
        const session = db.sessions.find((item) => item.tokenHash === tokenHash && item.expiresAt > now);
        const user = session ? db.users.find((item) => item.id === session.userId) ?? null : null;
        return { db, result: user };
      });
    },
    readNotebook(userId) {
      return update(async (db) => ({
        db,
        result: db.notebooks.find((item) => item.userId === userId)?.data ?? null,
      }));
    },
    writeNotebook(userId, data) {
      return update(async (db) => {
        const notebooks = db.notebooks.filter((item) => item.userId !== userId);
        notebooks.push({ userId, data });
        return { db: { ...db, notebooks }, result: undefined };
      });
    },
  };
}

async function readFileDatabase(filePath: string): Promise<FileDatabase> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<FileDatabase>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      notebooks: Array.isArray(parsed.notebooks) ? parsed.notebooks : [],
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return emptyFileDatabase();
    throw error;
  }
}

async function writeFileDatabase(filePath: string, db: FileDatabase) {
  await mkdir(dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(db), 'utf8');
  await rename(temporary, filePath);
}

type SqlClient = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  query: (text: string, params?: unknown[]) => Promise<unknown>;
};

function asRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : [];
}

function textField(row: Record<string, unknown>, name: string) {
  const value = row[name] ?? row[name.toLowerCase()];
  return typeof value === 'string' ? value : '';
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '23505');
}

async function createNeonStore(): Promise<CabinetStore> {
  const sql = (await ensureSchema()) as unknown as SqlClient;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS login text`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS login_key text`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_login_key_idx ON users (login_key)`;
  await sql`CREATE TABLE IF NOT EXISTS notebooks (
    user_id text PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;

  return {
    async findByLogin(loginKey) {
      const rows = asRows(await sql.query(
        `SELECT id, login, login_key, password_hash FROM users WHERE login_key = $1`,
        [loginKey],
      ));
      const row = rows[0];
      if (!row) return null;
      const login = textField(row, 'login');
      const passwordHash = textField(row, 'password_hash');
      if (!login || !passwordHash) return null;
      return { id: textField(row, 'id'), login, loginKey, passwordHash };
    },
    async insertUser(user) {
      try {
        await sql.query(
          `INSERT INTO users (id, email, name, login, login_key, password_hash)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [user.id, `${user.id}@users.today-cat.invalid`, user.login, user.login, user.loginKey, user.passwordHash],
        );
        return 'ok';
      } catch (error) {
        if (isUniqueViolation(error)) return 'taken';
        throw error;
      }
    },
    async createSession(userId, tokenHash) {
      await sql.query(
        `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, now() + interval '30 days')`,
        [randomUUID(), userId, tokenHash],
      );
    },
    async deleteSession(tokenHash) {
      await sql.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
    },
    async userForToken(tokenHash) {
      const rows = asRows(await sql.query(
        `SELECT u.id, u.login, u.login_key, u.password_hash
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now() AND u.login IS NOT NULL`,
        [tokenHash],
      ));
      const row = rows[0];
      if (!row) return null;
      const login = textField(row, 'login');
      const passwordHash = textField(row, 'password_hash');
      if (!login || !passwordHash) return null;
      return { id: textField(row, 'id'), login, loginKey: textField(row, 'login_key'), passwordHash };
    },
    async readNotebook(userId) {
      const rows = asRows(await sql.query(
        `SELECT data FROM notebooks WHERE user_id = $1`,
        [userId],
      ));
      return rows[0] ? rows[0].data ?? null : null;
    },
    async writeNotebook(userId, data) {
      await sql.query(
        `INSERT INTO notebooks (user_id, data, updated_at) VALUES ($1, $2::jsonb, now())
         ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [userId, JSON.stringify(data)],
      );
    },
  };
}

const localFile = join(process.cwd(), 'data', 'local-accounts.json');

let sharedStore: Promise<CabinetStore> | null = null;

export function cabinetStore() {
  sharedStore ??= openCabinetStore().catch((error: unknown) => {
    sharedStore = null;
    throw error;
  });
  return sharedStore;
}

export async function openCabinetStore() {
  if (databaseUrl()) return createNeonStore();
  if (process.env.VERCEL === '1') throw new Error('storage');
  return createFileStore(localFile);
}

async function openSession(store: CabinetStore, user: CabinetUser, secure: boolean): Promise<AccountResult> {
  const raw = token();
  await store.createSession(user.id, hashToken(raw));
  const saved = await store.readNotebook(user.id);
  const notebook = parseNotebook(saved) ?? freshNotebook(user.login);
  if (!parseNotebook(saved)) await store.writeNotebook(user.id, notebook);
  return {
    status: 200,
    body: { login: user.login, notebook },
    cookie: sessionCookie(raw, secure, 60 * 60 * 24 * 30),
  };
}

export async function registerAccount(store: CabinetStore, loginValue: unknown, passwordValue: unknown, secure: boolean): Promise<AccountResult> {
  const login = normalizeLogin(loginValue);
  if (!login) return { status: 400, body: { error: 'login' } };
  if (!validPassword(passwordValue)) return { status: 400, body: { error: 'password' } };
  const user: CabinetUser = {
    id: randomUUID(),
    login: login.display,
    loginKey: login.key,
    passwordHash: await hashPassword(passwordValue),
  };
  const inserted = await store.insertUser(user);
  if (inserted === 'taken') return { status: 409, body: { error: 'taken' } };
  await store.writeNotebook(user.id, freshNotebook(user.login));
  return openSession(store, user, secure);
}

export async function loginAccount(store: CabinetStore, loginValue: unknown, passwordValue: unknown, secure: boolean): Promise<AccountResult> {
  const login = normalizeLogin(loginValue);
  if (!login) return { status: 400, body: { error: 'login' } };
  if (!validPassword(passwordValue)) return { status: 400, body: { error: 'password' } };
  const user = await store.findByLogin(login.key);
  const matches = await verifyPassword(passwordValue, user?.passwordHash ?? await dummyPasswordHash());
  if (!user || !matches) return { status: 401, body: { error: 'credentials' } };
  return openSession(store, user, secure);
}

export async function logoutAccount(store: CabinetStore, rawToken: string, secure: boolean): Promise<AccountResult> {
  if (rawToken) await store.deleteSession(hashToken(rawToken));
  return { status: 200, body: { ok: true }, cookie: sessionCookie('', secure, 0) };
}

export async function readAccountNotebook(store: CabinetStore, rawToken: string): Promise<AccountResult> {
  const user = rawToken ? await store.userForToken(hashToken(rawToken)) : null;
  if (!user) return { status: 401, body: { error: 'auth' } };
  const saved = await store.readNotebook(user.id);
  const notebook = parseNotebook(saved) ?? freshNotebook(user.login);
  return { status: 200, body: { login: user.login, notebook } };
}

export function notebookFromBody(value: unknown): Notebook | null {
  const encoded = JSON.stringify(value ?? null);
  if (encoded.length > NOTEBOOK_LIMIT) return null;
  return parseNotebook(value);
}

export async function writeAccountNotebook(store: CabinetStore, rawToken: string, value: unknown): Promise<AccountResult> {
  const user = rawToken ? await store.userForToken(hashToken(rawToken)) : null;
  if (!user) return { status: 401, body: { error: 'auth' } };
  const notebook = notebookFromBody(value);
  if (!notebook) return { status: 400, body: { error: 'notebook' } };
  await store.writeNotebook(user.id, notebook);
  return { status: 200, body: { login: user.login, notebook } };
}
