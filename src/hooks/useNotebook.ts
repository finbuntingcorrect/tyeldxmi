import { useEffect, useRef, useState } from 'react';
import { cabinetError, cabinetUsesBrowser, fetchCabinet, loginCabinet, logoutCabinet, registerCabinet, saveCabinet } from '../lib/cabinetApi';
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
  createTask,
  emptyNotebook,
  moveTask,
  notebookIsEmpty,
  parseNotebook,
  applyFocus,
  setCatPrefs,
  setFocus,
  setHabitMark,
  setName,
  setTaskPart,
  setTaskPriority,
  setTheme,
  toggleTask,
  toggleWeekItem,
  updateTask,
  type AppMode,
  type AppTheme,
  type HabitStatus,
  type Notebook,
  type TaskDraft,
  type WeekItem,
} from '../lib/notebook';
import type { CatPrefs, FocusSession } from '../lib/focusSession';
import { applyTheme } from '../lib/theme';
import type { DayPart, Priority, RepeatKind } from '../types';

type Status = 'loading' | 'anon' | 'ready';

function named(book: Notebook, login: string) {
  return book.name.trim() ? book : { ...book, name: login.slice(0, 40) };
}

export function useNotebook() {
  const [status, setStatus] = useState<Status>('loading');
  const [login, setLogin] = useState('');
  const [state, setState] = useState<{ book: Notebook; error: string | null }>({ book: emptyNotebook(), error: null });
  const mounted = useRef(true);
  const generation = useRef(0);
  const chain = useRef(Promise.resolve());
  const bookRef = useRef(state.book);
  bookRef.current = state.book;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function show(accountLogin: string, book: Notebook, error: string | null) {
    applyTheme(book.theme ?? 'yellow');
    setLogin(accountLogin);
    setState({ book: prepareNotebook(book), error });
    setStatus('ready');
  }

  async function adopt(accountLogin: string, raw: unknown, claim: boolean) {
    let book = named(parseNotebook(raw) ?? emptyNotebook(), accountLogin);
    if (notebookIsEmpty(book) && (claim || claimMatches(accountLogin))) {
      const local = peekLocalNotebook();
      if (local) {
        rememberClaim(accountLogin);
        book = named(local, accountLogin);
        const message = await saveCabinet(book);
        if (!message) clearClaim();
        show(accountLogin, book, message);
        return;
      }
    }
    show(accountLogin, book, null);
  }

  const adoptRef = useRef(adopt);
  adoptRef.current = adopt;

  useEffect(() => {
    const generationAtLoad = generation.current;
    fetchCabinet()
      .then((result) => {
        if (!mounted.current || generation.current !== generationAtLoad) return;
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

  function persist(book: Notebook) {
    const generationAtSave = generation.current;
    chain.current = chain.current.then(async () => {
      const message = await saveCabinet(book);
      if (!mounted.current || generation.current !== generationAtSave) return;
      setState((current) => ({ ...current, error: message }));
    });
  }

  function commit(recipe: (book: Notebook) => Notebook) {
    const book = prepareNotebook(recipe(bookRef.current));
    bookRef.current = book;
    setState({ book, error: null });
    persist(book);
    return book;
  }

  async function register(nextLogin: string, password: string) {
    try {
      const result = await registerCabinet(nextLogin, password);
      generation.current += 1;
      await adopt(result.login, result.notebook, true);
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

  async function signOut() {
    generation.current += 1;
    await chain.current.catch(() => undefined);
    try {
      await logoutCabinet();
    } catch (error) {
      if (!mounted.current) return;
      setState((current) => ({ ...current, error: cabinetError(error) }));
      return;
    }
    if (!mounted.current) return;
    setLogin('');
    setState({ book: emptyNotebook(), error: null });
    applyTheme('yellow');
    setStatus('anon');
  }

  return {
    status,
    login,
    here: cabinetUsesBrowser(),
    book: state.book,
    error: state.error,
    register,
    signIn,
    signOut,
    chooseMode: (mode: AppMode) => commit((book) => chooseMode(book, mode)),
    setName: (name: string) => commit((book) => setName(book, name)),
    setTheme: (theme: AppTheme) => {
      applyTheme(theme);
      commit((book) => setTheme(book, theme));
    },
    createTask: (draft: TaskDraft) => commit((book) => createTask(book, draft)),
    toggleTask: (id: string) => commit((book) => toggleTask(book, id)),
    moveTask: (id: string, date: string) => commit((book) => moveTask(book, id, date)),
    setPart: (id: string, dayPart: DayPart) => commit((book) => setTaskPart(book, id, dayPart)),
    setPriority: (id: string, priority: Priority) => commit((book) => setTaskPriority(book, id, priority)),
    updateTask: (id: string, draft: TaskDraft, scope: 'one' | 'future') => commit((book) => updateTask(book, id, draft, scope)),
    setFocus: (id: string | null, today: string) => commit((book) => setFocus(book, id, today)),
    createHabit: (title: string, repeatKind: RepeatKind, weekdays: number[], start: string) => commit((book) => createHabit(book, title, repeatKind, weekdays, start)),
    setHabitMark: (habitId: string, date: string, status: HabitStatus | null) => commit((book) => setHabitMark(book, habitId, date, status)),
    addWeekItem: (week: string, kind: WeekItem['kind'], title: string) => commit((book) => addWeekItem(book, week, kind, title)),
    toggleWeekItem: (id: string) => commit((book) => toggleWeekItem(book, id)),
    assignWeekItem: (id: string, date: string) => commit((book) => assignWeekItem(book, id, date)),
    applyFocus: (session: FocusSession | null, change?: { taskId: string; addMs?: number; focusMs?: number }, at?: number) => {
      const next = commit((book) => applyFocus(book, session, change, at));
      return change ? next.tasks.find((task) => task.id === change.taskId)?.focusMs ?? 0 : 0;
    },
    setCat: (cat: CatPrefs) => commit((book) => setCatPrefs(book, cat)),
  };
}
