export const FOCUS_PRESETS = [15, 20, 25, 45] as const;
export const DEFAULT_FOCUS_MINUTES = 20;
export const BREAK_MINUTES = 5;
export const MIN_FOCUS_MINUTES = 1;
export const MAX_FOCUS_MINUTES = 180;

export type FocusPhase = 'focus' | 'break';

export type FocusSession = {
  taskId: string;
  phase: FocusPhase;
  focusMinutes: number;
  durationMs: number;
  endsAt: number | null;
  pausedRemainingMs: number;
  paused: boolean;
  /** Focus time of the current slice already added to the task. */
  sliceAppliedMs: number;
  settled: boolean;
  reminded: boolean;
  signalId: string;
};

export type CatPrefs = {
  sound: boolean;
  volume: number;
  walks: boolean;
  pinned: boolean;
  hidden: boolean;
  reminders: boolean;
  x: number | null;
  y: number | null;
};

export type CatPose = 'greet' | 'sleep' | 'idle' | 'focus' | 'pause' | 'remind' | 'break' | 'success';

export function defaultCatPrefs(): CatPrefs {
  return {
    sound: false,
    volume: 0.3,
    walks: true,
    pinned: false,
    hidden: false,
    reminders: false,
    x: null,
    y: null,
  };
}

export function parseFocusMinutes(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : Number.NaN;
  if (!Number.isInteger(number) || number < MIN_FOCUS_MINUTES || number > MAX_FOCUS_MINUTES) return null;
  return number;
}

export function remainingMs(session: FocusSession, now: number): number {
  if (session.settled) return 0;
  if (session.paused || session.endsAt == null) return Math.max(0, session.pausedRemainingMs);
  return Math.max(0, session.endsAt - now);
}

export function isRunning(session: FocusSession, now: number): boolean {
  return !session.paused && !session.settled && session.endsAt != null && session.endsAt > now;
}

export function isExpired(session: FocusSession, now: number): boolean {
  return !session.paused && !session.settled && session.endsAt != null && now >= session.endsAt;
}

export function unappliedFocusMs(session: FocusSession, now: number): number {
  if (session.phase !== 'focus' || session.settled) return 0;
  const spent = session.durationMs - remainingMs(session, now);
  return Math.max(0, spent - session.sliceAppliedMs);
}

export function minutesLabel(minutes: number): string {
  const mod10 = minutes % 10;
  const mod100 = minutes % 100;
  const word = mod10 === 1 && mod100 !== 11 ? 'минута' : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'минуты' : 'минут';
  return `${minutes} ${word}`;
}

export function formatClock(ms: number): string {
  const safe = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function slice(taskId: string, phase: FocusPhase, focusMinutes: number, durationMs: number, now: number, signalId: string, reminded = false): FocusSession {
  return {
    taskId,
    phase,
    focusMinutes,
    durationMs,
    endsAt: now + durationMs,
    pausedRemainingMs: durationMs,
    paused: false,
    sliceAppliedMs: 0,
    settled: false,
    reminded,
    signalId,
  };
}

export function startFocus(taskId: string, minutes: number, now: number, signalId: string): FocusSession {
  const durationMs = minutes * 60_000;
  return slice(taskId, 'focus', minutes, durationMs, now, signalId);
}

export function pauseSession(session: FocusSession, now: number): { session: FocusSession; addMs: number } {
  if (session.paused || session.settled || session.endsAt == null) return { session, addMs: 0 };
  const addMs = unappliedFocusMs(session, now);
  const pausedRemainingMs = remainingMs(session, now);
  return {
    addMs,
    session: {
      ...session,
      paused: true,
      endsAt: null,
      pausedRemainingMs,
      sliceAppliedMs: session.durationMs - pausedRemainingMs,
    },
  };
}

export function resumeSession(session: FocusSession, now: number): FocusSession {
  if (!session.paused || session.settled) return session;
  const durationMs = Math.max(0, session.pausedRemainingMs);
  return {
    ...session,
    paused: false,
    durationMs,
    pausedRemainingMs: durationMs,
    endsAt: now + durationMs,
    sliceAppliedMs: 0,
  };
}

export function settleSession(session: FocusSession, now: number): { session: FocusSession; addMs: number } {
  if (session.settled) return { session, addMs: 0 };
  if (!isExpired(session, now)) return { session, addMs: 0 };
  const addMs = unappliedFocusMs(session, now);
  return {
    addMs,
    session: {
      ...session,
      settled: true,
      pausedRemainingMs: 0,
      sliceAppliedMs: session.phase === 'focus' ? session.durationMs : session.sliceAppliedMs,
    },
  };
}

export function finishEarly(session: FocusSession, now: number): { session: FocusSession; addMs: number } {
  if (session.settled) return { session, addMs: 0 };
  const addMs = unappliedFocusMs(session, now);
  return {
    addMs,
    session: {
      ...session,
      settled: true,
      paused: true,
      endsAt: null,
      pausedRemainingMs: 0,
      sliceAppliedMs: session.phase === 'focus' ? session.durationMs : session.sliceAppliedMs,
    },
  };
}

export function startBreak(session: FocusSession, now: number, signalId: string): FocusSession {
  return slice(session.taskId, 'break', session.focusMinutes, BREAK_MINUTES * 60_000, now, signalId, true);
}

export function startAnother(session: FocusSession, now: number, signalId: string): FocusSession {
  return slice(session.taskId, 'focus', session.focusMinutes, session.focusMinutes * 60_000, now, signalId);
}

export function reminderDue(session: FocusSession, now: number, enabled: boolean): boolean {
  if (!enabled || session.reminded || session.phase !== 'focus' || session.paused || session.settled) return false;
  const left = remainingMs(session, now);
  if (left <= 0) return false;
  const elapsed = session.durationMs - left;
  return elapsed >= session.durationMs / 2;
}

export function markReminded(session: FocusSession): FocusSession {
  return { ...session, reminded: true };
}

export function sessionActive(session: FocusSession | null): boolean {
  return session != null && !session.settled;
}

export function catPose(input: {
  greeting: boolean;
  openTasks: boolean;
  taskSuccess: boolean;
  remindVisible: boolean;
  session: FocusSession | null;
  now: number;
}): CatPose {
  const { session } = input;
  if (input.remindVisible) return 'remind';
  if (session && session.phase === 'focus' && isRunning(session, input.now)) return 'focus';
  if (session && session.phase === 'focus' && session.paused && !session.settled) return 'pause';
  if (session && session.phase === 'break' && !session.settled) return 'break';
  if (session && session.settled && session.phase === 'focus') return 'success';
  if (session && session.settled && session.phase === 'break') return 'break';
  if (input.taskSuccess) return 'success';
  if (input.greeting) return 'greet';
  if (!input.openTasks) return 'sleep';
  return 'idle';
}

export function clampCatPosition(x: number, y: number, width: number, height: number, size: number, top: number, bottom: number) {
  const maxX = Math.max(top, width - size - 8);
  const maxY = Math.max(top, height - size - bottom);
  return {
    x: Math.min(maxX, Math.max(8, x)),
    y: Math.min(maxY, Math.max(top, y)),
  };
}

export function parseFocusSession(value: unknown): FocusSession | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const focusMinutes = parseFocusMinutes(raw.focusMinutes);
  const durationMs = typeof raw.durationMs === 'number' && raw.durationMs >= 0 ? raw.durationMs : null;
  if (!focusMinutes || durationMs == null || typeof raw.taskId !== 'string' || typeof raw.signalId !== 'string') return null;
  if (raw.phase !== 'focus' && raw.phase !== 'break') return null;
  return {
    taskId: raw.taskId,
    phase: raw.phase,
    focusMinutes,
    durationMs,
    endsAt: typeof raw.endsAt === 'number' ? raw.endsAt : null,
    pausedRemainingMs: typeof raw.pausedRemainingMs === 'number' ? Math.max(0, raw.pausedRemainingMs) : durationMs,
    paused: raw.paused === true,
    sliceAppliedMs: typeof raw.sliceAppliedMs === 'number' ? Math.max(0, raw.sliceAppliedMs) : 0,
    settled: raw.settled === true,
    reminded: raw.reminded === true,
    signalId: raw.signalId,
  };
}

export function parseCatPrefs(value: unknown): CatPrefs {
  const base = defaultCatPrefs();
  if (!value || typeof value !== 'object') return base;
  const raw = value as Record<string, unknown>;
  const volume = typeof raw.volume === 'number' ? Math.min(1, Math.max(0, raw.volume)) : base.volume;
  return {
    sound: raw.sound === true,
    volume,
    walks: raw.walks !== false,
    pinned: raw.pinned === true,
    hidden: raw.hidden === true,
    reminders: raw.reminders === true,
    x: typeof raw.x === 'number' ? raw.x : null,
    y: typeof raw.y === 'number' ? raw.y : null,
  };
}
