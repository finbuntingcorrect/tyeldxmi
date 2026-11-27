import { useEffect, useRef, useState } from 'react';
import { claimSignal, readLive, takeLead, writeLive, type FocusLive } from '../lib/focusChannel';
import {
  BREAK_MINUTES,
  finishEarly,
  isExpired,
  markReminded,
  parseFocusSession,
  pauseSession,
  plannedBreakFor,
  remainingMs,
  reminderDue,
  resumeSession,
  settleSession,
  shouldAutoAdvance,
  startAnother,
  startBreak,
  startFocus,
  startIdle,
  type FocusChange,
  type FocusSession,
  type PhaseChoice,
} from '../lib/focusSession';
import { playChime, playMeow, unlockSound } from '../lib/focusSound';

type Apply = (session: FocusSession | null, change?: FocusChange, at?: number) => number;

type Options = {
  login: string;
  session: FocusSession | null;
  focusAt: number;
  sound: boolean;
  volume: number;
  autoStart: boolean;
  rounds: number;
  cycle: number;
  shortMinutes: number;
  longMinutes: number;
  onApply: Apply;
};

function signal() {
  return crypto.randomUUID();
}

const appliedBanks = new Set<string>();

export function useFocusController({ login, session, focusAt, sound, volume, autoStart, rounds, cycle, onApply }: Options) {
  const [now, setNow] = useState(() => Date.now());
  const [remindOpen, setRemindOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const sessionRef = useRef(session);
  const focusAtRef = useRef(focusAt);
  const loginRef = useRef(login);
  const soundRef = useRef(sound);
  const volumeRef = useRef(volume);
  const autoRef = useRef(autoStart);
  const roundsRef = useRef(rounds);
  const cycleRef = useRef(cycle);
  const onApplyRef = useRef(onApply);

  useEffect(() => {
    sessionRef.current = session;
    focusAtRef.current = focusAt;
    loginRef.current = login;
    soundRef.current = sound;
    volumeRef.current = volume;
    autoRef.current = autoStart;
    roundsRef.current = rounds;
    cycleRef.current = cycle;
    onApplyRef.current = onApply;
  }, [session, focusAt, login, sound, volume, autoStart, rounds, cycle, onApply]);

  function openingNewCycle() {
    const size = Math.max(1, Math.round(roundsRef.current) || 1);
    return cycleRef.current >= size;
  }

  function publish(next: FocusSession | null, addMs = 0, resetCycle = false) {
    const at = Date.now();
    sessionRef.current = next;
    focusAtRef.current = at;
    const change: FocusChange | undefined = addMs > 0 || resetCycle
      ? { taskId: next?.taskId ?? '', addMs, resetCycle }
      : undefined;
    const focusMs = onApplyRef.current(next, change, at);
    writeLive(loginRef.current, { at, session: next, focus: change && addMs > 0 ? { taskId: change.taskId, focusMs } : undefined });
  }

  function bank(next: FocusSession, addMs: number) {
    if (addMs > 0) {
      const key = `${next.signalId}:${next.phase}:${next.sliceAppliedMs}:${addMs}`;
      if (appliedBanks.has(key)) {
        publish(next, 0);
        return;
      }
      appliedBanks.add(key);
    }
    publish(next, addMs);
  }

  async function meow(id: string) {
    if (!(await claimSignal(id))) return;
    await playMeow(volumeRef.current);
  }

  async function chime(id: string) {
    if (!soundRef.current) return;
    if (!(await claimSignal(id))) return;
    const result = await playChime(volumeRef.current);
    if (result === 'blocked') setNotice('Звук не включился.');
  }

  function showRemind() {
    setRemindOpen(true);
    window.setTimeout(() => setRemindOpen(false), 8000);
  }

  function tick() {
    const clock = Date.now();
    setNow(clock);
    const current = sessionRef.current;
    if (!current || !takeLead(loginRef.current)) return;
    if (reminderDue(current, clock, true)) {
      const next = markReminded(current);
      publish(next);
      showRemind();
      void claimSignal(`remind:${next.signalId}`).then(async (won) => {
        if (!won) return;
        await playMeow(volumeRef.current);
      });
      return;
    }
    if (!isExpired(current, clock)) return;
    const settled = settleSession(current, clock);
    const kind = settled.session.phase === 'focus' && settled.session.full
      ? plannedBreakFor(cycleRef.current, roundsRef.current)
      : settled.session.plannedBreak;
    const done = { ...settled.session, plannedBreak: kind };
    const advance = shouldAutoAdvance(current.endsAt, clock, autoRef.current) && done.full;
    const fullFocus = done.phase === 'focus' && done.full;
    const rewarded = fullFocus ? { ...done, rewarded: true } : done;
    bank(rewarded, settled.addMs);
    if (fullFocus) {
      void meow(rewarded.signalId);
      return;
    }
    if (done.phase === 'break') return;
    void chime(done.signalId);
    if (!advance || done.phase === 'focus') return;
    publish(startAnother(done, clock, signal()), 0, openingNewCycle());
  }

  useEffect(() => {
    const live = readLive(login);
    if (live && live.at > focusAt) {
      sessionRef.current = live.session;
      focusAtRef.current = live.at;
      onApply(live.session, live.focus, live.at);
    } else {
      writeLive(login, { at: focusAt, session });
    }
    takeLead(login, true);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== `today-cat.focus.${login}` || !event.newValue) return;
      try {
        const live = JSON.parse(event.newValue) as FocusLive;
        const next = live.session ? parseFocusSession(live.session) : null;
        if (live.at < focusAtRef.current) return;
        const previous = sessionRef.current;
        sessionRef.current = next;
        focusAtRef.current = live.at;
        onApplyRef.current(next, live.focus, live.at);
        if (next?.reminded && !previous?.reminded && next.phase === 'focus' && !next.settled) showRemind();
        if (next?.settled && !previous?.settled && next.phase === 'focus' && next.full) void meow(next.signalId);
      } catch {
        /* ignore a damaged live record */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    const started = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    return () => {
      window.clearTimeout(started);
      window.clearInterval(id);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
    // The timer follows the signed-in cabinet. Later edits go through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [login]);

  function start(taskId: string, minutes: number) {
    const current = sessionRef.current;
    if (current && !current.settled) return false;
    takeLead(loginRef.current, true);
    void unlockSound();
    publish(startFocus(taskId, minutes, Date.now(), signal()), 0, openingNewCycle());
    setRemindOpen(false);
    return true;
  }

  function pause() {
    const current = sessionRef.current;
    if (!current || current.paused || current.settled) return;
    takeLead(loginRef.current, true);
    const result = pauseSession(current, Date.now());
    bank(result.session, result.addMs);
    setRemindOpen(false);
  }

  function resume() {
    const current = sessionRef.current;
    if (!current?.paused || current.settled) return;
    takeLead(loginRef.current, true);
    publish(resumeSession(current, Date.now()));
  }

  function finish() {
    const current = sessionRef.current;
    if (!current || current.settled) return;
    takeLead(loginRef.current, true);
    const result = finishEarly(current, Date.now());
    bank(result.session, result.addMs);
    setRemindOpen(false);
  }

  function clear() {
    takeLead(loginRef.current, true);
    publish(null);
    setRemindOpen(false);
  }

  function beginBreak() {
    const current = sessionRef.current;
    if (!current || current.phase !== 'focus' || !current.settled) return;
    takeLead(loginRef.current, true);
    publish(startBreak(current, Date.now(), signal(), BREAK_MINUTES, 'short'));
    setRemindOpen(false);
  }

  function skipBreak() {
    const current = sessionRef.current;
    if (!current?.settled || current.phase !== 'focus') return;
    takeLead(loginRef.current, true);
    publish(null);
    setRemindOpen(false);
  }

  function startPhase(taskId: string, phase: PhaseChoice, minutes: number, focusMinutes: number) {
    const current = sessionRef.current;
    if (current && !current.settled) return false;
    takeLead(loginRef.current, true);
    void unlockSound();
    publish(startIdle(taskId, phase, focusMinutes, minutes, Date.now(), signal()), 0, phase === 'focus' && openingNewCycle());
    setRemindOpen(false);
    return true;
  }

  function again(minutes: number) {
    const current = sessionRef.current;
    if (!current?.settled) return;
    takeLead(loginRef.current, true);
    void unlockSound();
    publish(startAnother({ ...current, focusMinutes: minutes }, Date.now(), signal()), 0, openingNewCycle());
    setRemindOpen(false);
  }

  return {
    now,
    remaining: session ? remainingMs(session, now) : 0,
    remindOpen,
    notice,
    clearNotice: () => setNotice(null),
    dismissRemind: () => setRemindOpen(false),
    start,
    pause,
    resume,
    finish,
    clear,
    beginBreak,
    skipBreak,
    startPhase,
    again,
  };
}
