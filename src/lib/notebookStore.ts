import { loadTasks } from './storage';
import { emptyNotebook, fromLegacyTasks, materialize, parseNotebook, type Notebook } from './notebook';
import { addDays } from '../../server/recurrence';
import { localDateKey } from './date';

const STORAGE_KEY = 'today-cat.notebook.v1';

export function prepareNotebook(book: Notebook, today = localDateKey()) {
  return materialize(book, addDays(today, -21), addDays(today, 120));
}

export function loadNotebook(): { book: Notebook; error: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      try {
        const parsed = parseNotebook(JSON.parse(raw));
        if (parsed) return { book: prepareNotebook(parsed), error: null };
      } catch {
        return {
          book: prepareNotebook(emptyNotebook()),
          error: 'Сохранённый блокнот повреждён. Новые записи сохранятся отдельно, старый ключ не стёрт.',
        };
      }
      return {
        book: prepareNotebook(emptyNotebook()),
        error: 'Сохранённый блокнот имеет неожиданный формат. Старая запись осталась в браузере.',
      };
    }
    const legacy = loadTasks();
    const book = prepareNotebook(fromLegacyTasks(legacy.tasks));
    if (legacy.tasks.length > 0) {
      const error = saveNotebook(book);
      return { book, error: error || legacy.error };
    }
    return { book, error: legacy.error };
  } catch {
    return { book: prepareNotebook(emptyNotebook()), error: 'Браузер не дал прочитать сохранённые данные.' };
  }
}

export function saveNotebook(book: Notebook): string | null {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(book));
    return null;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return 'В хранилище браузера закончилось место. Изменения останутся только до обновления страницы.';
    }
    return 'Не удалось записать данные в этот браузер.';
  }
}
