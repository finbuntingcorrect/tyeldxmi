import { useEffect, useRef, useState } from 'react';
import { claimSignal, readLive, takeLead, writeLive, type FocusLive } from '../lib/focusChannel';
import {
  finishEarly,
  isExpired,
  markReminded,
  parseFocusSession,
  pauseSession,
  remainingMs,
  reminderDue,
  resumeSession,
  settleSession,
  startAnother,
  startBreak,
  startFocus,
  type FocusSession,
} from '../lib/focusSession';
import { playChime, playMeow, unlockSound } from '../lib/focusSound';

type Apply = (session: FocusSession | null, change?: { taskId: string; addMs?: number; focusMs?: number }, at?: number) => number;

type Options = {
  login: string;
  session: FocusSession | null;
  focusAt: number;
  reminders: boolean;
  sound: boolean;
  volume: number;
  onApply: Apply;
};

function signal() {
  return crypto.randomUUID();
}

const appliedBanks = new Set<string>();

export function useFocusController({ login, session, focusAt, reminders, sound, volume, onApply }: Options) {
  const [now, setNow] = useState(() => Date.now());
  const [remindOpen, setRemindOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const sessionRef = useRef(session);
  const focusAtRef = useRef(focusAt);
  const loginRef = useRef(login);
  const remindersRef = useRef(reminders);
  const soundRef = useRef(sound);
  const volumeRef = useRef(volume);
  const onApplyRef = useRef(onApply);

  useEffect(() => {
    sessionRef.current = session;
    focusAtRef.current = focusAt;
    loginRef.current = login;
    remindersRef.current = reminders;
    soundRef.current = sound;
    volumeRef.current = volume;
    onApplyRef.current = onApply;
  }, [session, focusAt, login, reminders, sound, volume, onApply]);

  function publish(next: FocusSession | null, addMs = 0) {
    const at = Date.now();
    sessionRef.current = next;
    focusAtRef.current = at;
    const change = next && addMs > 0 ? { taskId: next.taskId, addMs } : undefined;
    const focusMs = onApplyRef.current(next, change, at);
    writeLive(loginRef.current, { at, session: next, focus: change ? { taskId: change.taskId, focusMs } : undefined });
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

  async function chime(id: string) {
    if (!soundRef.current) return;
    if (!(await claimSignal(id))) return;
    const result = await playChime(volumeRef.current);
    if (result === 'blocked') setNotice('Браузер не дал включить звук. Сессия на месте.');
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
    if (reminderDue(current, clock, remindersRef.current)) {
      const next = markReminded(current);
      publish(next);
      showRemind();
      if (soundRef.current) {
        void claimSignal(`remind:${next.signalId}`).then(async (won) => {
          if (!won) return;
          const result = await playMeow(volumeRef.current);
          if (result === 'blocked') setNotice('Браузер не дал включить звук. Напоминание видно на экране.');
        });
      }
      return;
    }
    if (!isExpired(current, clock)) return;
    const settled = settleSession(current, clock);
    bank(settled.session, settled.addMs);
    void chime(settled.session.signalId);
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
        if (next?.settled && !previous?.settled) void chime(next.signalId);
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
    if (soundRef.current) {
      void unlockSound().then((ready) => {
        if (!ready) setNotice('Браузер не дал включить звук. Таймер идёт без сигнала.');
      });
    }
    publish(startFocus(taskId, minutes, Date.now(), signal()));
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
    publish(startBreak(current, Date.now(), signal()));
    setRemindOpen(false);
  }

  function again(minutes: number) {
    const current = sessionRef.current;
    if (!current?.settled) return;
    takeLead(loginRef.current, true);
    publish(startAnother({ ...current, focusMinutes: minutes }, Date.now(), signal()));
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
    again,
  };
}
