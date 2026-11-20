export type RepeatKind = 'daily' | 'weekdays' | 'weekly' | 'monthly';

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

export function monthDay(key: string): number {
  return Number(key.slice(8, 10));
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function repeatDay(year: number, month: number, wanted: number): number {
  const last = daysInMonth(year, month);
  if (wanted >= 29 && wanted > last) return last;
  return wanted;
}

function dayCount(from: string, to: string): number {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = to.split('-').map(Number);
  const start = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const end = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((end - start) / 86400000);
}

function mondayOf(key: string): string {
  const day = weekday(key);
  return addDays(key, day === 0 ? -6 : 1 - day);
}

export function occurrenceDates(input: {
  kind: RepeatKind;
  weekdays: number[];
  start: string;
  until: string | null;
  from: string;
  to: string;
  interval?: number;
  monthDay?: number | null;
}): string[] {
  if (!isDateKey(input.start) || !isDateKey(input.from) || !isDateKey(input.to)) return [];
  const end = input.until && isDateKey(input.until) && input.until < input.to ? input.until : input.to;
  let cursor = input.start > input.from ? input.start : input.from;
  if (cursor > end) return [];
  const interval = Number.isInteger(input.interval) && (input.interval ?? 1) >= 1 && (input.interval ?? 1) <= 99 ? input.interval ?? 1 : 1;
  const allowed = new Set(input.weekdays.filter((day) => day >= 0 && day <= 6));
  const wanted = input.monthDay && input.monthDay >= 1 && input.monthDay <= 31 ? input.monthDay : monthDay(input.start);
  const dates: string[] = [];
  while (cursor <= end && dates.length < 400) {
    const day = weekday(cursor);
    const [year, month, date] = cursor.split('-').map(Number);
    const months = (year - Number(input.start.slice(0, 4))) * 12 + (month - Number(input.start.slice(5, 7)));
    const include =
      (input.kind === 'daily' && dayCount(input.start, cursor) % interval === 0) ||
      (input.kind === 'weekdays' && day >= 1 && day <= 5) ||
      (input.kind === 'weekly' && allowed.has(day) && (dayCount(mondayOf(input.start), mondayOf(cursor)) / 7) % interval === 0) ||
      (input.kind === 'monthly' && months >= 0 && months % interval === 0 && date === repeatDay(year, month, wanted));
    if (include && cursor >= input.start) dates.push(cursor);
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
