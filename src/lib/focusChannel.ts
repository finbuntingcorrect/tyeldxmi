import { parseFocusSession, type FocusSession } from './focusSession';

const TAB_ID = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `tab-${Date.now()}`;

export type FocusLive = {
  at: number;
  session: FocusSession | null;
  focus?: { taskId: string; focusMs: number };
};

function liveKey(login: string) {
  return `today-cat.focus.${login}`;
}

function leaderKey(login: string) {
  return `today-cat.leader.${login}`;
}

function signalKey(signalId: string) {
  return `today-cat.signal.${signalId}`;
}

export function readLive(login: string): FocusLive | null {
  if (!login) return null;
  try {
    const raw = JSON.parse(localStorage.getItem(liveKey(login)) || 'null') as FocusLive | null;
    if (!raw || typeof raw.at !== 'number') return null;
    return { at: raw.at, session: raw.session ? parseFocusSession(raw.session) : null, focus: raw.focus };
  } catch {
    return null;
  }
}

export function writeLive(login: string, live: FocusLive) {
  if (!login) return;
  localStorage.setItem(liveKey(login), JSON.stringify(live));
}

export function takeLead(login: string, force = false): boolean {
  if (!login) return false;
  const key = leaderKey(login);
  const now = Date.now();
  let current: { tab?: string; at?: number } | null = null;
  try {
    current = JSON.parse(localStorage.getItem(key) || 'null') as { tab?: string; at?: number } | null;
  } catch {
    /* a damaged leader record just means this tab may take over */
  }
  const fresh = current?.tab && current.tab !== TAB_ID && typeof current.at === 'number' && now - current.at < 4000;
  if (!force && fresh) return false;
  localStorage.setItem(key, JSON.stringify({ tab: TAB_ID, at: now }));
  return true;
}

export async function claimSignal(signalId: string): Promise<boolean> {
  const key = signalKey(signalId);
  const take = () => {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, TAB_ID);
    return localStorage.getItem(key) === TAB_ID;
  };
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(`today-cat-${signalId}`, { ifAvailable: true }, async (lock) => {
      if (!lock) return false;
      return take();
    });
  }
  return take();
}
