export type RepeatKind = 'daily' | 'weekdays' | 'weekly';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function addDays(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekday(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function compareDate(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function occurrenceDates(input: {
  kind: RepeatKind;
  weekdays: number[];
  start: string;
  until: string | null;
  from: string;
  to: string;
}): string[] {
  if (!isDateKey(input.start) || !isDateKey(input.from) || !isDateKey(input.to)) return [];
  const end = input.until && isDateKey(input.until) && input.until < input.to ? input.until : input.to;
  let cursor = input.start > input.from ? input.start : input.from;
  if (cursor > end) return [];
  const allowed = new Set(input.weekdays.filter((day) => day >= 0 && day <= 6));
  const dates: string[] = [];
  while (cursor <= end && dates.length < 400) {
    const day = weekday(cursor);
    const include =
      input.kind === 'daily' ||
      (input.kind === 'weekdays' && day >= 1 && day <= 5) ||
      (input.kind === 'weekly' && allowed.has(day));
    if (include) dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function dateKeyInTimeZone(timeZone: string, date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function hourInTimeZone(timeZone: string, date = new Date()): number {
  const value = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(date);
  return Number(value);
}
