import { readCookie } from '../account';
import { cabinetStore, readAccountNotebook, writeAccountNotebook } from '../cabinet';
import { cookieHeader, readBody, send, type NodeRequest, type NodeResponse } from './node';

export default async function handler(req: NodeRequest, res: NodeResponse) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('vary', 'cookie');
  try {
    const store = await cabinetStore();
    const token = readCookie(cookieHeader(req), 'today_cat_session');
    if (req.method === 'GET') {
      const result = await readAccountNotebook(store, token);
      send(res, result.status, result.body);
      return;
    }
    if (req.method !== 'POST') {
      send(res, 405, { error: 'method' });
      return;
    }
    const body = readBody(req.body);
    const notebook = body && typeof body === 'object' ? (body as { notebook?: unknown }).notebook : undefined;
    const result = await writeAccountNotebook(store, token, notebook);
    send(res, result.status, result.body);
  } catch (error) {
    const storage = error instanceof Error && error.message === 'storage';
    send(res, storage ? 503 : 500, { error: storage ? 'storage' : 'failed' });
  }
}
