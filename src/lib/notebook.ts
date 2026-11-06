import { addDays, isDateKey, occurrenceDates, weekday } from '../../server/recurrence';
import type { DayPart, Priority, RepeatKind } from '../types';
import type { LegacyStoredTask } from '../types';

export type AppMode = 'habits' | 'planner' | 'focus';
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

export type Notebook = {
  version: 1;
  greeted: boolean;
  mode: AppMode | null;
  focusId: string | null;
  tasks: NotebookTask[];
  series: SeriesRule[];
  skips: SeriesSkip[];
  habits: Habit[];
  marks: HabitMark[];
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

export function createId() {
  return globalThis.crypto.randomUUID();
}

export function emptyNotebook(): Notebook {
  return {
    version: 1,
    greeted: false,
    mode: null,
    focusId: null,
    tasks: [],
    series: [],
    skips: [],
    habits: [],
    marks: [],
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
      });
    }
  }
  return { ...book, tasks };
}

export function tasksForDate(book: Notebook, date: string) {
  return book.tasks
    .filter((task) => !task.deleted && task.date === date)
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
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

export function chooseMode(book: Notebook, mode: AppMode): Notebook {
  return { ...book, greeted: true, mode };
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
    });
  }
  return book;
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

export function parseNotebook(value: unknown): Notebook | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const book = emptyNotebook();
  book.greeted = raw.greeted === true;
  book.mode = asMode(raw.mode);
  book.focusId = typeof raw.focusId === 'string' ? raw.focusId : null;
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
  if (!book.mode) book.greeted = false;
  return book;
}
