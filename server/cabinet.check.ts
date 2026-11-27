import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createFileStore,
  grantAccountReward,
  loginAccount,
  logoutAccount,
  readAccountNotebook,
  registerAccount,
  writeAccountNotebook,
} from './cabinet';
import { settleSession, startFocus } from '../src/lib/focusSession';

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

const created = await registerAccount(store, 'ksenia@example.com', 'letter1', false);
assert.equal(created.status, 200);
assert.equal(created.body.login, 'ksenia@example.com');
assert.equal((created.body.notebook as { name?: string }).name, '');
const createdToken = tokenFrom(created.cookie);

const wrongEmail = await loginAccount(store, 'ksenia@example.com', 'nope-nope', false);
assert.equal(wrongEmail.status, 401);
assert.equal(wrongEmail.body.error, 'credentials');
assert.equal(wrongEmail.cookie, undefined);
assert.equal((await readAccountNotebook(store, createdToken)).status, 200);

const unknownEmail = await loginAccount(store, 'missing@example.com', 'letter1', false);
assert.equal(unknownEmail.status, 401);
assert.equal(unknownEmail.body.error, 'credentials');
assert.equal(unknownEmail.cookie, undefined);

const rightEmail = await loginAccount(store, 'Ksenia@example.com', 'letter1', false);
assert.equal(rightEmail.status, 200);
assert.equal(rightEmail.body.login, 'ksenia@example.com');

const shortPassword = await registerAccount(store, 'other@example.com', '12345', false);
assert.equal(shortPassword.status, 400);
assert.equal(shortPassword.body.error, 'password');

await store.insertUser({ id: 'no-pass', login: 'old@example.com', loginKey: 'old@example.com', passwordHash: '' });
const unset = await loginAccount(store, 'old@example.com', 'letter1', false);
assert.equal(unset.status, 401);
assert.equal(unset.body.error, 'password_unset');
assert.equal(unset.cookie, undefined);

const kisa = await registerAccount(store, 'Киса', 'secret12', false);
assert.equal(kisa.status, 200);
const kisaToken = tokenFrom(kisa.cookie);
const started = startFocus('task', 20, 1_000, 'focus-signal-1');
const settled = { ...settleSession(started, 1_000 + 20 * 60_000).session, rewarded: true };
const withFocus = await writeAccountNotebook(store, kisaToken, { name: 'Киса', mode: 'planner', greeted: true, focusSession: settled });
assert.equal(withFocus.status, 200);
const early = await grantAccountReward(store, kisaToken, 'focus-signal-1', '2026-11-26');
assert.equal(early.status, 200);
assert.equal(early.body.created, true);
const repeated = await grantAccountReward(store, kisaToken, 'focus-signal-1', '2026-11-26');
assert.equal(repeated.status, 200);
assert.equal(repeated.body.created, false);
assert.equal(repeated.body.reward.itemId, early.body.reward.itemId);
assert.equal(repeated.body.reward.food, early.body.reward.food);
const kept = await writeAccountNotebook(store, kisaToken, { name: 'Киса', mode: 'planner', greeted: true });
assert.equal(kept.body.notebook.rewards.length, 1);
assert.equal(kept.body.notebook.rewards[0].signalId, 'focus-signal-1');
const blocked = await grantAccountReward(store, kisaToken, 'another-signal', '2026-11-26');
assert.equal(blocked.status, 409);
assert.equal(blocked.body.error, 'pending');

const raw = await readFile(join(directory, 'accounts.json'), 'utf8');
assert.equal(raw.includes('secret12'), false);
assert.equal(raw.includes('letter1'), false);
assert.equal(raw.includes('Только Боря'), true);
assert.equal(raw.includes('Только Аня'), true);

await rm(directory, { recursive: true, force: true });
console.log('cabinet ok');
