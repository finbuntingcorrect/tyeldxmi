import { monthDay, weekday } from '../../server/recurrence.ts';
import { dateFromKey } from './date.ts';
import { WEEKDAYS } from './plannerCopy.ts';
import type { RepeatKind } from '../types.ts';

export type RepeatSchedule = {
  repeatKind: RepeatKind | 'none';
  weekdays: number[];
  interval: number;
  until: string | null;
  monthDay: number | null;
};

const WEEKDAY_PHRASE: Record<number, string> = {
  0: 'Каждое воскресенье',
  1: 'Каждый понедельник',
  2: 'Каждый вторник',
  3: 'Каждую среду',
  4: 'Каждый четверг',
  5: 'Каждую пятницу',
  6: 'Каждую субботу',
};

export function cleanInterval(value: number | null | undefined) {
  if (!Number.isInteger(value) || value == null || value < 1 || value > 99) return 1;
  return value;
}

export function cleanMonthDay(value: number | null | undefined) {
  if (!Number.isInteger(value) || value == null || value < 1 || value > 31) return null;
  return value;
}

export function noneSchedule(): RepeatSchedule {
  return { repeatKind: 'none', weekdays: [], interval: 1, until: null, monthDay: null };
}

export function normalizeSchedule(input: {
  repeatKind: RepeatKind | 'none';
  weekdays?: number[];
  interval?: number | null;
  until?: string | null;
  monthDay?: number | null;
}, anchorDate: string): RepeatSchedule {
  const interval = cleanInterval(input.interval);
  const until = input.until && /^\d{4}-\d{2}-\d{2}$/.test(input.until) ? input.until : null;
  const weekdays = [...new Set((input.weekdays ?? []).filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b);
  if (input.repeatKind === 'weekly') {
    return {
      repeatKind: 'weekly',
      weekdays: weekdays.length > 0 ? weekdays : [weekday(anchorDate)],
      interval,
      until,
      monthDay: null,
    };
  }
  if (input.repeatKind === 'monthly') {
    return {
      repeatKind: 'monthly',
      weekdays: [],
      interval,
      until,
      monthDay: cleanMonthDay(input.monthDay) ?? monthDay(anchorDate),
    };
  }
  if (input.repeatKind === 'daily' || input.repeatKind === 'weekdays') {
    return { repeatKind: input.repeatKind, weekdays: [], interval: input.repeatKind === 'weekdays' ? 1 : interval, until, monthDay: null };
  }
  return noneSchedule();
}

export function sameSchedule(left: RepeatSchedule, right: RepeatSchedule) {
  return left.repeatKind === right.repeatKind
    && left.interval === right.interval
    && left.until === right.until
    && left.monthDay === right.monthDay
    && left.weekdays.join(',') === right.weekdays.join(',');
}

export function presetSchedule(kind: 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly', date: string): RepeatSchedule {
  if (kind === 'none') return noneSchedule();
  if (kind === 'daily') return { repeatKind: 'daily', weekdays: [], interval: 1, until: null, monthDay: null };
  if (kind === 'weekdays') return { repeatKind: 'weekdays', weekdays: [], interval: 1, until: null, monthDay: null };
  if (kind === 'weekly') return { repeatKind: 'weekly', weekdays: [weekday(date)], interval: 1, until: null, monthDay: null };
  return { repeatKind: 'monthly', weekdays: [], interval: 1, until: null, monthDay: monthDay(date) };
}

function ruNoun(count: number, one: string, few: string, many: string) {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function shortDate(key: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(dateFromKey(key));
}

function weekdayNames(days: number[]) {
  return WEEKDAYS.filter((day) => days.includes(day.id)).map((day) => day.label).join(', ');
}

export function scheduleLabel(schedule: RepeatSchedule) {
  const base = baseLabel(schedule);
  if (!schedule.until) return base;
  return `${base}, до ${shortDate(schedule.until)}`;
}

function baseLabel(schedule: RepeatSchedule) {
  if (schedule.repeatKind === 'none') return 'Не повторяется';
  if (schedule.repeatKind === 'weekdays') return 'По будням';
  if (schedule.repeatKind === 'daily') {
    if (schedule.interval === 1) return 'Каждый день';
    return `Каждые ${schedule.interval} ${ruNoun(schedule.interval, 'день', 'дня', 'дней')}`;
  }
  if (schedule.repeatKind === 'monthly') {
    const day = schedule.monthDay ?? 1;
    if (schedule.interval === 1) return `Каждый месяц ${day}-го числа`;
    return `Каждые ${schedule.interval} ${ruNoun(schedule.interval, 'месяц', 'месяца', 'месяцев')}, ${day}-го числа`;
  }
  const names = weekdayNames(schedule.weekdays);
  if (schedule.interval === 1 && schedule.weekdays.length === 1) return WEEKDAY_PHRASE[schedule.weekdays[0]] ?? 'Каждую неделю';
  if (schedule.interval === 1) return names ? `Каждую неделю: ${names}` : 'Каждую неделю';
  return `Каждые ${schedule.interval} ${ruNoun(schedule.interval, 'неделю', 'недели', 'недель')}${names ? `: ${names}` : ''}`;
}

export function monthEndHint(day: number | null) {
  if (day == null || day < 29) return null;
  return 'Если в месяце нет этого числа, задача будет в последний день.';
}

export function menuChoices(date: string) {
  const monthlyDay = monthDay(date);
  return [
    { id: 'none' as const, label: 'Не повторяется', hint: null },
    { id: 'daily' as const, label: 'Каждый день', hint: null },
    { id: 'weekdays' as const, label: 'По будням', hint: null },
    { id: 'weekly' as const, label: WEEKDAY_PHRASE[weekday(date)] ?? 'Каждую неделю', hint: null },
    { id: 'monthly' as const, label: `Каждый месяц ${monthlyDay}-го числа`, hint: monthEndHint(monthlyDay) },
  ];
}
