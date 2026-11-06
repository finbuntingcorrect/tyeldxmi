import { useCallback, useEffect, useState } from 'react';
import { localDateKey } from '../lib/date';
import {
  carryStoredTasks,
  createTask,
  deleteStoredTask,
  fetchTasks,
  forgetStoredTasks,
  importStoredTasks,
  listStoredTasks,
  renameStoredTask,
  toggleStoredTask,
} from '../lib/taskApi';
import type { Task } from '../types';

const TITLE_LIMIT = 160;
const SAVE_ERROR = 'Не удалось сохранить задачи в базе. Повторите действие.';
const LOAD_ERROR = 'Не удалось загрузить задачи из базы.';

function sortByCreated(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [today, setToday] = useState(() => localDateKey());
  const [storageError, setStorageError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const syncToday = () => {
      const next = localDateKey();
      setToday((current) => (current === next ? current : next));
    };
    const timer = window.setInterval(syncToday, 30_000);
    window.addEventListener('focus', syncToday);
    document.addEventListener('visibilitychange', syncToday);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', syncToday);
      document.removeEventListener('visibilitychange', syncToday);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        let next = (await fetchTasks()).tasks;
        const local = listStoredTasks();
        if (local.length > 0) {
          next = (await importStoredTasks(local)).tasks;
          forgetStoredTasks();
        }
        if (!cancelled) {
          setTasks(next);
          setStorageError(null);
        }
      } catch {
        if (!cancelled) setStorageError(LOAD_ERROR);
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const addTask = useCallback(async (title: string) => {
    const trimmed = title.trim().slice(0, TITLE_LIMIT);
    if (!trimmed) return false;
    try {
      const next = await createTask(trimmed, localDateKey());
      setTasks(next.tasks);
      setStorageError(null);
      return true;
    } catch {
      setStorageError(SAVE_ERROR);
      return false;
    }
  }, []);

  const toggleTask = useCallback(async (id: string) => {
    const current = tasks.find((task) => task.id === id);
    if (!current) return false;
    try {
      const next = await toggleStoredTask(id);
      setTasks(next.tasks);
      setStorageError(null);
      return !current.completed;
    } catch {
      setStorageError(SAVE_ERROR);
      return false;
    }
  }, [tasks]);

  const renameTask = useCallback(async (id: string, title: string) => {
    const trimmed = title.trim().slice(0, TITLE_LIMIT);
    if (!trimmed) return false;
    try {
      const next = await renameStoredTask(id, trimmed);
      setTasks(next.tasks);
      setStorageError(null);
      return true;
    } catch {
      setStorageError(SAVE_ERROR);
      return false;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const next = await deleteStoredTask(id);
      setTasks(next.tasks);
      setStorageError(null);
    } catch {
      setStorageError(SAVE_ERROR);
    }
  }, []);

  const carryIncompleteForward = useCallback(async () => {
    try {
      const next = await carryStoredTasks(localDateKey());
      setTasks(next.tasks);
      setStorageError(null);
      return next.moved ?? 0;
    } catch {
      setStorageError(SAVE_ERROR);
      return 0;
    }
  }, []);

  const todayTasks = sortByCreated(tasks.filter((task) => task.date === today));
  const earlierIncompleteCount = tasks.filter((task) => !task.completed && task.date < today).length;

  return {
    ready,
    today,
    storageError,
    todayTasks,
    earlierIncompleteCount,
    addTask,
    toggleTask,
    renameTask,
    deleteTask,
    carryIncompleteForward,
  };
}
