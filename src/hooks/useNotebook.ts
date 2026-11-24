import { useEffect, useRef, useState } from 'react';
import { cabinetError, cabinetUsesBrowser, fetchCabinet, loginCabinet, logoutCabinet, registerCabinet, requestEmailLink, resetCabinetPassword, saveCabinet } from '../lib/cabinetApi';
import {
  claimMatches,
  clearClaim,
  peekLocalNotebook,
  prepareNotebook,
  rememberClaim,
} from '../lib/notebookStore';
import {
  addWeekItem,
  assignWeekItem,
  chooseMode,
  createHabit,
  deleteHabit,
  renameHabit,
  setHabitArchived,
  createTask,
  emptyNotebook,
  bringReturnRow,
  carryOpenTasks,
  claimWeekItem,
  deferTask,
  dismissTask,
  moveTask,
  setDayNote,
  deleteFollowingOccurrences,
  skipThisOccurrence,
  notebookIsEmpty,
  parseNotebook,
  applyFocus,
  markTreatFed,
  setCatPrefs,
  setFocus,
  setHabitMark,
  setName,
  setTaskDuration,
  setTaskNote,
  setTaskPart,
  setTaskPriority,
  setTaskMark,
  taskMark,
  materialize,
  setTheme,
  toggleTask,
  toggleWeekItem,
  updateTask,
  type AppMode,
  type AppTheme,
  type HabitStatus,
  type Notebook,
  type TaskDraft,
  type TaskDuration,
  type TaskMark,
  type WeekItem,
} from '../lib/notebook';
import { addDays } from '../../server/recurrence';
import type { CatPrefs, FocusChange, FocusSession, TreatKind } from '../lib/focusSession';
import { applyTheme } from '../lib/theme';
import { localDateKey } from '../lib/date';
import { readTreatMirror, treatMirrorKey } from '../lib/treats';
import type { DayPart, Priority, RepeatKind } from '../types';

type Status = 'loading' | 'anon' | 'ready';

function named(book: Notebook, login: string) {
  if (book.name.trim() || login.includes('@')) return book;
  return { ...book, name: login.slice(0, 40) };
}

export function useNotebook() {
  const [status, setStatus] = useState<Status>('loading');
  const [login, setLogin] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [state, setState] = useState<{ book: Notebook; error: string | null }>({ book: emptyNotebook(), error: null });
  const mounted = useRef(true);
  const generation = useRef(0);
  const chain = useRef(Promise.resolve<string | null>(null));
  const failedSave = useRef<Notebook | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const bookRef = useRef(state.book);
  bookRef.current = state.book;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function show(accountLogin: string, book: Notebook, error: string | null) {
    const next = prepareNotebook(book);
    bookRef.current = next;
    applyTheme(next.theme ?? 'yellow');
    setLogin(accountLogin);
    setState({ book: next, error });
    setStatus('ready');
  }

  async function adopt(accountLogin: string, raw: unknown, claim: boolean, displayName = '') {
    let book = named(parseNotebook(raw) ?? emptyNotebook(), accountLogin);
    let claimed = false;
    if (notebookIsEmpty(book) && (claim || claimMatches(accountLogin))) {
      const local = peekLocalNotebook();
      if (local) {
        rememberClaim(accountLogin);
        book = named(local, accountLogin);
        claimed = true;
      }
    }
    const beforeName = book.name;
    if (displayName) book = setName(book, displayName);
    if (claimed || book.name !== beforeName) {
      const message = await saveCabinet(book);
      if (claimed && !message) clearClaim();
      show(accountLogin, book, message);
      return;
    }
    show(accountLogin, book, null);
  }

  const adoptRef = useRef(adopt);
  adoptRef.current = adopt;

  useEffect(() => {
    const generationAtLoad = generation.current;
    const magic = new URLSearchParams(window.location.search).get('magic');
    const boot = (async () => {
      if (magic) {
        window.history.replaceState({}, '', window.location.pathname);
        return { reset: magic };
      }
      return fetchCabinet();
    })();
    boot
      .then((result) => {
        if (!mounted.current || generation.current !== generationAtLoad) return;
        if (result && 'reset' in result) {
          setResetToken(result.reset);
          setStatus('anon');
          return;
        }
        if (!result) {
          setStatus('anon');
          return;
        }
        return adoptRef.current(result.login, result.notebook, false);
      })
      .catch((error: unknown) => {
        if (!mounted.current || generation.current !== generationAtLoad) return;
        setState({ book: emptyNotebook(), error: cabinetError(error) });
        setStatus('anon');
      });
  }, []);

  function rememberFailure(book: Notebook, message: string) {
    failedSave.current = book;
    setCanRetry(true);
    setState((current) => ({ ...current, error: message }));
  }

  function rememberSuccess(book: Notebook, apply: boolean) {
    failedSave.current = null;
    setCanRetry(false);
    if (apply || bookRef.current === book) {
      bookRef.current = book;
      applyTheme(book.theme ?? 'yellow');
      setState({ book, error: null });
      return;
    }
    setState((current) => ({ ...current, error: null }));
  }

  function scheduleSave(): Promise<string | null> {
    const generationAtSave = generation.current;
    const job = chain.current.then(async () => {
      let message: string | null = null;
      while (mounted.current && generation.current === generationAtSave) {
        const book = bookRef.current;
        message = await saveCabinet(book);
        if (!mounted.current || generation.current !== generationAtSave) return message;
        if (bookRef.current !== book) continue;
        if (message) rememberFailure(book, message);
        else rememberSuccess(book, false);
        break;
      }
      return message;
    });
    chain.current = job.then((message) => message, () => 'Не получилось. Попробуй ещё раз.');
    return job;
  }

  function commit(recipe: (book: Notebook) => Notebook) {
    const book = prepareNotebook(recipe(bookRef.current));
    bookRef.current = book;
    setState((current) => ({ book, error: current.error }));
    void scheduleSave();
    return book;
  }

  function commitSaved(recipe: (book: Notebook) => Notebook) {
    commit(recipe);
    return chain.current;
  }

  function saveConfirmed(recipe: (book: Notebook) => Notebook) {
    const generationAtSave = generation.current;
    const job = chain.current.then(async () => {
      if (!mounted.current || generation.current !== generationAtSave) return 'Не получилось. Попробуй ещё раз.';
      const source = bookRef.current;
      const book = prepareNotebook(recipe(source));
      const message = await saveCabinet(book);
      if (!mounted.current || generation.current !== generationAtSave) return message;
      if (message) {
        rememberFailure(book, message);
        return message;
      }
      if (bookRef.current === source) {
        rememberSuccess(book, true);
        return null;
      }
      const merged = prepareNotebook(recipe(bookRef.current));
      rememberSuccess(merged, true);
      return scheduleSave();
    });
    chain.current = job.then((message) => message, () => 'Не получилось. Попробуй ещё раз.');
    return job;
  }

  function retrySave() {
    const book = failedSave.current;
    if (!book) return Promise.resolve(null);
    const generationAtSave = generation.current;
    const job = chain.current.then(async () => {
      const message = await saveCabinet(book);
      if (!mounted.current || generation.current !== generationAtSave) return message;
      if (message) {
        rememberFailure(book, message);
        return message;
      }
      rememberSuccess(book, true);
      return null;
    });
    chain.current = job.then((message) => message, () => 'Не получилось. Попробуй ещё раз.');
    return job;
  }

  async function requestEmail(email: string) {
    try {
      await requestEmailLink(email);
      return null;
    } catch (error) {
      return cabinetError(error);
    }
  }

  async function register(nextLogin: string, password: string, displayName = '') {
    try {
      const result = await registerCabinet(nextLogin, password);
      generation.current += 1;
      await adopt(result.login, result.notebook, true, displayName);
      return null;
    } catch (error) {
      return cabinetError(error);
    }
  }

  async function signIn(nextLogin: string, password: string) {
    try {
      const result = await loginCabinet(nextLogin, password);
      generation.current += 1;
      await adopt(result.login, result.notebook, false);
      return null;
    } catch (error) {
      return cabinetError(error);
    }
  }

  async function setPassword(token: string, password: string) {
    try {
      const result = await resetCabinetPassword(token, password);
      generation.current += 1;
      setResetToken(null);
      await adopt(result.login, result.notebook, true);
      return null;
    } catch (error) {
      return cabinetError(error);
    }
  }

  async function signOut() {
    generation.current += 1;
    await chain.current.catch(() => undefined);
    try {
      await logoutCabinet();
    } catch (error) {
      if (!mounted.current) return false;
      setState((current) => ({ ...current, error: cabinetError(error) }));
      return false;
    }
    if (!mounted.current) return false;
    setLogin('');
    setState({ book: emptyNotebook(), error: null });
    applyTheme('yellow');
    setStatus('anon');
    return true;
  }

  function feedTreat(date: string, kind: TreatKind) {
    if (bookRef.current.cat.treats.some((item) => item.date === date && item[kind])) return;
    commit((book) => markTreatFed(book, date, kind));
  }
  useTreatMirror(login, feedTreat);

  return {
    status,
    login,
    resetToken,
    here: cabinetUsesBrowser(),
    book: state.book,
    error: state.error,
    canRetry,
    retrySave,
    requestEmail,
    register,
    signIn,
    setPassword,
    signOut,
    chooseMode: (mode: AppMode) => commit((book) => chooseMode(book, mode)),
    setName: (name: string) => saveConfirmed((book) => setName(book, name)),
    setTheme: (theme: AppTheme) => {
      applyTheme(theme);
      return commitSaved((book) => setTheme(book, theme));
    },
    createTask: (draft: TaskDraft) => commit((book) => createTask(book, draft)),
    toggleTask: (id: string) => commit((book) => toggleTask(book, id)),
    setTaskVerdict: (id: string, mark: TaskMark | null) => {
      const generationAtSave = generation.current;
      const current = bookRef.current.tasks.find((task) => task.id === id);
      const previous = current ? taskMark(current) : null;
      if (!current || previous === mark) return Promise.resolve(null);
      const next = prepareNotebook(setTaskMark(bookRef.current, id, mark));
      bookRef.current = next;
      setState({ book: next, error: null });
      const job = chain.current.then(async () => {
        let message: string | null = null;
        let saved = bookRef.current;
        while (mounted.current && generation.current === generationAtSave) {
          saved = bookRef.current;
          message = await saveCabinet(saved);
          if (!mounted.current || generation.current !== generationAtSave) return message;
          if (bookRef.current !== saved) continue;
          break;
        }
        if (!mounted.current || generation.current !== generationAtSave) return message;
        if (message) {
          const restored = prepareNotebook(setTaskMark(bookRef.current, id, previous));
          bookRef.current = restored;
          setState({ book: restored, error: message });
          failedSave.current = saved;
          setCanRetry(true);
          return message;
        }
        rememberSuccess(saved, false);
        return null;
      });
      chain.current = job.then((message) => message, () => 'Не получилось. Попробуй ещё раз.');
      return job;
    },
    ensureWeek: (monday: string) => {
      const current = bookRef.current;
      const filled = materialize(current, monday, addDays(monday, 6));
      if (filled.tasks.length === current.tasks.length) return;
      commit((book) => materialize(book, monday, addDays(monday, 6)));
    },
    moveTask: (id: string, date: string) => commit((book) => moveTask(book, id, date)),
    skipThis: (id: string) => commit((book) => skipThisOccurrence(book, id)),
    deleteFollowing: (id: string) => commit((book) => deleteFollowingOccurrences(book, id)),
    dismissTask: (id: string) => commit((book) => dismissTask(book, id)),
    deferTask: (id: string) => commit((book) => deferTask(book, id)),
    claimWeek: (id: string, week: string) => commit((book) => claimWeekItem(book, id, week)),
    setDuration: (id: string, duration: TaskDuration | null) => commit((book) => setTaskDuration(book, id, duration)),
    setDayNote: (date: string, text: string) => commit((book) => setDayNote(book, date, text)),
    bringReturn: (day: string, key: string) => commit((book) => bringReturnRow(book, day, key)),
    carryOpen: (from: string, to: string) => commit((book) => carryOpenTasks(book, from, to)),
    setPart: (id: string, dayPart: DayPart) => commit((book) => setTaskPart(book, id, dayPart)),
    setTaskNote: (id: string, text: string) => commit((book) => setTaskNote(book, id, text)),
    setPriority: (id: string, priority: Priority) => commit((book) => setTaskPriority(book, id, priority)),
    updateTask: (id: string, draft: TaskDraft, scope: 'one' | 'future') => commit((book) => updateTask(book, id, draft, scope)),
    setFocus: (id: string | null, today: string) => commit((book) => setFocus(book, id, today)),
    createHabit: (title: string, repeatKind: RepeatKind, weekdays: number[], start: string) => commit((book) => createHabit(book, title, repeatKind, weekdays, start)),
    renameHabit: (id: string, title: string) => commit((book) => renameHabit(book, id, title)),
    setHabitArchived: (id: string, archived: boolean) => commit((book) => setHabitArchived(book, id, archived)),
    deleteHabit: (id: string) => commit((book) => deleteHabit(book, id)),
    setHabitMark: (habitId: string, date: string, status: HabitStatus | null) => commit((book) => setHabitMark(book, habitId, date, status)),
    addWeekItem: (week: string, kind: WeekItem['kind'], title: string) => commit((book) => addWeekItem(book, week, kind, title)),
    toggleWeekItem: (id: string) => commit((book) => toggleWeekItem(book, id)),
    assignWeekItem: (id: string, date: string) => commit((book) => assignWeekItem(book, id, date)),
    applyFocus: (session: FocusSession | null, change?: FocusChange, at?: number) => {
      const next = commit((book) => applyFocus(book, session, change, at));
      return change ? next.tasks.find((task) => task.id === change.taskId)?.focusMs ?? 0 : 0;
    },
    setCat: (cat: CatPrefs) => commitSaved((book) => setCatPrefs(book, cat)),
    feedTreat,
  };
}

function useTreatMirror(login: string, feed: (date: string, kind: TreatKind) => void) {
  const feedRef = useRef(feed);
  useEffect(() => {
    feedRef.current = feed;
  });
  useEffect(() => {
    if (!login) return;
    const apply = () => {
      const mirror = readTreatMirror(login);
      const today = localDateKey();
      if (!mirror || mirror.date !== today) return;
      if (mirror.whiskas) feedRef.current(today, 'whiskas');
      if (mirror.sheba) feedRef.current(today, 'sheba');
    };
    apply();
    const onStorage = (event: StorageEvent) => {
      if (event.key === treatMirrorKey(login)) apply();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [login]);
}
