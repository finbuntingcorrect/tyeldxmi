import { useCallback, useEffect, useState } from 'react';
import { fetchPlan, fetchSession, logout, planActions, requestLink, saveProfile, verifyLink } from '../lib/planApi';
import { clearStoredTasks, loadTasks, saveTasks } from '../lib/storage';
import type { DayPart, LegacyStoredTask, Priority, Profile, Task, TaskEdit } from '../types';

const ERRORS: Record<string, string> = {
  email: 'Введите почту в обычном виде.',
  mail: 'Отправка писем ещё не настроена на сервере. Попросите администратора добавить почтовый ключ.',
  mail_failed: 'Не удалось отправить письмо. Попробуйте ещё раз.',
  token: 'Ссылка для входа уже не действует. Запросите новую.',
  title: 'Введите название задачи.',
  weekdays: 'Выберите хотя бы один день недели.',
  'focus-limit': 'В фокусе дня уже три задачи.',
  'focus-date': 'В фокус можно добавить задачу на сегодня.',
  failed: 'Не удалось сохранить изменения. Повторите действие.',
  auth: 'Нужно снова войти.',
};

function explain(error: unknown) {
  const code = error instanceof Error ? error.message : 'failed';
  return ERRORS[code] || ERRORS.failed;
}

export function usePlan() {
  const [user, setUser] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [today, setToday] = useState('');
  const [legacyCount, setLegacyCount] = useState(0);
  const [localTasks, setLocalTasks] = useState<LegacyStoredTask[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPlan = useCallback((plan: { tasks: Task[]; today: string; legacyCount: number }) => {
    setTasks(plan.tasks);
    setToday(plan.today);
    setLegacyCount(plan.legacyCount);
    setError(null);
  }, []);

  const reload = useCallback(async () => {
    const plan = await fetchPlan();
    applyPlan(plan);
  }, [applyPlan]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const params = new URLSearchParams(window.location.search);
      const magic = params.get('magic');
      if (!cancelled) setLocalTasks(loadTasks().tasks);
      try {
        if (magic) {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow';
          const verified = await verifyLink(magic, timezone);
          if (!cancelled) setUser(verified.user as Profile);
          window.history.replaceState({}, '', window.location.pathname);
        }
        const profile = magic ? null : await fetchSession();
        if (!cancelled && profile) setUser(profile);
        if (!cancelled && (profile || magic)) {
          const plan = await fetchPlan();
          if (!cancelled) applyPlan(plan);
        }
        if (!cancelled) setLocalTasks(loadTasks().tasks);
      } catch (caught) {
        if (!cancelled && magic) setError(explain(caught));
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [applyPlan]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      void reload().catch(() => setError(ERRORS.failed));
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [reload, user]);

  const run = useCallback(async (work: () => Promise<{ tasks: Task[]; today: string; legacyCount: number }>) => {
    try {
      applyPlan(await work());
      return true;
    } catch (caught) {
      setError(explain(caught));
      return false;
    }
  }, [applyPlan]);

  return {
    ready,
    user,
    tasks,
    today,
    legacyCount,
    localTasks,
    error,
    clearError: () => setError(null),
    requestLink: async (email: string) => {
      try {
        await requestLink(email);
        setError(null);
        return true;
      } catch (caught) {
        setError(explain(caught));
        return false;
      }
    },
    logout: async () => {
      await logout().catch(() => undefined);
      setUser(null);
      setTasks([]);
    },
    saveProfile: async (patch: Partial<Profile> & { onboardingDone?: boolean }) => {
      try {
        setUser(await saveProfile(patch));
        if (patch.timezone) await reload();
        setError(null);
        return true;
      } catch (caught) {
        setError(explain(caught));
        return false;
      }
    },
    createTask: (edit: TaskEdit) => run(() => planActions.create(edit)),
    toggleTask: (id: string) => run(() => planActions.toggle(id)),
    focusTask: (id: string, on: boolean) => run(() => planActions.focus(id, on)),
    moveTask: (id: string, date: string) => run(() => planActions.move(id, date)),
    setPart: (id: string, dayPart: DayPart) => run(() => planActions.part(id, dayPart)),
    setPriority: (id: string, priority: Priority) => run(() => planActions.priority(id, priority)),
    updateTask: (id: string, edit: TaskEdit, scope: 'one' | 'future') => run(() => planActions.update(id, edit, scope)),
    deleteTask: (id: string, scope: 'one' | 'future') => run(() => planActions.remove(id, scope)),
    importLocal: async () => {
      const local = loadTasks().tasks;
      try {
        const result = await planActions.importTasks(local);
        const saved = new Set(result.importedIds || []);
        const remain = local.filter((task) => !saved.has(task.id));
        if (remain.length === 0) clearStoredTasks();
        else saveTasks(remain);
        setLocalTasks(remain);
        applyPlan(result);
        return remain.length === 0;
      } catch (caught) {
        setError(explain(caught));
        return false;
      }
    },
    claimLegacy: () => run(() => planActions.claimLegacy()),
  };
}
