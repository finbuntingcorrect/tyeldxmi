import { neon } from '@neondatabase/serverless';

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

let schemaReady: Promise<void> | null = null;

function ensureSchema(sql: ReturnType<typeof getSql>) {
  schemaReady ??= sql`CREATE TABLE IF NOT EXISTS comments (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    comment text NOT NULL
  )`
    .then(() => undefined)
    .catch((error: unknown) => {
      schemaReady = null;
      throw error;
    });
  return schemaReady;
}

export async function insertComment(comment: string) {
  const trimmed = comment.trim();
  if (!trimmed || trimmed.length > 1000) throw new Error('comment required');

  const sql = getSql();
  await ensureSchema(sql);
  await sql.query('INSERT INTO comments (comment) VALUES ($1)', [trimmed]);
}
