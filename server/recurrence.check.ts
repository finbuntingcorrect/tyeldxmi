import assert from 'node:assert/strict';
import { addDays, occurrenceDates, weekday } from './recurrence.ts';

assert.equal(addDays('2026-11-06', 1), '2026-11-07');
assert.equal(addDays('2026-01-31', 1), '2026-02-01');
assert.equal(weekday('2026-11-06'), 5);

const weekdays = occurrenceDates({
  kind: 'weekdays',
  weekdays: [],
  start: '2026-11-06',
  until: null,
  from: '2026-11-06',
  to: '2026-11-10',
});
assert.deepEqual(weekdays, ['2026-11-06', '2026-11-09', '2026-11-10']);

const training = occurrenceDates({
  kind: 'weekly',
  weekdays: [1, 3],
  start: '2026-11-02',
  until: null,
  from: '2026-11-02',
  to: '2026-11-12',
});
assert.deepEqual(training, ['2026-11-02', '2026-11-04', '2026-11-09', '2026-11-11']);
assert.equal(training.includes('2026-11-05'), false);

const movedSeriesStillPlansWednesday = occurrenceDates({
  kind: 'weekly',
  weekdays: [1, 3],
  start: '2026-11-02',
  until: null,
  from: '2026-11-04',
  to: '2026-11-11',
});
assert.deepEqual(movedSeriesStillPlansWednesday, ['2026-11-04', '2026-11-09', '2026-11-11']);

console.log('recurrence ok');
