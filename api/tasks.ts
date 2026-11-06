import { handleTaskRequest } from '../server/tasks';

type RequestLike = {
  method?: string;
  body?: unknown;
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  const result = await handleTaskRequest(req.method, req.body);
  res.status(result.status).json(result.body);
}
