export type AppPage =
  | { name: 'landing' }
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'forgot' }
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

export function isPlannerPage(page: AppPage) {
  return page.name === 'calendar' || page.name === 'day' || page.name === 'habits' || page.name === 'focus' || page.name === 'settings';
}

export function parseRoute(pathname: string): AppPage {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { name: 'landing' };
  if (path === '/login') return { name: 'login' };
  if (path === '/signup') return { name: 'signup' };
  if (path === '/forgot-password') return { name: 'forgot' };
  if (path === '/app' || path === '/calendar') return { name: 'calendar' };
  if (path === '/app/habits' || path === '/habits') return { name: 'habits' };
  if (path === '/app/focus' || path === '/focus') return { name: 'focus' };
  if (path === '/app/settings' || path === '/settings') return { name: 'settings' };
  const day = /^\/(?:app\/)?day\/(\d{4}-\d{2}-\d{2})$/.exec(path);
  if (day && isPageDate(day[1])) return { name: 'day', date: day[1] };
  return { name: 'landing' };
}

export function pagePath(page: AppPage) {
  if (page.name === 'landing') return '/';
  if (page.name === 'login') return '/login';
  if (page.name === 'signup') return '/signup';
  if (page.name === 'forgot') return '/forgot-password';
  if (page.name === 'day') return `/app/day/${page.date}`;
  if (page.name === 'habits') return '/app/habits';
  if (page.name === 'focus') return '/app/focus';
  if (page.name === 'settings') return '/app/settings';
  return '/app';
}

export function modeForPage(page: AppPage): 'habits' | 'planner' | 'focus' | null {
  if (page.name === 'habits') return 'habits';
  if (page.name === 'focus') return 'focus';
  if (page.name === 'calendar' || page.name === 'day') return 'planner';
  return null;
}

export function isMonthKey(value: string) {
  return /^\d{4}-\d{2}$/.test(value) && isPageDate(`${value}-01`);
}

export function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || raw.includes('://')) return null;
  let url: URL;
  try {
    url = new URL(raw, 'http://today-cat.local');
  } catch {
    return null;
  }
  if (url.origin !== 'http://today-cat.local') return null;
  const page = parseRoute(url.pathname);
  if (!isPlannerPage(page)) return null;
  return pagePath(page);
}

export function withSearch(path: string) {
  const queryAt = path.indexOf('?');
  const pathname = queryAt === -1 ? path : path.slice(0, queryAt);
  const search = queryAt === -1 ? '' : path.slice(queryAt + 1);
  const canonical = pagePath(parseRoute(pathname));
  const next = safeNext(new URLSearchParams(search).get('next'));
  if (!next) return canonical;
  return `${canonical}?next=${encodeURIComponent(next)}`;
}
