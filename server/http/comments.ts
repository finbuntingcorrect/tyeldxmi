import { insertComment } from '../comments';

type RequestLike = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  setHeader?: (name: string, value: string) => void;
  json: (body: unknown) => void;
};

function readComment(body: unknown): string {
  if (typeof body === 'string') {
    try {
      return readComment(JSON.parse(body) as unknown);
    } catch {
      return '';
    }
  }
  if (body && typeof body === 'object' && 'comment' in body) {
    const value = (body as { comment?: unknown }).comment;
    return typeof value === 'string' ? value : '';
  }
  return '';
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  try {
    await insertComment(readComment(req.body));
    res.status(201).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'comment required') {
      res.status(400).json({ error: 'comment required' });
      return;
    }
    res.status(500).json({ error: 'failed' });
  }
}
