export type AppPage =
  | { name: 'calendar' }
  | { name: 'day'; date: string }
  | { name: 'habits' }
  | { name: 'focus' }
  | { name: 'settings' };

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isPageDate(value: string) {
  const match = DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function parseRoute(pathname: string): AppPage {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'calendar' };
  if (path === '/habits') return { name: 'habits' };
  if (path === '/focus') return { name: 'focus' };
  if (path === '/settings') return { name: 'settings' };
  const day = /^\/day\/(\d{4}-\d{2}-\d{2})$/.exec(path);
  if (day && isPageDate(day[1])) return { name: 'day', date: day[1] };
  return { name: 'calendar' };
}

export function pagePath(page: AppPage) {
  if (page.name === 'day') return `/day/${page.date}`;
  if (page.name === 'habits') return '/habits';
  if (page.name === 'focus') return '/focus';
  if (page.name === 'settings') return '/settings';
  return '/';
}

export function modeForPage(page: AppPage): 'habits' | 'planner' | 'focus' | null {
  if (page.name === 'habits') return 'habits';
  if (page.name === 'focus') return 'focus';
  if (page.name === 'settings') return null;
  return 'planner';
}

export function isMonthKey(value: string) {
  return /^\d{4}-\d{2}$/.test(value) && isPageDate(`${value}-01`);
}

export function calendarMonth(state: unknown, stored: string | null, today: string) {
  const fromState = state && typeof state === 'object' && 'month' in state && typeof state.month === 'string' ? state.month : '';
  if (isMonthKey(fromState)) return fromState;
  if (stored && isMonthKey(stored)) return stored;
  return today.slice(0, 7);
}
