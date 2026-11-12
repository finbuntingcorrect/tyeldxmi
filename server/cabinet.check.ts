import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createFileStore,
  loginAccount,
  logoutAccount,
  readAccountNotebook,
  registerAccount,
  writeAccountNotebook,
} from './cabinet';

const directory = await mkdtemp(join(tmpdir(), 'today-cat-cabinet-'));
const store = createFileStore(join(directory, 'accounts.json'));

function tokenFrom(cookie: string | undefined) {
  const match = cookie?.match(/today_cat_session=([^;]+)/);
  assert.ok(match);
  return decodeURIComponent(match[1]);
}

const anya = await registerAccount(store, 'Аня', 'secret12', false);
assert.equal(anya.status, 200);
assert.equal(anya.body.login, 'Аня');
const anyaToken = tokenFrom(anya.cookie);

const duplicate = await registerAccount(store, 'аня', 'another1', false);
assert.equal(duplicate.status, 409);

const savedAnya = await writeAccountNotebook(store, anyaToken, {
  greeted: true,
  mode: 'habits',
  name: 'Аня',
  theme: 'pink',
  habits: [{ id: 'habit-anya', title: 'Только Аня', repeatKind: 'daily', weekdays: [], start: '2026-11-01' }],
});
assert.equal(savedAnya.status, 200);

const borya = await registerAccount(store, 'Боря', 'secret12', false);
assert.equal(borya.status, 200);
const boryaToken = tokenFrom(borya.cookie);
const savedBorya = await writeAccountNotebook(store, boryaToken, {
  greeted: true,
  mode: 'planner',
  name: 'Боря',
  tasks: [{
    id: 'task-borya',
    title: 'Только Боря',
    completed: false,
    createdAt: '2026-11-12T00:00:00.000Z',
    completedAt: null,
    date: '2026-11-12',
    dayPart: 'anytime',
    priority: 'normal',
    seriesId: null,
    originalDate: '2026-11-12',
    exception: false,
    repeatKind: null,
    weekdays: [],
    deleted: false,
  }],
});
assert.equal(savedBorya.status, 200);

const anyaAgain = await readAccountNotebook(store, anyaToken);
const anyaNotebook = anyaAgain.body.notebook as { habits?: { title: string }[]; tasks?: { title: string }[] };
assert.equal(anyaNotebook.habits?.[0]?.title, 'Только Аня');
assert.equal(anyaNotebook.tasks?.length ?? 0, 0);

const boryaAgain = await readAccountNotebook(store, boryaToken);
const boryaNotebook = boryaAgain.body.notebook as { habits?: unknown[]; tasks?: { title: string }[] };
assert.equal(boryaNotebook.tasks?.[0]?.title, 'Только Боря');
assert.equal(boryaNotebook.habits?.length ?? 0, 0);

const crossed = await writeAccountNotebook(store, anyaToken, {
  greeted: true,
  mode: 'habits',
  name: 'Аня',
  habits: [{ id: 'habit-anya', title: 'Только Аня', repeatKind: 'daily', weekdays: [], start: '2026-11-01' }],
});
assert.equal(crossed.status, 200);
const boryaUntouched = await readAccountNotebook(store, boryaToken);
assert.equal((boryaUntouched.body.notebook as { tasks?: { title: string }[] }).tasks?.[0]?.title, 'Только Боря');

const wrong = await loginAccount(store, 'Аня', 'nope-nope', false);
assert.equal(wrong.status, 401);
const missing = await loginAccount(store, 'НетТакого', 'secret12', false);
assert.equal(missing.status, 401);

const again = await loginAccount(store, 'аня', 'secret12', false);
assert.equal(again.status, 200);
assert.equal(again.body.login, 'Аня');
const freshToken = tokenFrom(again.cookie);
assert.equal((await readAccountNotebook(store, freshToken)).body.login, 'Аня');

await logoutAccount(store, freshToken, false);
assert.equal((await readAccountNotebook(store, freshToken)).status, 401);
assert.equal((await readAccountNotebook(store, anyaToken)).status, 200);

const raw = await readFile(join(directory, 'accounts.json'), 'utf8');
assert.equal(raw.includes('secret12'), false);
assert.equal(raw.includes('Только Боря'), true);
assert.equal(raw.includes('Только Аня'), true);

await rm(directory, { recursive: true, force: true });
console.log('cabinet ok');
