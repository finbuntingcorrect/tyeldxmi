import { updateProfile } from '../account';
import { readBody, send, sessionUser, type NodeRequest, type NodeResponse } from './node';

export default async function handler(req: NodeRequest, res: NodeResponse) {
  try {
    const user = await sessionUser(req);
    if (!user) {
      send(res, 401, { error: 'auth' });
      return;
    }
    if (req.method === 'GET') {
      send(res, 200, { user });
      return;
    }
    if (req.method !== 'POST') {
      send(res, 405, { error: 'method' });
      return;
    }
    const body = readBody(req.body);
    const result = await updateProfile(user.id, body && typeof body === 'object' ? (body as Record<string, unknown>) : {});
    send(res, result.status, result.body);
  } catch {
    send(res, 500, { error: 'failed' });
  }
}
