import { handleTasks } from '../tasks';
import { readBody, send, sessionUser, type NodeRequest, type NodeResponse } from './node';

export default async function handler(req: NodeRequest, res: NodeResponse) {
  try {
    const user = await sessionUser(req);
    if (!user) {
      send(res, 401, { error: 'auth' });
      return;
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
      send(res, 405, { error: 'method' });
      return;
    }
    const result = await handleTasks(user, req.method === 'GET' ? undefined : readBody(req.body), req.method);
    send(res, result.status, result.body, result.cookie);
  } catch {
    send(res, 500, { error: 'failed' });
  }
}
