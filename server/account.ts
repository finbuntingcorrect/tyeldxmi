import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { CatLook, CatRole, Occupation, Profile, Purpose } from '../src/types';
import { emptyNotebook } from '../src/lib/notebook';
import { ensureSchema } from './schema';
import { sendMagicLink } from './mail';

const OCCUPATIONS = new Set<Occupation>(['team', 'solo', 'study', 'other']);
const PURPOSES = new Set<Purpose>(['work', 'study', 'personal', 'habits', 'mix']);
const LOOKS = new Set<CatLook>(['classic', 'warm', 'sage', 'night']);
const ROLES = new Set<CatRole>(['planner', 'focus', 'habits']);

type UserRow = {
  id: string;
  email: string;
  name: string;
  timezone: string;
  occupation: string | null;
  purpose: string | null;
  cat_name: string;
  cat_look: string;
  cat_role: string;
  onboarding_done: boolean;
};

export type AccountResult = {
  status: number;
  body: Record<string, unknown>;
  cookie?: string;
};

function token() {
  return randomBytes(32).toString('base64url');
}

function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function readCookie(header: string | string[] | undefined, name: string) {
  const raw = Array.isArray(header) ? header.join(';') : header || '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

export function sessionCookie(value: string, secure: boolean, maxAge: number) {
  const parts = [
    `today_cat_session=${encodeURIComponent(value)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function header(headers: Record<string, string | string[] | undefined> | undefined, name: string) {
  if (!headers) return '';
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

export function requestIsSecure(headers: Record<string, string | string[] | undefined> | undefined) {
  const proto = header(headers, 'x-forwarded-proto');
  if (proto) return proto.split(',')[0]?.trim() === 'https';
  return process.env.VERCEL === '1';
}

export function requestOrigin(headers: Record<string, string | string[] | undefined> | undefined) {
  const configured = process.env.APP_URL?.replace(/\/$/, '');
  if (configured) return configured;
  const host = header(headers, 'x-forwarded-host') || header(headers, 'host');
  const proto = requestIsSecure(headers) ? 'https' : 'http';
  return host ? `${proto}://${host}` : 'https://tyeldxmi-seven.vercel.app';
}

function asEnum<T extends string>(value: unknown, allowed: Set<T>): T | null {
  return typeof value === 'string' && allowed.has(value as T) ? (value as T) : null;
}

export function validTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function mapUser(row: UserRow): Profile {
  return {
    id: row.id,
    email: row.email,
    name: row.name || '',
    timezone: row.timezone || 'Europe/Moscow',
    occupation: asEnum(row.occupation, OCCUPATIONS),
    purpose: asEnum(row.purpose, PURPOSES),
    catName: row.cat_name || 'Котёнок',
    catLook: asEnum(row.cat_look, LOOKS) || 'classic',
    catRole: asEnum(row.cat_role, ROLES) || 'planner',
    onboardingDone: Boolean(row.onboarding_done),
  };
}

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return '';
  const email = value.trim().toLowerCase();
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

export async function userFromToken(rawToken: string) {
  if (!rawToken) return null;
  const sql = await ensureSchema();
  const rows = await sql.query(
    `SELECT u.id, u.email, u.name, u.timezone, u.occupation, u.purpose, u.cat_name, u.cat_look, u.cat_role, u.onboarding_done
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(rawToken)],
  );
  const row = (rows as UserRow[])[0];
  return row ? mapUser(row) : null;
}

export async function requestLink(emailValue: unknown, origin: string): Promise<AccountResult> {
  const email = normalizeEmail(emailValue);
  if (!email) return { status: 400, body: { error: 'email' } };
  const sql = await ensureSchema();
  const recent = await sql.query(
    `SELECT id FROM magic_links WHERE email = $1 AND used_at IS NULL AND expires_at > now() AND expires_at > now() + interval '20 minutes'`,
    [email],
  );
  if ((recent as unknown[]).length >= 3) return { status: 200, body: { ok: true } };

  const raw = token();
  await sql.query(
    `INSERT INTO magic_links (id, email, token_hash, expires_at) VALUES ($1, $2, $3, now() + interval '30 minutes')`,
    [randomUUID(), email, hashToken(raw)],
  );
  const mail = await sendMagicLink(email, `${origin}/?magic=${encodeURIComponent(raw)}`);
  if (mail !== 'sent') {
    await sql.query('DELETE FROM magic_links WHERE token_hash = $1', [hashToken(raw)]);
    return { status: 503, body: { error: mail === 'unconfigured' ? 'mail' : 'mail_failed' } };
  }
  return { status: 200, body: { ok: true } };
}

export async function verifyLink(raw: unknown, timezoneValue: unknown, secure: boolean): Promise<AccountResult> {
  if (typeof raw !== 'string' || raw.length < 20) return { status: 400, body: { error: 'token' } };
  const timezone = typeof timezoneValue === 'string' && validTimeZone(timezoneValue) ? timezoneValue : 'Europe/Moscow';
  const sql = await ensureSchema();
  const hashed = hashToken(raw);
  const links = await sql.query(
    `UPDATE magic_links SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING email`,
    [hashed],
  );
  const email = (links as { email: string }[])[0]?.email;
  if (!email) return { status: 400, body: { error: 'token' } };

  await sql.query(
    `INSERT INTO users (id, email, timezone) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
    [randomUUID(), email, timezone],
  );
  const users = await sql.query(
    `SELECT id, email, name, timezone, occupation, purpose, cat_name, cat_look, cat_role, onboarding_done
     FROM users WHERE email = $1`,
    [email],
  );
  const user = mapUser((users as UserRow[])[0]);
  const session = token();
  await sql.query(
    `CREATE TABLE IF NOT EXISTS notebooks (
      user_id text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
  );
  await sql.query(
    `INSERT INTO notebooks (user_id, data) VALUES ($1, $2::jsonb) ON CONFLICT (user_id) DO NOTHING`,
    [user.id, JSON.stringify({ ...emptyNotebook(), name: email.slice(0, 40) })],
  );
  await sql.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, now() + interval '30 days')`,
    [randomUUID(), user.id, hashToken(session)],
  );
  return {
    status: 200,
    body: { user },
    cookie: sessionCookie(session, secure, 60 * 60 * 24 * 30),
  };
}

export async function logout(rawToken: string, secure: boolean): Promise<AccountResult> {
  if (rawToken) {
    const sql = await ensureSchema();
    await sql.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(rawToken)]);
  }
  return { status: 200, body: { ok: true }, cookie: sessionCookie('', secure, 0) };
}

export async function updateProfile(userId: string, body: Record<string, unknown>): Promise<AccountResult> {
  const sql = await ensureSchema();
  const currentRows = await sql.query(
    `SELECT id, email, name, timezone, occupation, purpose, cat_name, cat_look, cat_role, onboarding_done
     FROM users WHERE id = $1`,
    [userId],
  );
  const current = (currentRows as UserRow[])[0];
  if (!current) return { status: 401, body: { error: 'auth' } };
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : current.name;
  const catName = typeof body.catName === 'string' ? body.catName.trim().slice(0, 40) : current.cat_name;
  const timezone = typeof body.timezone === 'string' && validTimeZone(body.timezone) ? body.timezone : current.timezone;
  const occupation = body.occupation === null ? null : asEnum(body.occupation, OCCUPATIONS) ?? asEnum(current.occupation, OCCUPATIONS);
  const purpose = body.purpose === null ? null : asEnum(body.purpose, PURPOSES) ?? asEnum(current.purpose, PURPOSES);
  const catLook = asEnum(body.catLook, LOOKS) || asEnum(current.cat_look, LOOKS) || 'classic';
  const catRole = asEnum(body.catRole, ROLES) || asEnum(current.cat_role, ROLES) || 'planner';
  const onboardingDone = typeof body.onboardingDone === 'boolean' ? body.onboardingDone : Boolean(current.onboarding_done);
  const rows = await sql.query(
    `UPDATE users
     SET name = $2, timezone = $3, occupation = $4, purpose = $5, cat_name = $6, cat_look = $7, cat_role = $8, onboarding_done = $9
     WHERE id = $1
     RETURNING id, email, name, timezone, occupation, purpose, cat_name, cat_look, cat_role, onboarding_done`,
    [userId, name, timezone, occupation, purpose, catName || 'Котёнок', catLook, catRole, onboardingDone],
  );
  return { status: 200, body: { user: mapUser((rows as UserRow[])[0]) } };
}
