import { readCookie, requestLink, userFromToken, verifyLink } from '../account';
import { cabinetStore, loginAccount, logoutAccount, registerAccount } from '../cabinet';
import { cookieHeader, originOf, readBody, secureRequest, send, type NodeRequest, type NodeResponse } from './node';

const attempts = new Map<string, number[]>();

function attemptKey(value: unknown) {
  if (typeof value !== 'string') return 'invalid';
  const key = value.trim().toLocaleLowerCase('ru-RU').slice(0, 24);
  return key || 'invalid';
}

function blocked(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((stamp) => now - stamp < 15 * 60 * 1000);
  attempts.set(key, recent);
  return recent.length >= 8;
}

function recordFailure(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((stamp) => now - stamp < 15 * 60 * 1000);
  recent.push(now);
  attempts.set(key, recent);
}

function privateResponse(res: NodeResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('vary', 'cookie');
}

export default async function handler(req: NodeRequest, res: NodeResponse) {
  privateResponse(res);
  try {
    const body = readBody(req.body);
    const input = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const token = readCookie(cookieHeader(req), 'today_cat_session');
    if (req.method === 'GET') {
      const user = await userFromToken(token);
      if (!user) {
        send(res, 401, { error: 'auth' });
        return;
      }
      send(res, 200, { user });
      return;
    }
    if (req.method !== 'POST') {
      send(res, 405, { error: 'method' });
      return;
    }
    if (input.action === 'register' || input.action === 'login' || input.action === 'logout') {
      const store = await cabinetStore();
      if (input.action === 'register') {
        const result = await registerAccount(store, input.login, input.password, secureRequest(req));
        send(res, result.status, result.body, result.cookie);
        return;
      }
      if (input.action === 'login') {
        const key = attemptKey(input.login);
        if (blocked(key)) {
          send(res, 429, { error: 'rate' });
          return;
        }
        const result = await loginAccount(store, input.login, input.password, secureRequest(req));
        if (result.status === 401) recordFailure(key);
        if (result.status === 200) attempts.delete(key);
        send(res, result.status, result.body, result.cookie);
        return;
      }
      const result = await logoutAccount(store, token, secureRequest(req));
      send(res, result.status, result.body, result.cookie);
      return;
    }
    if (input.action === 'request') {
      const result = await requestLink(input.email, originOf(req));
      send(res, result.status, result.body);
      return;
    }
    if (input.action === 'verify') {
      const result = await verifyLink(input.token, input.timezone, secureRequest(req));
      send(res, result.status, result.body, result.cookie);
      return;
    }
    send(res, 400, { error: 'action' });
  } catch (error) {
    const storage = error instanceof Error && error.message === 'storage';
    send(res, storage ? 503 : 500, { error: storage ? 'storage' : 'failed' });
  }
}
