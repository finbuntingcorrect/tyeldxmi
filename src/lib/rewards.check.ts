import assert from 'node:assert/strict';
import { emptyNotebook } from './notebook.ts';
import { finishEarly, settleSession, startFocus } from './focusSession.ts';
import {
  grantReward,
  pickFood,
  pickItem,
  rewardCounts,
  rewardSlot,
  rewardWeightTotal,
  REWARD_ITEMS,
} from './rewards.ts';

assert.equal(rewardWeightTotal(), 200);
assert.equal(REWARD_ITEMS.filter((item) => item.weight === 20).length, 6);
assert.equal(REWARD_ITEMS.filter((item) => item.weight === 15).length, 4);
assert.equal(REWARD_ITEMS.filter((item) => item.weight === 10).length, 2);

assert.equal(pickItem(() => 0).id, 'violet-bag');
assert.equal(pickItem(() => 0.099).id, 'violet-bag');
assert.equal(pickItem(() => 0.1).id, 'black-bag');
assert.equal(pickItem(() => 0.5).id, 'fish-cracker');
assert.equal(pickItem(() => 0.6).id, 'bone');
assert.equal(pickItem(() => 0.675).id, 'mouse');
assert.equal(pickItem(() => 0.9).id, 'scrunchie');
assert.equal(pickItem(() => 0.95).id, 'sock');
assert.equal(pickItem(() => 0.999).id, 'sock');
assert.equal(pickFood(() => 0), 'whiskas');
assert.equal(pickFood(() => 0.5), 'sheba');

function finished(signalId: string) {
  const book = emptyNotebook();
  const started = startFocus('task', 20, 1_000, signalId);
  book.focusSession = { ...settleSession(started, 1_000 + 20 * 60_000).session, rewarded: true };
  return book;
}

const first = grantReward(finished('signal-one'), 'signal-one', '2026-11-26', () => 0);
assert.equal(first.created, true);
assert.equal(first.reward?.itemId, 'violet-bag');
assert.equal(first.reward?.food, 'whiskas');
const again = grantReward(first.book, 'signal-one', '2026-11-26', () => 0.99);
assert.equal(again.created, false);
assert.equal(again.reward?.itemId, 'violet-bag');
assert.equal(rewardCounts(again.book.rewards).get('violet-bag'), 1);

const secondBook = {
  ...again.book,
  focusSession: again.book.focusSession ? { ...again.book.focusSession, signalId: 'signal-two' } : null,
};
const repeat = grantReward(secondBook, 'signal-two', '2026-11-26', () => 0);
assert.equal(repeat.created, true);
assert.equal(rewardCounts(repeat.book.rewards).get('violet-bag'), 2);

const earlyBook = emptyNotebook();
earlyBook.focusSession = finishEarly(startFocus('task', 20, 1_000, 'signal-early'), 1_000 + 5 * 60_000).session;
assert.equal(grantReward(earlyBook, 'signal-early', '2026-11-26', () => 0).error, 'ineligible');
assert.equal(grantReward(emptyNotebook(), 'signal-old', '2026-11-26', () => 0).error, 'ineligible');
assert.equal(grantReward(finished('signal-one'), 'no', '2026-11-26', () => 0).error, 'invalid');

for (const item of REWARD_ITEMS) {
  const slot = rewardSlot(item.id);
  const index = REWARD_ITEMS.findIndex((entry) => entry.id === item.id);
  const column = index % 4;
  const span = (0.857 - 0.142) / 4;
  const band = item.shelf === 'top' ? [0.268, 0.404] : item.shelf === 'middle' ? [0.484, 0.619] : [0.701, 0.832];
  const innerW = span * (1 - 0.16);
  const innerH = (band[1] - band[0]) * (1 - 0.16);
  assert.ok(Math.abs(slot.left + slot.width / 2 - (0.142 + column * span + span / 2)) < 0.001, item.id);
  assert.ok(Math.abs(slot.top + slot.height / 2 - (band[0] + band[1]) / 2) < 0.001, item.id);
  assert.ok(Math.abs(slot.width - innerW * 2) < 0.001, item.id);
  assert.ok(Math.abs(slot.height - innerH * 2) < 0.001, item.id);
}

console.log('rewards ok');
