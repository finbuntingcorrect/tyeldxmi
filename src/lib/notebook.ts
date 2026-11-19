import { addDays, isDateKey, occurrenceDates, weekday } from '../../server/recurrence.ts';
import type { DayPart, Priority, RepeatKind } from '../types';
import type { LegacyStoredTask } from '../types';
import { defaultCatPrefs, parseCatPrefs, parseFocusSession, type CatPrefs, type FocusSession } from './focusSession.ts';

export type AppMode = 'habits' | 'planner' | 'focus';
export type AppTheme = 'blue' | 'pink' | 'yellow' | 'dark';
export type HabitStatus = 'done' | 'missed';

export type SeriesRule = {
  id: string;
  title: string;
  dayPart: DayPart;
  priority: Priority;
  repeatKind: RepeatKind;
  weekdays: number[];
  start: string;
  until: string | null;
};

export type SeriesSkip = {
  seriesId: string;
  originalDate: string;
};

export type TaskDuration = 'short' | 'usual' | 'long';

export type NotebookTask = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
  date: string;
  dayPart: DayPart;
  priority: Priority;
  seriesId: string | null;
  originalDate: string | null;
  exception: boolean;
  repeatKind: RepeatKind | null;
  weekdays: number[];
  deleted: boolean;
  focusMs: number;
  note: string | null;
  duration: TaskDuration | null;
};

export type Habit = {
  id: string;
  title: string;
  repeatKind: RepeatKind;
  weekdays: number[];
  start: string;
};

export type HabitMark = {
  habitId: string;
  date: string;
  status: HabitStatus;
};

export type WeekItem = {
  id: string;
  week: string | null;
  kind: 'goal' | 'inbox';
  title: string;
  completed: boolean;
};

export type DayNote = {
  date: string;
  text: string;
};

export type Notebook = {
  version: 1;
  greeted: boolean;
  mode: AppMode | null;
  name: string;
  theme: AppTheme | null;
  focusId: string | null;
  focusSession: FocusSession | null;
  focusAt: number;
  cat: CatPrefs;
  tasks: NotebookTask[];
  series: SeriesRule[];
  skips: SeriesSkip[];
  habits: Habit[];
  marks: HabitMark[];
  weekItems: WeekItem[];
  dayNotes: DayNote[];
};

export type TaskDraft = {
  title: string;
  date: string;
  dayPart: DayPart;
  priority: Priority;
  repeatKind: RepeatKind | 'none';
  weekdays: number[];
};

const PARTS = new Set<DayPart>(['morning', 'afternoon', 'evening', 'anytime']);
const PRIORITIES = new Set<Priority>(['high', 'normal', 'low']);
const REPEATS = new Set<RepeatKind>(['daily', 'weekdays', 'weekly']);
const MODES = new Set<AppMode>(['habits', 'planner', 'focus']);
const THEMES = new Set<AppTheme>(['blue', 'pink', 'yellow', 'dark']);

export function createId() {
  return globalThis.crypto.randomUUID();
}

export function notebookIsEmpty(book: Notebook) {
  return book.tasks.every((task) => task.deleted)
    && book.series.length === 0
    && book.skips.length === 0
    && book.habits.length === 0
    && book.marks.length === 0
    && book.weekItems.length === 0
    && book.dayNotes.length === 0;
}

export function emptyNotebook(): Notebook {
  return {
    version: 1,
    greeted: false,
    mode: null,
    name: '',
    theme: null,
    focusId: null,
    focusSession: null,
    focusAt: 0,
    cat: defaultCatPrefs(),
    tasks: [],
    series: [],
    skips: [],
    habits: [],
    marks: [],
    weekItems: [],
    dayNotes: [],
  };
}

export function priorityRank(priority: Priority) {
  if (priority === 'high') return 0;
  if (priority === 'low') return 2;
  return 1;
}

export function weekDates(selected: string): string[] {
  const day = weekday(selected);
  const monday = addDays(selected, day === 0 ? -6 : 1 - day);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function monthGrid(anchor: string): string[] {
  const first = `${anchor.slice(0, 7)}-01`;
  if (!isDateKey(anchor) || !isDateKey(first)) return [];
  const start = weekDates(first)[0];
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function cleanWeekdays(days: number[]) {
  return [...new Set(days.filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b);
}

function occurs(kind: RepeatKind, days: number[], start: string, until: string | null, date: string) {
  return occurrenceDates({ kind, weekdays: days, start, until, from: date, to: date }).length === 1;
}

export function materialize(book: Notebook, from: string, to: string, now = new Date().toISOString()): Notebook {
  if (!isDateKey(from) || !isDateKey(to) || from > to) return book;
  const tasks = [...book.tasks];
  for (const rule of book.series) {
    const dates = occurrenceDates({
      kind: rule.repeatKind,
      weekdays: rule.weekdays,
      start: rule.start,
      until: rule.until,
      from,
      to,
    });
    for (const original of dates) {
      const taken = tasks.some((task) => task.seriesId === rule.id && task.originalDate === original)
        || book.skips.some((skip) => skip.seriesId === rule.id && skip.originalDate === original);
      if (taken) continue;
      tasks.push({
        id: createId(),
        title: rule.title,
        completed: false,
        createdAt: now,
        completedAt: null,
        date: original,
        dayPart: rule.dayPart,
        priority: rule.priority,
        seriesId: rule.id,
        originalDate: original,
        exception: false,
        repeatKind: rule.repeatKind,
        weekdays: rule.weekdays,
        deleted: false,
        focusMs: 0,
        note: null,
        duration: null,
      });
    }
  }
  return { ...book, tasks };
}

export type ReturnRow = {
  key: string;
  title: string;
  seriesId: string | null;
  tasks: NotebookTask[];
};

export function returnRows(book: Notebook, today: string): ReturnRow[] {
  if (!isDateKey(today)) return [];
  const cutoff = addDays(today, -2);
  const open = book.tasks.filter((task) => !task.deleted && !task.completed && task.date <= cutoff);
  const grouped = new Map<string, NotebookTask[]>();
  const singles: NotebookTask[] = [];
  for (const task of open) {
    if (!task.seriesId) {
      singles.push(task);
      continue;
    }
    const list = grouped.get(task.seriesId) ?? [];
    list.push(task);
    grouped.set(task.seriesId, list);
  }
  const rows: ReturnRow[] = [];
  for (const [seriesId, tasks] of grouped) {
    tasks.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    const rule = book.series.find((item) => item.id === seriesId);
    rows.push({ key: seriesId, title: rule?.title || tasks[0].title, seriesId, tasks });
  }
  singles.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const task of singles) rows.push({ key: task.id, title: task.title, seriesId: null, tasks: [task] });
  rows.sort((a, b) => a.tasks[0].date.localeCompare(b.tasks[0].date) || a.title.localeCompare(b.title, 'ru'));
  return rows;
}

export function bringReturnRow(book: Notebook, today: string, key: string): Notebook {
  const row = returnRows(book, today).find((item) => item.key === key);
  if (!row || !isDateKey(today)) return book;
  const nearest = [...row.tasks].sort((a, b) => b.date.localeCompare(a.date))[0];
  let next = moveTask(book, nearest.id, today);
  for (const task of row.tasks) {
    if (task.id === nearest.id) continue;
    next = skipThisOccurrence(next, task.id);
  }
  return next;
}

export function tasksForDate(book: Notebook, date: string) {
  return book.tasks
    .filter((task) => !task.deleted && task.date === date)
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function habitSpan(start: string): string[] {
  if (!isDateKey(start)) return [];
  return Array.from({ length: 30 }, (_, index) => addDays(start, index));
}

export function trackerProgressLabel(done: number) {
  return `${done} из 30 дней выполнено`;
}

export function habitProgressLabel(done: number, total: number) {
  const noun = total % 10 === 1 && total % 100 !== 11 ? 'привычки' : 'привычек';
  const verb = done % 10 === 1 && done % 100 !== 11 ? 'выполнена' : 'выполнено';
  return `${done} из ${total} ${noun} ${verb}`;
}

export function habitsForDate(book: Notebook, date: string) {
  return book.habits
    .filter((habit) => occurs(habit.repeatKind, habit.weekdays, habit.start, null, date))
    .map((habit) => ({
      habit,
      status: book.marks.find((mark) => mark.habitId === habit.id && mark.date === date)?.status ?? null,
    }));
}

export function personName(name: string, login = ''): string {
  const value = name.trim();
  if (!value) return '';
  const mail = login.trim().toLowerCase();
  if (mail && value.toLowerCase() === mail) return '';
  if (value.includes('@')) return '';
  return value;
}

export function chooseMode(book: Notebook, mode: AppMode): Notebook {
  return { ...book, greeted: true, mode };
}

export function setName(book: Notebook, name: string): Notebook {
  const next = name.trim().slice(0, 40);
  if (!next || next.includes('@')) return book;
  return { ...book, name: next };
}

export function setTheme(book: Notebook, theme: AppTheme): Notebook {
  return { ...book, theme };
}

export function addWeekItem(book: Notebook, week: string, kind: WeekItem['kind'], title: string): Notebook {
  const name = title.trim().slice(0, 160);
  if (!name || !isDateKey(week) || (kind !== 'goal' && kind !== 'inbox')) return book;
  return { ...book, weekItems: [...book.weekItems, { id: createId(), week, kind, title: name, completed: false }] };
}

export function toggleWeekItem(book: Notebook, id: string): Notebook {
  return {
    ...book,
    weekItems: book.weekItems.map((item) => item.id === id ? { ...item, completed: !item.completed } : item),
  };
}

export function assignWeekItem(book: Notebook, id: string, date: string, now = new Date().toISOString()): Notebook {
  const item = book.weekItems.find((entry) => entry.id === id && entry.kind === 'inbox');
  if (!item || !isDateKey(date)) return book;
  const next = createTask(
    { ...book, weekItems: book.weekItems.filter((entry) => entry.id !== id) },
    { title: item.title, date, dayPart: 'anytime', priority: 'normal', repeatKind: 'none', weekdays: [] },
    now,
  );
  if (!item.completed) return next;
  const created = [...next.tasks].reverse().find((task) => task.title === item.title && task.date === date && !task.deleted && !task.completed);
  return created ? toggleTask(next, created.id, now) : next;
}

export function createTask(book: Notebook, draft: TaskDraft, now = new Date().toISOString()): Notebook {
  const title = draft.title.trim().slice(0, 160);
  if (!title || !isDateKey(draft.date)) return book;
  const weekdays = cleanWeekdays(draft.weekdays);
  if (draft.repeatKind === 'weekly' && weekdays.length === 0) return book;
  if (draft.repeatKind === 'none') {
    return {
      ...book,
      tasks: [...book.tasks, {
        id: createId(),
        title,
        completed: false,
        createdAt: now,
        completedAt: null,
        date: draft.date,
        dayPart: draft.dayPart,
        priority: draft.priority,
        seriesId: null,
        originalDate: draft.date,
        exception: false,
        repeatKind: null,
        weekdays: [],
        deleted: false,
        focusMs: 0,
        note: null,
        duration: null,
      }],
    };
  }
  const seriesId = createId();
  const series: SeriesRule = {
    id: seriesId,
    title,
    dayPart: draft.dayPart,
    priority: draft.priority,
    repeatKind: draft.repeatKind,
    weekdays,
    start: draft.date,
    until: null,
  };
  return materialize({ ...book, series: [...book.series, series] }, draft.date, addDays(draft.date, 120), now);
}

export function toggleTask(book: Notebook, id: string, now = new Date().toISOString()): Notebook {
  return {
    ...book,
    tasks: book.tasks.map((task) => {
      if (task.id !== id || task.deleted) return task;
      const completed = !task.completed;
      return { ...task, completed, completedAt: completed ? now : null };
    }),
  };
}

export function moveTask(book: Notebook, id: string, date: string): Notebook {
  if (!isDateKey(date)) return book;
  const task = book.tasks.find((item) => item.id === id && !item.deleted);
  if (!task) return book;
  return {
    ...book,
    focusId: book.focusId === id && date !== task.date ? null : book.focusId,
    tasks: book.tasks.map((item) => item.id === id ? { ...item, date, exception: true } : item),
  };
}

export function dismissTask(book: Notebook, id: string): Notebook {
  const task = book.tasks.find((item) => item.id === id && !item.deleted);
  if (!task) return book;
  if (task.seriesId) return skipThisOccurrence(book, id);
  return {
    ...book,
    focusId: book.focusId === id ? null : book.focusId,
    tasks: book.tasks.map((item) => item.id === id ? { ...item, deleted: true } : item),
  };
}

export function deferTask(book: Notebook, id: string): Notebook {
  const task = book.tasks.find((item) => item.id === id && !item.deleted);
  const title = task?.title.trim().slice(0, 160);
  if (!task || !title) return book;
  return {
    ...book,
    focusId: book.focusId === id ? null : book.focusId,
    tasks: book.tasks.map((item) => item.id === id ? { ...item, deleted: true } : item),
    weekItems: [...book.weekItems, { id: createId(), week: null, kind: 'inbox', title, completed: false }],
  };
}

export function claimWeekItem(book: Notebook, id: string, week: string): Notebook {
  if (!isDateKey(week)) return book;
  return {
    ...book,
    weekItems: book.weekItems.map((item) => item.id === id && item.week == null && item.kind === 'inbox' ? { ...item, week } : item),
  };
}

export function setTaskDuration(book: Notebook, id: string, duration: TaskDuration | null): Notebook {
  if (duration !== null && duration !== 'short' && duration !== 'usual' && duration !== 'long') return book;
  return {
    ...book,
    tasks: book.tasks.map((task) => task.id === id ? { ...task, duration } : task),
  };
}

export function searchTasks(book: Notebook, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return book.tasks.filter((task) => !task.deleted && (
    task.title.toLowerCase().includes(needle) || (task.note ?? '').toLowerCase().includes(needle)
  ));
}

export function setDayNote(book: Notebook, date: string, text: string): Notebook {
  const note = text.trim().slice(0, 160);
  const rest = book.dayNotes.filter((item) => item.date !== date);
  if (!note || !isDateKey(date)) return { ...book, dayNotes: rest };
  return { ...book, dayNotes: [...rest, { date, text: note }] };
}

export function skipThisOccurrence(book: Notebook, id: string): Notebook {
  const task = book.tasks.find((item) => item.id === id && !item.deleted);
  if (!task) return book;
  const cleared = book.focusId === id ? null : book.focusId;
  if (!task.seriesId) {
    return {
      ...book,
      focusId: cleared,
      tasks: book.tasks.map((item) => item.id === id ? { ...item, deleted: true } : item),
    };
  }
  const originalDate = task.originalDate || task.date;
  const listed = book.skips.some((skip) => skip.seriesId === task.seriesId && skip.originalDate === originalDate);
  return {
    ...book,
    focusId: cleared,
    skips: listed ? book.skips : [...book.skips, { seriesId: task.seriesId, originalDate }],
    tasks: book.tasks.map((item) => item.id === id ? { ...item, deleted: true } : item),
  };
}

export function carryOpenTasks(book: Notebook, from: string, to: string): Notebook {
  if (!isDateKey(from) || !isDateKey(to) || from === to) return book;
  return tasksForDate(book, from)
    .filter((task) => !task.completed)
    .reduce((next, task) => moveTask(next, task.id, to), book);
}

export function setFocus(book: Notebook, id: string | null, today: string): Notebook {
  if (id == null) return { ...book, focusId: null };
  const task = book.tasks.find((item) => item.id === id && !item.deleted && item.date === today);
  if (!task) return book;
  return { ...book, focusId: id };
}

export function setTaskPriority(book: Notebook, id: string, priority: Priority): Notebook {
  return {
    ...book,
    tasks: book.tasks.map((task) => task.id === id ? { ...task, priority, exception: true } : task),
  };
}

export function setTaskNote(book: Notebook, id: string, text: string): Notebook {
  const note = text.trim().slice(0, 120);
  return {
    ...book,
    tasks: book.tasks.map((task) => task.id === id ? { ...task, note: note || null } : task),
  };
}

export function setTaskPart(book: Notebook, id: string, dayPart: DayPart): Notebook {
  return {
    ...book,
    tasks: book.tasks.map((task) => task.id === id ? { ...task, dayPart, exception: true } : task),
  };
}

export function updateTask(book: Notebook, id: string, draft: TaskDraft, scope: 'one' | 'future', now = new Date().toISOString()): Notebook {
  const title = draft.title.trim().slice(0, 160);
  const task = book.tasks.find((item) => item.id === id && !item.deleted);
  if (!task || !title || !isDateKey(draft.date)) return book;
  const weekdays = cleanWeekdays(draft.weekdays);
  const repeat = draft.repeatKind;
  if (repeat === 'weekly' && weekdays.length === 0) return book;
  const patch = (item: NotebookTask, extra: Partial<NotebookTask> = {}): NotebookTask => ({
    ...item,
    title,
    dayPart: draft.dayPart,
    priority: draft.priority,
    date: draft.date,
    exception: true,
    ...extra,
  });

  if (scope === 'one' || !task.seriesId) {
    let next: Notebook = { ...book, tasks: book.tasks.map((item) => item.id === id ? patch(item) : item) };
    if (!task.seriesId && repeat !== 'none') {
      const seriesId = createId();
      next = {
        ...next,
        series: [...next.series, {
          id: seriesId,
          title,
          dayPart: draft.dayPart,
          priority: draft.priority,
          repeatKind: repeat,
          weekdays,
          start: task.originalDate || task.date,
          until: null,
        }],
        tasks: next.tasks.map((item) => item.id === id ? { ...item, seriesId, originalDate: item.originalDate || item.date, repeatKind: repeat, weekdays } : item),
      };
      return materialize(next, draft.date, addDays(draft.date, 120), now);
    }
    if (task.seriesId && repeat === 'none') {
      return {
        ...next,
        skips: [...next.skips, { seriesId: task.seriesId, originalDate: task.originalDate || task.date }],
        tasks: next.tasks.map((item) => item.id === id ? { ...patch(item), seriesId: null, repeatKind: null, weekdays: [] } : item),
      };
    }
    return next;
  }

  const original = task.originalDate || task.date;
  const samePattern = repeat !== 'none' && repeat === task.repeatKind && weekdays.join(',') === task.weekdays.join(',');
  if (samePattern) {
    return {
      ...book,
      series: book.series.map((rule) => rule.id === task.seriesId ? { ...rule, title, dayPart: draft.dayPart, priority: draft.priority } : rule),
      tasks: book.tasks.map((item) => {
        if (item.id === id) return { ...patch(item), exception: draft.date !== original };
        if (item.seriesId === task.seriesId && item.originalDate && item.originalDate >= original && !item.exception && !item.completed && !item.deleted) {
          return { ...item, title, dayPart: draft.dayPart, priority: draft.priority };
        }
        return item;
      }),
    };
  }

  const until = addDays(original, -1);
  let next: Notebook = {
    ...book,
    series: book.series.map((rule) => rule.id === task.seriesId ? { ...rule, until } : rule),
    tasks: book.tasks.map((item) => {
      if (item.seriesId === task.seriesId && item.originalDate && item.originalDate >= original && !item.exception && !item.completed) {
        return { ...item, deleted: true };
      }
      return item;
    }),
  };
  if (repeat === 'none') {
    next = {
      ...next,
      tasks: next.tasks.map((item) => item.id === id ? { ...patch(item), seriesId: null, repeatKind: null, weekdays: [], deleted: false } : item),
    };
    return next;
  }
  const seriesId = createId();
  next = {
    ...next,
    series: [...next.series, {
      id: seriesId,
      title,
      dayPart: draft.dayPart,
      priority: draft.priority,
      repeatKind: repeat,
      weekdays,
      start: original,
      until: null,
    }],
    tasks: next.tasks.map((item) => item.id === id ? {
      ...patch(item),
      seriesId,
      originalDate: original,
      exception: draft.date !== original,
      repeatKind: repeat,
      weekdays,
      deleted: false,
    } : item),
  };
  return materialize(next, original, addDays(original, 120), now);
}

export function createHabit(book: Notebook, title: string, repeatKind: RepeatKind, weekdays: number[], start: string): Notebook {
  const name = title.trim().slice(0, 160);
  const days = cleanWeekdays(weekdays);
  if (!name || !isDateKey(start) || !REPEATS.has(repeatKind)) return book;
  if (repeatKind === 'weekly' && days.length === 0) return book;
  return {
    ...book,
    habits: [...book.habits, { id: createId(), title: name, repeatKind, weekdays: days, start }],
  };
}

export function nextHabitStatus(status: HabitStatus | null): HabitStatus | null {
  if (status === 'done') return 'missed';
  if (status === 'missed') return null;
  return 'done';
}

export function setHabitMark(book: Notebook, habitId: string, date: string, status: HabitStatus | null): Notebook {
  if (!book.habits.some((habit) => habit.id === habitId) || !isDateKey(date)) return book;
  const marks = book.marks.filter((mark) => !(mark.habitId === habitId && mark.date === date));
  if (status) marks.push({ habitId, date, status });
  return { ...book, marks };
}

export function fromLegacyTasks(tasks: LegacyStoredTask[]): Notebook {
  const book = emptyNotebook();
  const seen = new Set<string>();
  for (const task of tasks) {
    if (seen.has(task.id) || !isDateKey(task.date)) continue;
    seen.add(task.id);
    book.tasks.push({
      id: task.id,
      title: task.title.trim(),
      completed: task.completed,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      date: task.date,
      dayPart: 'anytime',
      priority: 'normal',
      seriesId: null,
      originalDate: task.date,
      exception: false,
      repeatKind: null,
      weekdays: [],
      deleted: false,
      focusMs: 0,
      note: null,
      duration: null,
    });
  }
  return book;
}

export function applyFocus(book: Notebook, session: FocusSession | null, change?: { taskId: string; addMs?: number; focusMs?: number }, at = Date.now()): Notebook {
  const tasks = change
    ? book.tasks.map((task) => {
        if (task.id !== change.taskId) return task;
        const focusMs = typeof change.focusMs === 'number' ? change.focusMs : task.focusMs + (change.addMs ?? 0);
        return { ...task, focusMs: Math.max(0, Math.round(focusMs)) };
      })
    : book.tasks;
  return { ...book, tasks, focusSession: session, focusAt: at };
}

export function setCatPrefs(book: Notebook, cat: CatPrefs): Notebook {
  return { ...book, cat };
}

function asPart(value: unknown): DayPart {
  return typeof value === 'string' && PARTS.has(value as DayPart) ? value as DayPart : 'anytime';
}

function asPriority(value: unknown): Priority {
  return typeof value === 'string' && PRIORITIES.has(value as Priority) ? value as Priority : 'normal';
}

function asRepeat(value: unknown): RepeatKind | null {
  return typeof value === 'string' && REPEATS.has(value as RepeatKind) ? value as RepeatKind : null;
}

function asMode(value: unknown): AppMode | null {
  return typeof value === 'string' && MODES.has(value as AppMode) ? value as AppMode : null;
}

function asTheme(value: unknown): AppTheme | null {
  return typeof value === 'string' && THEMES.has(value as AppTheme) ? value as AppTheme : null;
}

export function parseNotebook(value: unknown): Notebook | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const book = emptyNotebook();
  book.greeted = raw.greeted === true;
  book.mode = asMode(raw.mode);
  book.name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 40) : '';
  book.theme = asTheme(raw.theme);
  book.focusId = typeof raw.focusId === 'string' ? raw.focusId : null;
  book.focusSession = parseFocusSession(raw.focusSession);
  book.focusAt = typeof raw.focusAt === 'number' && raw.focusAt > 0 ? raw.focusAt : 0;
  book.cat = parseCatPrefs(raw.cat);
  if (Array.isArray(raw.tasks)) {
    for (const item of raw.tasks) {
      if (!item || typeof item !== 'object') continue;
      const task = item as Record<string, unknown>;
      if (typeof task.id !== 'string' || typeof task.title !== 'string' || typeof task.date !== 'string' || !isDateKey(task.date)) continue;
      const repeat = asRepeat(task.repeatKind);
      book.tasks.push({
        id: task.id,
        title: task.title.trim().slice(0, 160),
        completed: task.completed === true,
        createdAt: typeof task.createdAt === 'string' ? task.createdAt : new Date(0).toISOString(),
        completedAt: typeof task.completedAt === 'string' ? task.completedAt : null,
        date: task.date,
        dayPart: asPart(task.dayPart),
        priority: asPriority(task.priority),
        seriesId: typeof task.seriesId === 'string' ? task.seriesId : null,
        originalDate: typeof task.originalDate === 'string' && isDateKey(task.originalDate) ? task.originalDate : task.date,
        exception: task.exception === true,
        repeatKind: repeat,
        weekdays: Array.isArray(task.weekdays) ? cleanWeekdays(task.weekdays.map(Number)) : [],
        deleted: task.deleted === true,
        focusMs: typeof task.focusMs === 'number' && task.focusMs > 0 ? Math.round(task.focusMs) : 0,
        note: typeof task.note === 'string' && task.note.trim() ? task.note.trim().slice(0, 120) : null,
        duration: task.duration === 'short' || task.duration === 'usual' || task.duration === 'long' ? task.duration : null,
      });
    }
  }
  if (Array.isArray(raw.series)) {
    for (const item of raw.series) {
      if (!item || typeof item !== 'object') continue;
      const rule = item as Record<string, unknown>;
      const repeat = asRepeat(rule.repeatKind);
      if (typeof rule.id !== 'string' || typeof rule.title !== 'string' || typeof rule.start !== 'string' || !repeat || !isDateKey(rule.start)) continue;
      book.series.push({
        id: rule.id,
        title: rule.title.trim().slice(0, 160),
        dayPart: asPart(rule.dayPart),
        priority: asPriority(rule.priority),
        repeatKind: repeat,
        weekdays: Array.isArray(rule.weekdays) ? cleanWeekdays(rule.weekdays.map(Number)) : [],
        start: rule.start,
        until: typeof rule.until === 'string' && isDateKey(rule.until) ? rule.until : null,
      });
    }
  }
  if (Array.isArray(raw.skips)) {
    for (const item of raw.skips) {
      if (!item || typeof item !== 'object') continue;
      const skip = item as Record<string, unknown>;
      if (typeof skip.seriesId === 'string' && typeof skip.originalDate === 'string' && isDateKey(skip.originalDate)) {
        book.skips.push({ seriesId: skip.seriesId, originalDate: skip.originalDate });
      }
    }
  }
  if (Array.isArray(raw.habits)) {
    for (const item of raw.habits) {
      if (!item || typeof item !== 'object') continue;
      const habit = item as Record<string, unknown>;
      const repeat = asRepeat(habit.repeatKind);
      if (typeof habit.id !== 'string' || typeof habit.title !== 'string' || typeof habit.start !== 'string' || !repeat || !isDateKey(habit.start)) continue;
      book.habits.push({
        id: habit.id,
        title: habit.title.trim().slice(0, 160),
        repeatKind: repeat,
        weekdays: Array.isArray(habit.weekdays) ? cleanWeekdays(habit.weekdays.map(Number)) : [],
        start: habit.start,
      });
    }
  }
  if (Array.isArray(raw.marks)) {
    for (const item of raw.marks) {
      if (!item || typeof item !== 'object') continue;
      const mark = item as Record<string, unknown>;
      if (typeof mark.habitId !== 'string' || typeof mark.date !== 'string' || !isDateKey(mark.date)) continue;
      if (mark.status !== 'done' && mark.status !== 'missed') continue;
      book.marks.push({ habitId: mark.habitId, date: mark.date, status: mark.status });
    }
  }
  if (Array.isArray(raw.weekItems)) {
    for (const item of raw.weekItems) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Record<string, unknown>;
      if (typeof entry.id !== 'string' || typeof entry.title !== 'string') continue;
      if (entry.kind !== 'goal' && entry.kind !== 'inbox') continue;
      const week = entry.week == null || entry.week === '' ? null : entry.week;
      if (week !== null && (typeof week !== 'string' || !isDateKey(week))) continue;
      if (week === null && entry.kind !== 'inbox') continue;
      book.weekItems.push({
        id: entry.id,
        week,
        kind: entry.kind,
        title: entry.title.trim().slice(0, 160),
        completed: entry.completed === true,
      });
    }
  }
  if (Array.isArray(raw.dayNotes)) {
    for (const item of raw.dayNotes) {
      if (!item || typeof item !== 'object') continue;
      const note = item as Record<string, unknown>;
      if (typeof note.date !== 'string' || !isDateKey(note.date) || typeof note.text !== 'string') continue;
      const text = note.text.trim().slice(0, 160);
      if (!text) continue;
      book.dayNotes.push({ date: note.date, text });
    }
  }
  if (!book.mode) book.greeted = false;
  return book;
}
