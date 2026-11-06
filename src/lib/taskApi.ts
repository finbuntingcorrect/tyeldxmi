import { loadTasks, clearStoredTasks } from './storage';
import type { Task } from '../types';

type TaskResponse = {
  tasks: Task[];
  moved?: number;
};

async function request(method: 'GET' | 'POST', body?: unknown): Promise<TaskResponse> {
  const response = await fetch('/api/tasks', {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json().catch(() => null)) as { tasks?: unknown; moved?: unknown } | null;
  if (!response.ok || !payload || !Array.isArray(payload.tasks)) {
    throw new Error(response.status === 400 ? 'title' : 'failed');
  }
  return {
    tasks: payload.tasks as Task[],
    moved: typeof payload.moved === 'number' ? payload.moved : undefined,
  };
}

export function listStoredTasks(): Task[] {
  if (typeof localStorage === 'undefined') return [];
  return loadTasks().tasks;
}

export function forgetStoredTasks() {
  if (typeof localStorage === 'undefined') return;
  clearStoredTasks();
}

export function fetchTasks() {
  return request('GET');
}

export function createTask(title: string, date: string) {
  return request('POST', { action: 'create', title, date });
}

export function toggleStoredTask(id: string) {
  return request('POST', { action: 'toggle', id });
}

export function renameStoredTask(id: string, title: string) {
  return request('POST', { action: 'rename', id, title });
}

export function deleteStoredTask(id: string) {
  return request('POST', { action: 'delete', id });
}

export function carryStoredTasks(date: string) {
  return request('POST', { action: 'carry', date });
}

export function importStoredTasks(tasks: Task[]) {
  return request('POST', { action: 'import', tasks });
}
