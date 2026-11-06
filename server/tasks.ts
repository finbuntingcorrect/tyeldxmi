import { randomUUID } from 'node:crypto';
import type { DayPart, Priority, Profile, RepeatKind, Task } from '../src/types';
import type { AccountResult } from './account';
import { addDays, dateKeyInTimeZone, isDateKey, occurrenceDates } from './recurrence';
import { ensureSchema } from './schema';

const TITLE_LIMIT = 160;
const PARTS = new Set<DayPart>(['morning', 'afternoon', 'evening', 'anytime']);
const PRIORITIES = new Set<Priority>(['high', 'normal', 'low']);
const REPEATS = new Set<RepeatKind>(['daily', 'weekdays', 'weekly']);

type Sql = Awaited<ReturnType<typeof ensureSchema>>;

type TaskRow = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string | Date;
  completed_at: string | Date | null;
  task_date: string | Date;
  day_part: string;
  priority: string;
  in_focus: boolean;
  series_id: string | null;
  original_date: string | Date | null;
  exception: boolean;
  kind: string | null;
  weekdays: string | null;
};

type SeriesRow = {
  id: string;
  title: string;
  day_part: string;
  priority: string;
  kind: string;
  weekdays: string;
  start_date: string | Date;
  until_date: string | Date | null;
};

function dateKey(value: string | Date | null): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function iso(value: string | Date | null): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function partOf(value: unknown, fallback: DayPart = 'anytime'): DayPart {
  return typeof value === 'string' && PARTS.has(value as DayPart) ? (value as DayPart) : fallback;
}

function priorityOf(value: unknown, fallback: Priority = 'normal'): Priority {
  return typeof value === 'string' && PRIORITIES.has(value as Priority) ? (value as Priority) : fallback;
}

function repeatOf(value: unknown): RepeatKind | 'none' {
  if (value === 'none' || value == null) return 'none';
  return typeof value === 'string' && REPEATS.has(value as RepeatKind) ? (value as RepeatKind) : 'none';
}

function weekdaysOf(value: unknown): number[] {
  const source = Array.isArray(value) ? value : [];
  return [...new Set(source.map(Number).filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b);
}

function titleOf(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, TITLE_LIMIT);
}

function mapTask(row: TaskRow): Task {
  const kind = row.kind && REPEATS.has(row.kind as RepeatKind) ? (row.kind as RepeatKind) : null;
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.completed),
    createdAt: iso(row.created_at) || new Date().toISOString(),
    completedAt: iso(row.completed_at),
    date: dateKey(row.task_date) || '',
    dayPart: partOf(row.day_part),
    priority: priorityOf(row.priority),
    inFocus: Boolean(row.in_focus),
    seriesId: row.series_id,
    originalDate: dateKey(row.original_date),
    exception: Boolean(row.exception),
    repeatKind: kind,
    weekdays: (row.weekdays || '')
      .split(',')
      .map(Number)
      .filter((day) => day >= 0 && day <= 6),
  };
}

async function listTasks(sql: Sql, userId: string, today: string): Promise<Task[]> {
  const from = addDays(today, -14);
  const to = addDays(today, 21);
  const rows = await sql.query(
    `SELECT t.id, t.title, t.completed, t.created_at, t.completed_at, t.task_date, t.day_part, t.priority,
            t.in_focus, t.series_id, t.original_date, t.exception, s.kind, s.weekdays
     FROM tasks t
     LEFT JOIN series s ON s.id = t.series_id
     WHERE t.user_id = $1 AND t.deleted = false
       AND (
         (t.completed = false AND t.task_date < $2)
         OR t.task_date BETWEEN $3 AND $4
       )
     ORDER BY t.task_date, t.created_at, t.id`,
    [userId, today, from, to],
  );
  return (rows as TaskRow[]).map(mapTask);
}

async function materializeUser(sql: Sql, userId: string, today: string) {
  const series = (await sql.query(
    `SELECT id, title, day_part, priority, kind, weekdays, start_date, until_date
     FROM series WHERE user_id = $1`,
    [userId],
  )) as SeriesRow[];
  const from = addDays(today, -21);
  const to = addDays(today, 21);
  for (const rule of series) {
    const kind = repeatOf(rule.kind);
    if (kind === 'none') continue;
    const dates = occurrenceDates({
      kind,
      weekdays: weekdaysOf(rule.weekdays.split(',')),
      start: dateKey(rule.start_date) || today,
      until: dateKey(rule.until_date),
      from,
      to,
    });
    for (const original of dates) {
      await sql.query(
        `INSERT INTO tasks (id, title, completed, created_at, completed_at, task_date, user_id, day_part, priority, in_focus, series_id, original_date, exception, deleted)
         VALUES ($1, $2, false, now(), NULL, $3, $4, $5, $6, false, $7, $3, false, false)
         ON CONFLICT DO NOTHING`,
        [randomUUID(), rule.title, original, userId, partOf(rule.day_part), priorityOf(rule.priority), rule.id],
      );
    }
  }
}

async function ownedTask(sql: Sql, userId: string, id: string) {
  const rows = await sql.query(
    `SELECT t.id, t.title, t.completed, t.created_at, t.completed_at, t.task_date, t.day_part, t.priority,
            t.in_focus, t.series_id, t.original_date, t.exception, s.kind, s.weekdays
     FROM tasks t
     LEFT JOIN series s ON s.id = t.series_id
     WHERE t.id = $1 AND t.user_id = $2 AND t.deleted = false`,
    [id, userId],
  );
  const row = (rows as TaskRow[])[0];
  return row ? mapTask(row) : null;
}

async function snapshot(sql: Sql, user: Profile): Promise<AccountResult> {
  const today = dateKeyInTimeZone(user.timezone);
  await materializeUser(sql, user.id, today);
  const legacy = await sql.query('SELECT id FROM tasks WHERE user_id IS NULL AND deleted = false', []);
  return {
    status: 200,
    body: {
      tasks: await listTasks(sql, user.id, today),
      today,
      legacyCount: (legacy as unknown[]).length,
    },
  };
}

function payload(body: unknown) {
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
}

async function insertPlain(
  sql: Sql,
  userId: string,
  title: string,
  date: string,
  dayPart: DayPart,
  priority: Priority,
  id = randomUUID(),
) {
  await sql.query(
    `INSERT INTO tasks (id, title, completed, created_at, completed_at, task_date, user_id, day_part, priority, original_date)
     VALUES ($1, $2, false, now(), NULL, $3, $4, $5, $6, $3)`,
    [id, title, date, userId, dayPart, priority],
  );
  return id;
}

export async function handleTasks(user: Profile, body: unknown, method: string | undefined): Promise<AccountResult> {
  try {
    const sql = await ensureSchema();
    if (method === 'GET') return snapshot(sql, user);
    const input = payload(body);
    const action = input.action;

    if (action === 'create') {
      const title = titleOf(input.title);
      const date = typeof input.date === 'string' && isDateKey(input.date) ? input.date : '';
      if (!title || !date) return { status: 400, body: { error: 'title' } };
      const dayPart = partOf(input.dayPart);
      const priority = priorityOf(input.priority);
      const repeat = repeatOf(input.repeatKind);
      const days = weekdaysOf(input.weekdays);
      if (repeat === 'weekly' && days.length === 0) return { status: 400, body: { error: 'weekdays' } };
      if (repeat === 'none') {
        await insertPlain(sql, user.id, title, date, dayPart, priority);
      } else {
        const seriesId = randomUUID();
        await sql.query(
          `INSERT INTO series (id, user_id, title, day_part, priority, kind, weekdays, start_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [seriesId, user.id, title, dayPart, priority, repeat, days.join(','), date],
        );
      }
      return snapshot(sql, user);
    }

    if (action === 'toggle') {
      const id = typeof input.id === 'string' ? input.id : '';
      const updated = await sql.query(
        `UPDATE tasks
         SET completed = NOT completed,
             completed_at = CASE WHEN completed THEN NULL ELSE now() END
         WHERE id = $1 AND user_id = $2 AND deleted = false
         RETURNING id`,
        [id, user.id],
      );
      if ((updated as unknown[]).length === 0) return { status: 404, body: { error: 'missing' } };
      return snapshot(sql, user);
    }

    if (action === 'focus') {
      const id = typeof input.id === 'string' ? input.id : '';
      const task = await ownedTask(sql, user.id, id);
      if (!task) return { status: 404, body: { error: 'missing' } };
      const today = dateKeyInTimeZone(user.timezone);
      if (input.on === false) {
        await sql.query('UPDATE tasks SET in_focus = false WHERE id = $1 AND user_id = $2', [id, user.id]);
        return snapshot(sql, user);
      }
      if (task.date !== today) return { status: 400, body: { error: 'focus-date' } };
      const focused = await sql.query(
        `SELECT id FROM tasks WHERE user_id = $1 AND task_date = $2 AND in_focus = true AND deleted = false AND id <> $3`,
        [user.id, today, id],
      );
      if ((focused as unknown[]).length >= 3) return { status: 400, body: { error: 'focus-limit' } };
      await sql.query('UPDATE tasks SET in_focus = true WHERE id = $1 AND user_id = $2', [id, user.id]);
      return snapshot(sql, user);
    }

    if (action === 'move' || action === 'part' || action === 'priority') {
      const id = typeof input.id === 'string' ? input.id : '';
      const task = await ownedTask(sql, user.id, id);
      if (!task) return { status: 404, body: { error: 'missing' } };
      if (action === 'move') {
        const date = typeof input.date === 'string' && isDateKey(input.date) ? input.date : '';
        if (!date) return { status: 400, body: { error: 'date' } };
        await sql.query(
          `UPDATE tasks SET task_date = $3, exception = true, in_focus = CASE WHEN $3 = $4 THEN in_focus ELSE false END
           WHERE id = $1 AND user_id = $2`,
          [id, user.id, date, dateKeyInTimeZone(user.timezone)],
        );
      } else if (action === 'part') {
        await sql.query('UPDATE tasks SET day_part = $3, exception = true WHERE id = $1 AND user_id = $2', [
          id,
          user.id,
          partOf(input.dayPart, task.dayPart),
        ]);
      } else {
        await sql.query('UPDATE tasks SET priority = $3, exception = true WHERE id = $1 AND user_id = $2', [
          id,
          user.id,
          priorityOf(input.priority, task.priority),
        ]);
      }
      return snapshot(sql, user);
    }

    if (action === 'update') {
      const id = typeof input.id === 'string' ? input.id : '';
      const task = await ownedTask(sql, user.id, id);
      if (!task) return { status: 404, body: { error: 'missing' } };
      const title = titleOf(input.title) || task.title;
      const dayPart = partOf(input.dayPart, task.dayPart);
      const priority = priorityOf(input.priority, task.priority);
      const date = typeof input.date === 'string' && isDateKey(input.date) ? input.date : task.date;
      const scope = input.scope === 'future' ? 'future' : 'one';
      const repeat = repeatOf(input.repeatKind ?? task.repeatKind ?? 'none');
      const days = input.weekdays == null && task.repeatKind ? task.weekdays : weekdaysOf(input.weekdays);
      if (scope === 'one' || !task.seriesId) {
        await sql.query(
          `UPDATE tasks
           SET title = $3, day_part = $4, priority = $5, task_date = $6, exception = true,
               in_focus = CASE WHEN $6 = $7 THEN in_focus ELSE false END
           WHERE id = $1 AND user_id = $2`,
          [id, user.id, title, dayPart, priority, date, dateKeyInTimeZone(user.timezone)],
        );
        if (!task.seriesId && repeat !== 'none' && scope === 'future') {
          if (repeat === 'weekly' && days.length === 0) return { status: 400, body: { error: 'weekdays' } };
          const seriesId = randomUUID();
          await sql.query(
            `INSERT INTO series (id, user_id, title, day_part, priority, kind, weekdays, start_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [seriesId, user.id, title, dayPart, priority, repeat, days.join(','), task.originalDate || task.date],
          );
          await sql.query('UPDATE tasks SET series_id = $2, original_date = COALESCE(original_date, task_date) WHERE id = $1', [
            id,
            seriesId,
          ]);
        }
        return snapshot(sql, user);
      }

      const original = task.originalDate || task.date;
      const patternSame =
        repeat !== 'none' &&
        repeat === task.repeatKind &&
        days.join(',') === task.weekdays.join(',');
      if (repeat === 'weekly' && days.length === 0) return { status: 400, body: { error: 'weekdays' } };
      if (patternSame) {
        await sql.query(
          `UPDATE series SET title = $3, day_part = $4, priority = $5 WHERE id = $1 AND user_id = $2`,
          [task.seriesId, user.id, title, dayPart, priority],
        );
        await sql.query(
          `UPDATE tasks SET title = $3, day_part = $4, priority = $5
           WHERE series_id = $1 AND user_id = $2 AND original_date >= $6 AND exception = false AND completed = false AND deleted = false`,
          [task.seriesId, user.id, title, dayPart, priority, original],
        );
        await sql.query(
          `UPDATE tasks SET title = $3, day_part = $4, priority = $5, task_date = $6 WHERE id = $1 AND user_id = $2`,
          [id, user.id, title, dayPart, priority, date],
        );
        return snapshot(sql, user);
      }

      await sql.query('UPDATE series SET until_date = $3 WHERE id = $1 AND user_id = $2', [
        task.seriesId,
        user.id,
        addDays(original, -1),
      ]);
      await sql.query(
        `UPDATE tasks SET deleted = true
         WHERE series_id = $1 AND user_id = $2 AND original_date >= $3 AND completed = false AND exception = false`,
        [task.seriesId, user.id, original],
      );
      if (repeat === 'none') {
        await sql.query(
          `UPDATE tasks SET series_id = NULL, exception = true, deleted = false, title = $3, day_part = $4, priority = $5, task_date = $6
           WHERE id = $1 AND user_id = $2`,
          [id, user.id, title, dayPart, priority, date],
        );
      } else {
        const seriesId = randomUUID();
        await sql.query(
          `INSERT INTO series (id, user_id, title, day_part, priority, kind, weekdays, start_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [seriesId, user.id, title, dayPart, priority, repeat, days.join(','), original],
        );
        await sql.query(
          `UPDATE tasks SET series_id = $3, exception = $4, deleted = false, title = $5, day_part = $6, priority = $7, task_date = $8
           WHERE id = $1 AND user_id = $2`,
          [id, user.id, seriesId, date !== original, title, dayPart, priority, date],
        );
      }
      return snapshot(sql, user);
    }

    if (action === 'delete') {
      const id = typeof input.id === 'string' ? input.id : '';
      const task = await ownedTask(sql, user.id, id);
      if (!task) return { status: 404, body: { error: 'missing' } };
      if (input.scope === 'future' && task.seriesId) {
        const original = task.originalDate || task.date;
        await sql.query('UPDATE series SET until_date = $3 WHERE id = $1 AND user_id = $2', [
          task.seriesId,
          user.id,
          addDays(original, -1),
        ]);
        await sql.query(
          `UPDATE tasks SET deleted = true, in_focus = false
           WHERE user_id = $1 AND series_id = $2 AND original_date >= $3 AND completed = false`,
          [user.id, task.seriesId, original],
        );
      } else if (task.seriesId) {
        await sql.query('UPDATE tasks SET deleted = true, exception = true, in_focus = false WHERE id = $1 AND user_id = $2', [
          id,
          user.id,
        ]);
      } else {
        await sql.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [id, user.id]);
      }
      return snapshot(sql, user);
    }

    if (action === 'import') {
      const incoming = Array.isArray(input.tasks) ? input.tasks.slice(0, 500) : [];
      const saved: string[] = [];
      for (const item of incoming) {
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        const id = typeof row.id === 'string' && /^[A-Za-z0-9-]{1,80}$/.test(row.id) ? row.id : '';
        const title = titleOf(row.title);
        const date = typeof row.date === 'string' && isDateKey(row.date) ? row.date : '';
        if (!id || !title || !date || typeof row.completed !== 'boolean') continue;
        const createdAt = typeof row.createdAt === 'string' && !Number.isNaN(Date.parse(row.createdAt)) ? row.createdAt : new Date().toISOString();
        const completedAt =
          row.completedAt == null
            ? null
            : typeof row.completedAt === 'string' && !Number.isNaN(Date.parse(row.completedAt))
              ? row.completedAt
              : null;
        const inserted = await sql.query(
          `INSERT INTO tasks (id, title, completed, created_at, completed_at, task_date, user_id, day_part, priority, original_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'anytime', 'normal', $6)
           ON CONFLICT (id) DO NOTHING
           RETURNING id`,
          [id, title, row.completed, createdAt, row.completed ? completedAt : null, date, user.id],
        );
        if ((inserted as unknown[]).length > 0) saved.push(id);
        else {
          const own = await sql.query('SELECT id FROM tasks WHERE id = $1 AND user_id = $2', [id, user.id]);
          if ((own as unknown[]).length > 0) saved.push(id);
        }
      }
      const result = await snapshot(sql, user);
      return { status: 200, body: { ...result.body, importedIds: saved } };
    }

    if (action === 'claim-legacy') {
      await sql.query('UPDATE tasks SET user_id = $1 WHERE user_id IS NULL', [user.id]);
      return snapshot(sql, user);
    }

    return { status: 400, body: { error: 'action' } };
  } catch {
    return { status: 500, body: { error: 'failed' } };
  }
}
