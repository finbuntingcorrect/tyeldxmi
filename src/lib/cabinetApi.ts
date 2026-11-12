import { createLocalCabinet, type LocalCabinet } from './localCabinet';
import type { Notebook } from './notebook';

export type CabinetPayload = {
  login: string;
  notebook: unknown;
};

const MESSAGES: Record<string, string> = {
  login: 'Логин — от 3 до 24 символов: буквы, цифры, знак _ или -.',
  password: 'Пароль — от 6 до 72 символов.',
  taken: 'Такой логин уже есть. Войди или придумай другой.',
  credentials: 'Неверный логин или пароль.',
  rate: 'Слишком много попыток. Подожди немного и попробуй снова.',
  storage: 'Кабинет не сохранился. Попробуй ещё раз.',
  notebook: 'Не получилось записать задачи.',
  browser: 'Браузер не дал сохранить кабинет.',
  cabinet: 'Кабинет в этом браузере не открылся.',
  auth: 'Нужно снова войти.',
};

let preferBrowser = false;
let browserCabinet: LocalCabinet | null = null;

function localCabinet() {
  browserCabinet ??= createLocalCabinet(localStorage, sessionStorage);
  return browserCabinet;
}

export function cabinetUsesBrowser() {
  return preferBrowser;
}

function isStorage(error: unknown) {
  return error instanceof Error && error.message === 'storage';
}

export function cabinetError(error: unknown) {
  const code = error instanceof Error ? error.message : 'failed';
  return MESSAGES[code] ?? 'Не получилось. Попробуй ещё раз.';
}

async function request(path: string, method: 'GET' | 'POST', body?: unknown) {
  const response = await fetch(path, {
    method,
    credentials: 'include',
    headers: body ? { 'content-type': 'application/json' } : { accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    const error = payload && typeof payload.error === 'string' ? payload.error : 'failed';
    if (error === 'storage') preferBrowser = true;
    throw new Error(error);
  }
  return payload || {};
}

function asCabinet(payload: Record<string, unknown>): CabinetPayload {
  if (typeof payload.login !== 'string' || !payload.login) throw new Error('failed');
  return { login: payload.login, notebook: payload.notebook };
}

async function fromBrowser(run: () => Promise<{ login: string; notebook: Notebook }>) {
  preferBrowser = true;
  const result = await run();
  return { login: result.login, notebook: result.notebook };
}

export async function fetchCabinet(): Promise<CabinetPayload | null> {
  const response = await fetch('/api/notebook', { credentials: 'include', headers: { accept: 'application/json' } });
  if (response.status === 401) return null;
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    const error = payload && typeof payload.error === 'string' ? payload.error : 'failed';
    if (error === 'storage') {
      preferBrowser = true;
      return localCabinet().readSession();
    }
    throw new Error(error);
  }
  return asCabinet(payload || {});
}

export async function registerCabinet(login: string, password: string) {
  if (preferBrowser) return fromBrowser(() => localCabinet().register(login, password));
  try {
    return asCabinet(await request('/api/auth', 'POST', { action: 'register', login, password }));
  } catch (error) {
    if (!isStorage(error)) throw error;
    return fromBrowser(() => localCabinet().register(login, password));
  }
}

export async function loginCabinet(login: string, password: string) {
  if (preferBrowser) return fromBrowser(() => localCabinet().login(login, password));
  try {
    return asCabinet(await request('/api/auth', 'POST', { action: 'login', login, password }));
  } catch (error) {
    if (!isStorage(error)) throw error;
    return fromBrowser(() => localCabinet().login(login, password));
  }
}

export function logoutCabinet() {
  if (preferBrowser) {
    localCabinet().logout();
    return Promise.resolve({});
  }
  return request('/api/auth', 'POST', { action: 'logout' });
}

export async function saveCabinet(notebook: Notebook) {
  if (preferBrowser) {
    try {
      await localCabinet().save(notebook);
      return null;
    } catch (error) {
      return cabinetError(error);
    }
  }
  try {
    await request('/api/notebook', 'POST', { notebook });
    return null;
  } catch (error) {
    if (!isStorage(error)) return cabinetError(error);
    try {
      await localCabinet().save(notebook);
      return null;
    } catch (next) {
      return cabinetError(next);
    }
  }
}
