import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { insertComment } from './server/comments';

function commentsDevApi(): Plugin {
  return {
    name: 'comments-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/comments', (req, res, next) => {
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
              const body = raw ? (JSON.parse(raw) as { comment?: unknown }) : {};
              const comment = typeof body.comment === 'string' ? body.comment : '';
              await insertComment(comment);
              res.statusCode = 201;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
            } catch (error) {
              const message = error instanceof Error ? error.message : '';
              const status = message === 'comment required' ? 400 : 500;
              res.statusCode = status;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: status === 400 ? 'comment required' : 'failed' }));
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
    plugins: [react(), tailwindcss(), commentsDevApi()],
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
