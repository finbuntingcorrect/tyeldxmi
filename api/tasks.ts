import { handleTaskRequest } from '../server/tasks';

type RequestLike = {
  method?: string;
  body?: unknown;
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
};

function readBody(body: unknown): unknown {
  if (typeof body === 'string') {
    if (!body) return undefined;
    return JSON.parse(body) as unknown;
  }
  if (body instanceof Uint8Array) {
    const text = new TextDecoder().decode(body);
    return text ? (JSON.parse(text) as unknown) : undefined;
  }
  return body;
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  try {
    const result = await handleTaskRequest(req.method, readBody(req.body));
    res.status(result.status).json(result.body);
  } catch {
    res.status(400).json({ error: 'json' });
  }
}
