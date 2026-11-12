import assert from 'node:assert/strict';
import { createLocalCabinet } from './localCabinet';

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
    raw: () => [...data.values()].join('\n'),
  };
}

const persistent = memory();
const session = memory();
const cabinet = createLocalCabinet(persistent, session);

const anya = await cabinet.register('Аня', 'secret12');
assert.equal(anya.login, 'Аня');
anya.notebook.tasks = [{
  id: 'task-anya',
  title: 'Только Аня',
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
  focusMs: 0,
}];
await cabinet.save(anya.notebook);
assert.equal(persistent.raw().includes('Только Аня'), false);
assert.equal(persistent.raw().includes('secret12'), false);

const again = await cabinet.readSession();
assert.equal(again?.notebook.tasks[0]?.title, 'Только Аня');

await assert.rejects(() => cabinet.register('аня', 'another1'), /taken/);

const other = memory();
const second = createLocalCabinet(persistent, other);
await assert.rejects(() => second.login('Аня', 'wrongpw'), /credentials/);
const borya = await second.register('Боря', 'secret12');
assert.equal(borya.notebook.tasks.length, 0);
await second.logout();
assert.equal(await second.readSession(), null);

const returned = await second.login('Аня', 'secret12');
assert.equal(returned.notebook.tasks[0]?.title, 'Только Аня');

console.log('local cabinet ok');
