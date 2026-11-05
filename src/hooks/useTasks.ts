import { useCallback, useEffect, useRef, useState } from 'react';
import { localDateKey } from '../lib/date';
import { loadTasks, saveTasks } from '../lib/storage';
import type { Task } from '../types';

const TITLE_LIMIT = 160;

function sortByCreated(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState(() => localDateKey());
  const [storageError, setStorageError] = useState<string | null>(null);
  const tasksRef = useRef<Task[]>([]);
  const readyRef = useRef(false);

  const commit = useCallback((next: Task[]) => {
    tasksRef.current = next;
    setTasks(next);
    if (!readyRef.current) return;
    setStorageError(saveTasks(next));
  }, []);

  useEffect(() => {
    const result = loadTasks();
    tasksRef.current = result.tasks;
    setTasks(result.tasks);
    setStorageError(result.error);
    readyRef.current = true;
    setReady(true);
  }, []);

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

  const addTask = useCallback(
    (title: string) => {
      const trimmed = title.trim().slice(0, TITLE_LIMIT);
      if (!trimmed) return false;
      const now = new Date();
      const task: Task = {
        id: crypto.randomUUID(),
        title: trimmed,
        completed: false,
        createdAt: now.toISOString(),
        completedAt: null,
        date: localDateKey(now),
      };
      commit([...tasksRef.current, task]);
      return true;
    },
    [commit],
  );

  const toggleTask = useCallback(
    (id: string) => {
      const current = tasksRef.current.find((task) => task.id === id);
      if (!current) return false;
      const completed = !current.completed;
      commit(
        tasksRef.current.map((task) =>
          task.id === id
            ? {
                ...task,
                completed,
                completedAt: completed ? new Date().toISOString() : null,
              }
            : task,
        ),
      );
      return completed;
    },
    [commit],
  );

  const renameTask = useCallback(
    (id: string, title: string) => {
      const trimmed = title.trim().slice(0, TITLE_LIMIT);
      if (!trimmed) return false;
      commit(
        tasksRef.current.map((task) => (task.id === id ? { ...task, title: trimmed } : task)),
      );
      return true;
    },
    [commit],
  );

  const deleteTask = useCallback(
    (id: string) => {
      commit(tasksRef.current.filter((task) => task.id !== id));
    },
    [commit],
  );

  const carryIncompleteForward = useCallback(() => {
    const day = localDateKey();
    let moved = 0;
    const next = tasksRef.current.map((task) => {
      if (!task.completed && task.date < day) {
        moved += 1;
        return { ...task, date: day };
      }
      return task;
    });
    if (moved > 0) commit(next);
    return moved;
  }, [commit]);

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
