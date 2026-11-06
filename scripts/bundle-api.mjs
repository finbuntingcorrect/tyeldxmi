import { build } from 'esbuild';
import { rm } from 'node:fs/promises';

const entries = ['api/tasks.ts', 'api/comments.ts'];

await build({
  entryPoints: entries,
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'api',
  outbase: 'api',
  entryNames: '[name]',
  outExtension: { '.js': '.mjs' },
});

if (process.env.VERCEL) {
  await Promise.all(entries.map((file) => rm(file, { force: true })));
}
