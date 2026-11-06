import { logout, readCookie, requestLink, userFromToken, verifyLink } from '../account';
import { cookieHeader, originOf, readBody, secureRequest, send, type NodeRequest, type NodeResponse } from './node';

export default async function handler(req: NodeRequest, res: NodeResponse) {
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
    if (input.action === 'logout') {
      const result = await logout(token, secureRequest(req));
      send(res, result.status, result.body, result.cookie);
      return;
    }
    send(res, 400, { error: 'action' });
  } catch {
    send(res, 500, { error: 'failed' });
  }
}
