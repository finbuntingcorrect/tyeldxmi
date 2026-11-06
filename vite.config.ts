import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { insertComment } from './server/comments';
import { handleTaskRequest } from './server/tasks';

function sendJson(res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/api/comments' && path !== '/api/tasks') {
          next();
          return;
        }
        if (path === '/api/tasks' && req.method === 'GET') {
          void handleTaskRequest('GET', undefined).then((result) => sendJson(res, result.status, result.body));
          return;
        }
        if (req.method !== 'POST') {
          next();
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer | string) => {
          chunks.push(Buffer.from(chunk));
        });
        req.on('end', () => {
          void (async () => {
            try {
              const raw = Buffer.concat(chunks).toString('utf8');
              const body = raw ? (JSON.parse(raw) as unknown) : {};
              if (path === '/api/comments') {
                const comment = body && typeof body === 'object' && 'comment' in body && typeof body.comment === 'string' ? body.comment : '';
                await insertComment(comment);
                sendJson(res, 201, { ok: true });
                return;
              }
              const result = await handleTaskRequest('POST', body);
              sendJson(res, result.status, result.body);
            } catch (error) {
              const message = error instanceof Error ? error.message : '';
              const status = message === 'comment required' ? 400 : 500;
              sendJson(res, status, { error: status === 400 ? 'comment required' : 'failed' });
            }
          })();
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (!process.env.DATABASE_URL && env.DATABASE_URL) {
    process.env.DATABASE_URL = env.DATABASE_URL;
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
