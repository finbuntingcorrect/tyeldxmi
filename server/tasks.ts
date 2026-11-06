import { randomUUID } from 'node:crypto';
import type { Task } from '../src/types';
import { getSql } from './db';

const TITLE_LIMIT = 160;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type TaskRow = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string | Date;
  completed_at: string | Date | null;
  task_date: string | Date;
};

export type TaskResult = {
  status: number;
  body: { tasks: Task[]; moved?: number } | { error: string };
};

let schemaReady: Promise<void> | null = null;

function ensureSchema(sql: ReturnType<typeof getSql>) {
  schemaReady ??= sql`CREATE TABLE IF NOT EXISTS tasks (
    id text PRIMARY KEY,
    title text NOT NULL,
    completed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL,
    completed_at timestamptz,
    task_date date NOT NULL
  )`
    .then(() => undefined)
    .catch((error: unknown) => {
      schemaReady = null;
      throw error;
    });
  return schemaReady;
}

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function toDateKey(value: string | Date): string {
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return value.slice(0, 10);
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.completed),
    createdAt: toIso(row.created_at),
    completedAt: row.completed_at == null ? null : toIso(row.completed_at),
    date: toDateKey(row.task_date),
  };
}

async function listTasks(sql: ReturnType<typeof getSql>): Promise<Task[]> {
  const rows = await sql`SELECT id, title, completed, created_at, completed_at, task_date
    FROM tasks
    ORDER BY created_at, id`;
  return (rows as TaskRow[]).map(mapTask);
}

function trimmedTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, TITLE_LIMIT);
  return trimmed || null;
}

function dateKey(value: unknown): string | null {
  return typeof value === 'string' && DATE_PATTERN.test(value) ? value : null;
}

function isImportTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false;
  const task = value as Partial<Task>;
  return (
    typeof task.id === 'string' &&
    task.id.length > 0 &&
    task.id.length <= 80 &&
    trimmedTitle(task.title) !== null &&
    typeof task.completed === 'boolean' &&
    typeof task.createdAt === 'string' &&
    !Number.isNaN(Date.parse(task.createdAt)) &&
    (task.completedAt === null ||
      (typeof task.completedAt === 'string' && !Number.isNaN(Date.parse(task.completedAt)))) &&
    dateKey(task.date) !== null
  );
}

export async function handleTaskRequest(method: string | undefined, body: unknown): Promise<TaskResult> {
  try {
    const sql = getSql();
    await ensureSchema(sql);

    if (method === 'GET') {
      return { status: 200, body: { tasks: await listTasks(sql) } };
    }
    if (method !== 'POST' || !body || typeof body !== 'object') {
      return { status: 405, body: { error: 'method not allowed' } };
    }

    const action = (body as { action?: unknown }).action;
    if (action === 'create') {
      const title = trimmedTitle((body as { title?: unknown }).title);
      const date = dateKey((body as { date?: unknown }).date);
      if (!title || !date) return { status: 400, body: { error: 'title' } };
      await sql.query(
        `INSERT INTO tasks (id, title, completed, created_at, completed_at, task_date)
         VALUES ($1, $2, false, $3, NULL, $4)`,
        [randomUUID(), title, new Date().toISOString(), date],
      );
      return { status: 201, body: { tasks: await listTasks(sql) } };
    }

    if (action === 'toggle') {
      const id = (body as { id?: unknown }).id;
      if (typeof id !== 'string' || !id) return { status: 400, body: { error: 'id' } };
      const updated = await sql.query(
        `UPDATE tasks
         SET completed = NOT completed,
             completed_at = CASE WHEN NOT completed THEN now() ELSE NULL END
         WHERE id = $1`,
        [id],
      );
      if ((updated as unknown[]).length === 0) {
        const existing = await sql.query('SELECT id FROM tasks WHERE id = $1', [id]);
        if ((existing as unknown[]).length === 0) return { status: 404, body: { error: 'missing' } };
      }
      return { status: 200, body: { tasks: await listTasks(sql) } };
    }

    if (action === 'rename') {
      const id = (body as { id?: unknown }).id;
      const title = trimmedTitle((body as { title?: unknown }).title);
      if (typeof id !== 'string' || !id || !title) return { status: 400, body: { error: 'title' } };
      const updated = await sql.query('UPDATE tasks SET title = $2 WHERE id = $1 RETURNING id', [id, title]);
      if ((updated as unknown[]).length === 0) return { status: 404, body: { error: 'missing' } };
      return { status: 200, body: { tasks: await listTasks(sql) } };
    }

    if (action === 'delete') {
      const id = (body as { id?: unknown }).id;
      if (typeof id !== 'string' || !id) return { status: 400, body: { error: 'id' } };
      await sql.query('DELETE FROM tasks WHERE id = $1', [id]);
      return { status: 200, body: { tasks: await listTasks(sql) } };
    }

    if (action === 'carry') {
      const date = dateKey((body as { date?: unknown }).date);
      if (!date) return { status: 400, body: { error: 'date' } };
      const moved = await sql.query(
        `UPDATE tasks
         SET task_date = $1
         WHERE completed = false AND task_date < $1
         RETURNING id`,
        [date],
      );
      return { status: 200, body: { tasks: await listTasks(sql), moved: (moved as unknown[]).length } };
    }

    if (action === 'import') {
      const incoming = (body as { tasks?: unknown }).tasks;
      const tasks = Array.isArray(incoming) ? incoming.filter(isImportTask).slice(0, 500) : [];
      for (const task of tasks) {
        await sql.query(
          `INSERT INTO tasks (id, title, completed, created_at, completed_at, task_date)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [
            task.id,
            task.title.trim().slice(0, TITLE_LIMIT),
            task.completed,
            task.createdAt,
            task.completedAt,
            task.date,
          ],
        );
      }
      return { status: 200, body: { tasks: await listTasks(sql) } };
    }

    return { status: 400, body: { error: 'action' } };
  } catch {
    return { status: 500, body: { error: 'failed' } };
  }
}
