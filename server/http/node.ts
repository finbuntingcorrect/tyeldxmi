import { readCookie, requestIsSecure, requestOrigin, userFromToken } from '../account';

export type NodeRequest = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

export type NodeResponse = {
  status: (code: number) => NodeResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
};

export function readBody(body: unknown): unknown {
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

export function cookieHeader(req: NodeRequest) {
  return req.headers?.cookie ?? req.headers?.Cookie;
}

export async function sessionUser(req: NodeRequest) {
  return userFromToken(readCookie(cookieHeader(req), 'today_cat_session'));
}

export function secureRequest(req: NodeRequest) {
  return requestIsSecure(req.headers);
}

export function originOf(req: NodeRequest) {
  return requestOrigin(req.headers);
}

export function send(res: NodeResponse, status: number, body: unknown, cookie?: string) {
  if (cookie) res.setHeader('set-cookie', cookie);
  res.status(status).json(body);
}
