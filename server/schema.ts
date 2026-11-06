import { getSql } from './db';

let schemaReady: Promise<void> | null = null;

export async function ensureSchema() {
  const sql = getSql();
  schemaReady ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text NOT NULL UNIQUE,
      name text NOT NULL DEFAULT '',
      timezone text NOT NULL DEFAULT 'Europe/Moscow',
      occupation text,
      purpose text,
      cat_name text NOT NULL DEFAULT 'Котёнок',
      cat_look text NOT NULL DEFAULT 'classic',
      cat_role text NOT NULL DEFAULT 'planner',
      onboarding_done boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS magic_links (
      id text PRIMARY KEY,
      email text NOT NULL,
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      used_at timestamptz
    )`;
    await sql`CREATE TABLE IF NOT EXISTS sessions (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL
    )`;
    await sql`CREATE TABLE IF NOT EXISTS series (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      title text NOT NULL,
      day_part text NOT NULL,
      priority text NOT NULL,
      kind text NOT NULL,
      weekdays text NOT NULL DEFAULT '',
      start_date date NOT NULL,
      until_date date,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await sql`CREATE TABLE IF NOT EXISTS tasks (
      id text PRIMARY KEY,
      title text NOT NULL,
      completed boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL,
      completed_at timestamptz,
      task_date date NOT NULL
    )`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id text`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS day_part text NOT NULL DEFAULT 'anytime'`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS in_focus boolean NOT NULL DEFAULT false`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS series_id text`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS original_date date`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS exception boolean NOT NULL DEFAULT false`;
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS tasks_series_original_idx
      ON tasks (series_id, original_date)
      WHERE series_id IS NOT NULL AND original_date IS NOT NULL`;
  })().catch((error: unknown) => {
    schemaReady = null;
    throw error;
  });
  await schemaReady;
  return sql;
}
