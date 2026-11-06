import { useState } from 'react';
import { loadNotebook, prepareNotebook, saveNotebook } from '../lib/notebookStore';
import {
  chooseMode,
  createHabit,
  createTask,
  moveTask,
  setFocus,
  setHabitMark,
  setName,
  setTaskPart,
  setTaskPriority,
  setTheme,
  toggleTask,
  updateTask,
  type AppMode,
  type AppTheme,
  type HabitStatus,
  type Notebook,
  type TaskDraft,
} from '../lib/notebook';
import { applyTheme } from '../lib/theme';
import type { DayPart, Priority, RepeatKind } from '../types';

export function useNotebook() {
  const [state, setState] = useState(() => {
    const loaded = loadNotebook();
    applyTheme(loaded.book.theme ?? 'yellow');
    return loaded;
  });

  function commit(recipe: (book: Notebook) => Notebook) {
    setState((current) => {
      const book = prepareNotebook(recipe(current.book));
      return { book, error: saveNotebook(book) };
    });
  }

  return {
    book: state.book,
    error: state.error,
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
  };
}
