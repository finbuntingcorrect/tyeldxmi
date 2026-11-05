import type { Task } from '../types';

const STORAGE_KEY = 'today-cat.tasks.v1';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type LoadResult = {
  tasks: Task[];
  error: string | null;
};

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task.id === 'string' &&
    task.id.length > 0 &&
    typeof task.title === 'string' &&
    task.title.trim().length > 0 &&
    typeof task.completed === 'boolean' &&
    typeof task.createdAt === 'string' &&
    (task.completedAt === null || typeof task.completedAt === 'string') &&
    typeof task.date === 'string' &&
    DATE_PATTERN.test(task.date)
  );
}

function describeWriteError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return 'В хранилище браузера закончилось место. Изменения останутся только до обновления страницы.';
  }
  return 'Не удалось сохранить задачи в localStorage. Изменения могут пропасть после обновления страницы.';
}

export function loadTasks(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { tasks: [], error: null };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        tasks: [],
        error:
          'Сохранённые данные повреждены и не загружены. Они останутся в браузере, пока вы не добавите новую задачу.',
      };
    }

    const source = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === 'object' &&
          Array.isArray((parsed as { tasks?: unknown }).tasks)
        ? (parsed as { tasks: unknown[] }).tasks
        : null;

    if (!source) {
      return {
        tasks: [],
        error:
          'Сохранённые данные имеют неожиданный формат и не загружены. Новая задача запишется поверх старой записи.',
      };
    }

    const tasks = source.filter(isTask).map((task) => ({
      ...task,
      title: task.title.trim(),
    }));

    const dropped = source.length - tasks.length;
    return {
      tasks,
      error:
        dropped > 0
          ? 'Часть сохранённых записей была повреждена и не показана.'
          : null,
    };
  } catch {
    return {
      tasks: [],
      error: 'Браузер не дал прочитать localStorage. Задачи работают только в этой вкладке.',
    };
  }
}

export function saveTasks(tasks: Task[]): string | null {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, tasks }),
    );
    return null;
  } catch (error) {
    return describeWriteError(error);
  }
}
