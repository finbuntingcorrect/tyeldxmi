import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { ServerResponse } from 'node:http';
import authHandler from './server/http/auth';
import commentsHandler from './server/http/comments';
import profileHandler from './server/http/profile';
import tasksHandler from './server/http/tasks';
import type { NodeRequest, NodeResponse } from './server/http/node';

const routes: Record<string, (req: NodeRequest, res: NodeResponse) => Promise<void>> = {
  '/api/auth': authHandler,
  '/api/profile': profileHandler,
  '/api/tasks': tasksHandler,
  '/api/comments': commentsHandler,
};

function adapt(res: ServerResponse): NodeResponse {
  let code = 200;
  return {
    status(status: number) {
      code = status;
      return this;
    },
    setHeader(name: string, value: string) {
      res.setHeader(name, value);
    },
    json(body: unknown) {
      res.statusCode = code;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(body));
    },
  };
}

function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0] || '';
        const handler = routes[path];
        if (!handler) {
          next();
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer | string) => {
          chunks.push(Buffer.from(chunk));
        });
        req.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let body: unknown;
          try {
            body = raw ? (JSON.parse(raw) as unknown) : undefined;
          } catch {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'json' }));
            return;
          }
          const request: NodeRequest = {
            method: req.method,
            url: req.url,
            headers: req.headers as NodeRequest['headers'],
            body,
          };
          void handler(request, adapt(res)).catch(() => {
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: 'failed' }));
            }
          });
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of ['DATABASE_URL', 'RESEND_API_KEY', 'EMAIL_FROM', 'APP_URL']) {
    if (!process.env[key] && env[key]) process.env[key] = env[key];
  }

  return {
    plugins: [react(), tailwindcss(), devApi()],
    server: {
      host: '127.0.0.1',
      port: 5173,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
    },
  };
});
