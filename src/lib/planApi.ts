import type { LegacyStoredTask, Profile, Task, TaskEdit } from '../types';

export type PlanPayload = {
  tasks: Task[];
  today: string;
  legacyCount: number;
  importedIds?: string[];
};

async function request(path: string, method: 'GET' | 'POST', body?: unknown) {
  const response = await fetch(path, {
    method,
    credentials: 'include',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    const error = payload && typeof payload.error === 'string' ? payload.error : 'failed';
    throw new Error(error);
  }
  return payload || {};
}

export async function fetchSession() {
  const payload = await request('/api/auth', 'GET');
  return payload.user as Profile;
}

export function requestLink(email: string) {
  return request('/api/auth', 'POST', { action: 'request', email });
}

export function verifyLink(token: string, timezone: string) {
  return request('/api/auth', 'POST', { action: 'verify', token, timezone });
}

export function logout() {
  return request('/api/auth', 'POST', { action: 'logout' });
}

export function saveProfile(patch: Partial<Profile> & { onboardingDone?: boolean }) {
  return request('/api/profile', 'POST', patch).then((payload) => payload.user as Profile);
}

export async function fetchPlan(): Promise<PlanPayload> {
  const payload = await request('/api/tasks', 'GET');
  return {
    tasks: Array.isArray(payload.tasks) ? (payload.tasks as Task[]) : [],
    today: typeof payload.today === 'string' ? payload.today : '',
    legacyCount: typeof payload.legacyCount === 'number' ? payload.legacyCount : 0,
  };
}

function withPlan(pathBody: unknown) {
  return request('/api/tasks', 'POST', pathBody).then((payload) => ({
    tasks: Array.isArray(payload.tasks) ? (payload.tasks as Task[]) : [],
    today: typeof payload.today === 'string' ? payload.today : '',
    legacyCount: typeof payload.legacyCount === 'number' ? payload.legacyCount : 0,
    importedIds: Array.isArray(payload.importedIds) ? (payload.importedIds as string[]) : undefined,
  }));
}

export const planActions = {
  create: (input: TaskEdit) => withPlan({ action: 'create', ...input }),
  toggle: (id: string) => withPlan({ action: 'toggle', id }),
  focus: (id: string, on: boolean) => withPlan({ action: 'focus', id, on }),
  move: (id: string, date: string) => withPlan({ action: 'move', id, date }),
  part: (id: string, dayPart: string) => withPlan({ action: 'part', id, dayPart }),
  priority: (id: string, priority: string) => withPlan({ action: 'priority', id, priority }),
  update: (id: string, edit: TaskEdit, scope: 'one' | 'future') => withPlan({ action: 'update', id, ...edit, scope }),
  remove: (id: string, scope: 'one' | 'future') => withPlan({ action: 'delete', id, scope }),
  importTasks: (tasks: LegacyStoredTask[]) => withPlan({ action: 'import', tasks }),
  claimLegacy: () => withPlan({ action: 'claim-legacy' }),
};
