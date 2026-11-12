import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 32;

const LOGIN_PATTERN = /^[\p{L}\p{N}_-]+$/u;

export function normalizeLogin(value: unknown): { display: string; key: string } | null {
  if (typeof value !== 'string') return null;
  const display = value.trim();
  if (display.length < 3 || display.length > 24 || !LOGIN_PATTERN.test(display)) return null;
  return { display, key: display.toLocaleLowerCase('ru-RU') };
}

export function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 6 && value.length <= 72;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [kind, saltText, hashText] = stored.split('$');
  if (kind !== 'scrypt' || !saltText || !hashText) return false;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltText, 'base64url');
    expected = Buffer.from(hashText, 'base64url');
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length !== KEY_LENGTH) return false;
  const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return key.length === expected.length && timingSafeEqual(key, expected);
}
