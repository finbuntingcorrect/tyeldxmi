import { build } from 'esbuild';
import { rm } from 'node:fs/promises';

await build({
  entryPoints: {
    auth: 'server/http/auth.ts',
    profile: 'server/http/profile.ts',
    tasks: 'server/http/tasks.ts',
    comments: 'server/http/comments.ts',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outdir: 'api',
  entryNames: '[name]',
  footer: {
    js: 'module.exports = module.exports.default || module.exports;',
  },
});

await Promise.all([
  rm('api/tasks.ts', { force: true }),
  rm('api/comments.ts', { force: true }),
  rm('api/tasks.mjs', { force: true }),
  rm('api/comments.mjs', { force: true }),
]);
