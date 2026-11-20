export const FOCUS_PRESETS = [20, 25, 45] as const;
export const DEFAULT_FOCUS_MINUTES = 20;
export const BREAK_MINUTES = 5;
export const LONG_BREAK_MINUTES = 15;
export const DEFAULT_ROUNDS = 4;
export const MIN_FOCUS_MINUTES = 1;
export const MAX_FOCUS_MINUTES = 180;
export const AUTO_ADVANCE_WINDOW_MS = 5_000;

export type FocusPhase = 'focus' | 'break';
export type BreakKind = 'short' | 'long';
export type PhaseChoice = 'focus' | BreakKind;

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
  /** True only when the phase reached 00:00. An early finish stays false. */
  full: boolean;
  plannedBreak: BreakKind;
  reminded: boolean;
  signalId: string;
};

export type FocusChange = {
  taskId: string;
  addMs?: number;
  focusMs?: number;
  resetCycle?: boolean;
};

export type TreatKind = 'whiskas' | 'sheba';

export type TreatDay = {
  date: string;
  whiskas: boolean;
  sheba: boolean;
};

export const WHISKAS_MS = 20 * 60_000;
export const SHEBA_MS = 40 * 60_000;

/** One frame of the 3×2 treat sheet. Eating frames repeat, then lick and the happy pose. */
export const TREAT_FRAMES: { frame: number; ms: number }[] = [
  { frame: 0, ms: 420 },
  { frame: 1, ms: 480 },
  { frame: 2, ms: 380 },
  { frame: 3, ms: 380 },
  { frame: 2, ms: 380 },
  { frame: 3, ms: 380 },
  { frame: 2, ms: 380 },
  { frame: 4, ms: 560 },
  { frame: 5, ms: 1140 },
];

export type CatPrefs = {
  sound: boolean;
  volume: number;
  walks: boolean;
  pinned: boolean;
  hidden: boolean;
  reminders: boolean;
  x: number | null;
  y: number | null;
  pomodoroMinutes: number;
  shortMinutes: number;
  longMinutes: number;
  rounds: number;
  autoStart: boolean;
  focusDate: string;
  focusCompleted: number;
  focusMsToday: number;
  focusCycle: number;
  treats: TreatDay[];
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
    pomodoroMinutes: DEFAULT_FOCUS_MINUTES,
    shortMinutes: BREAK_MINUTES,
    longMinutes: LONG_BREAK_MINUTES,
    rounds: DEFAULT_ROUNDS,
    autoStart: false,
    focusDate: '',
    focusCompleted: 0,
    focusMsToday: 0,
    focusCycle: 0,
    treats: [],
  };
}

export function treatDurationMs() {
  return TREAT_FRAMES.reduce((sum, item) => sum + item.ms, 0);
}

export function parseTreats(value: unknown): TreatDay[] {
  if (!Array.isArray(value)) return [];
  const days: TreatDay[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    if (typeof raw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) continue;
    days.push({ date: raw.date, whiskas: raw.whiskas === true, sheba: raw.sheba === true });
  }
  return days;
}

export function treatDay(cat: CatPrefs, date: string): TreatDay {
  return cat.treats.find((item) => item.date === date) ?? { date, whiskas: false, sheba: false };
}

export function feedTreat(cat: CatPrefs, date: string, kind: TreatKind): CatPrefs {
  const current = treatDay(cat, date);
  if (current[kind]) return cat;
  const next = { ...current, [kind]: true };
  const treats = cat.treats.some((item) => item.date === date)
    ? cat.treats.map((item) => (item.date === date ? next : item))
    : [...cat.treats, next];
  return { ...cat, treats };
}

/** Banked focus time for this date plus the current focus slice. Pauses and breaks add nothing. */
export function focusWorkedMs(cat: CatPrefs, session: FocusSession | null, now: number, today: string) {
  const banked = cat.focusDate === today ? cat.focusMsToday : 0;
  return banked + (session ? unappliedFocusMs(session, now) : 0);
}

export function treatOffer(workedMs: number, fed: { whiskas: boolean; sheba: boolean }): { line: string; available: TreatKind[] } {
  const available: TreatKind[] = [];
  if (workedMs >= WHISKAS_MS && !fed.whiskas) available.push('whiskas');
  if (workedMs >= SHEBA_MS && !fed.sheba) available.push('sheba');
  if (fed.whiskas && fed.sheba) return { line: 'Все угощения сегодня получены', available };
  const next = workedMs < WHISKAS_MS ? WHISKAS_MS : workedMs < SHEBA_MS ? SHEBA_MS : null;
  if (next == null) return { line: '', available };
  const minutes = Math.ceil((next - workedMs) / 60_000);
  return { line: `До угощения — ${minutes} мин`, available };
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
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function plannedBreakFor(cycle: number, rounds: number): BreakKind {
  const size = Math.max(1, Math.round(rounds) || DEFAULT_ROUNDS);
  return cycle + 1 >= size ? 'long' : 'short';
}

/** Circles count finished focus sessions only. An open attempt does not fill one. */
export function cycleMarks(completed: number, rounds: number, attemptOpen: boolean): { label: string; filled: number } {
  const size = Math.max(1, Math.round(rounds) || DEFAULT_ROUNDS);
  const done = Math.max(0, Math.min(size, Math.round(completed) || 0));
  if (!attemptOpen && done >= size) return { label: 'Цикл завершён', filled: size };
  const approach = attemptOpen ? Math.min(size, done + 1) : Math.max(1, done);
  return { label: `Подход ${approach} из ${size}`, filled: done };
}

export function shouldAutoAdvance(endsAt: number | null, now: number, auto: boolean): boolean {
  if (!auto || endsAt == null) return false;
  return now >= endsAt && now - endsAt <= AUTO_ADVANCE_WINDOW_MS;
}

export function countWord(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
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
    full: false,
    plannedBreak: 'short',
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
      full: true,
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
      full: false,
      paused: true,
      endsAt: null,
      pausedRemainingMs: 0,
      sliceAppliedMs: session.phase === 'focus' ? session.durationMs : session.sliceAppliedMs,
    },
  };
}

export function startBreak(session: FocusSession, now: number, signalId: string, minutes = BREAK_MINUTES, kind: BreakKind = 'short'): FocusSession {
  const next = slice(session.taskId, 'break', session.focusMinutes, Math.max(1, minutes) * 60_000, now, signalId, true);
  return { ...next, plannedBreak: kind };
}

export function startIdle(taskId: string, phase: PhaseChoice, focusMinutes: number, phaseMinutes: number, now: number, signalId: string): FocusSession {
  if (phase === 'focus') return startFocus(taskId, focusMinutes, now, signalId);
  const next = slice(taskId, 'break', focusMinutes, Math.max(1, phaseMinutes) * 60_000, now, signalId, true);
  return { ...next, plannedBreak: phase };
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

/** A phone keeps the kitten on top of the page. A reserved column squeezes the month. */
export function catFrame(width: number, height: number, bottom: number) {
  const top = 76;
  const available = Math.max(48, height - top - bottom - 12);
  if (width < 700) {
    const size = Math.min(72, available);
    return { size, top: Math.max(top, height - size - bottom), lane: 0, minX: 8, tight: true };
  }
  const tight = height < 520;
  const widthRoom = Math.max(48, width - (tight ? 232 : 336) - 20);
  const size = Math.min(tight ? 95 : 176, available, widthRoom);
  const lane = size + (tight ? 12 : 16);
  return { size, top, lane, minX: Math.max(8, width - lane + 4), tight };
}

export function clampCatPosition(x: number, y: number, width: number, height: number, size: number, top: number, bottom: number, minX = 8) {
  const maxX = Math.max(minX, width - size - 8);
  const maxY = Math.max(top, height - size - bottom);
  return {
    x: Math.min(maxX, Math.max(minX, x)),
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
    full: typeof raw.full === 'boolean' ? raw.full : raw.settled === true && raw.paused !== true,
    plannedBreak: raw.plannedBreak === 'long' ? 'long' : 'short',
    reminded: raw.reminded === true,
    signalId: raw.signalId,
  };
}

function storedMinutes(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : fallback;
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
    pomodoroMinutes: storedMinutes(raw.pomodoroMinutes, base.pomodoroMinutes, MIN_FOCUS_MINUTES, MAX_FOCUS_MINUTES),
    shortMinutes: storedMinutes(raw.shortMinutes, base.shortMinutes, 1, 60),
    longMinutes: storedMinutes(raw.longMinutes, base.longMinutes, 1, 60),
    rounds: storedMinutes(raw.rounds, base.rounds, 1, 8),
    autoStart: raw.autoStart === true,
    focusDate: typeof raw.focusDate === 'string' ? raw.focusDate : '',
    focusCompleted: typeof raw.focusCompleted === 'number' && raw.focusCompleted > 0 ? Math.round(raw.focusCompleted) : 0,
    focusMsToday: typeof raw.focusMsToday === 'number' && raw.focusMsToday > 0 ? Math.round(raw.focusMsToday) : 0,
    focusCycle: typeof raw.focusCycle === 'number' && raw.focusCycle > 0 ? Math.round(raw.focusCycle) : 0,
    treats: parseTreats(raw.treats),
  };
}
