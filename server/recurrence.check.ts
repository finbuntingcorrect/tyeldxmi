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

const everyOtherDay = occurrenceDates({
  kind: 'daily',
  weekdays: [],
  start: '2026-11-20',
  until: null,
  from: '2026-11-20',
  to: '2026-11-26',
  interval: 2,
});
assert.deepEqual(everyOtherDay, ['2026-11-20', '2026-11-22', '2026-11-24', '2026-11-26']);

const monthEnds = occurrenceDates({
  kind: 'monthly',
  weekdays: [],
  start: '2026-01-31',
  until: '2026-04-30',
  from: '2026-01-01',
  to: '2026-05-31',
  monthDay: 31,
});
assert.deepEqual(monthEnds, ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);

const leapMonthEnd = occurrenceDates({
  kind: 'monthly',
  weekdays: [],
  start: '2028-01-31',
  until: null,
  from: '2028-02-01',
  to: '2028-03-31',
  monthDay: 31,
});
assert.deepEqual(leapMonthEnd, ['2028-02-29', '2028-03-31']);

const everyTwoWeeks = occurrenceDates({
  kind: 'weekly',
  weekdays: [5],
  start: '2026-11-20',
  until: null,
  from: '2026-11-20',
  to: '2026-12-04',
  interval: 2,
});
assert.deepEqual(everyTwoWeeks, ['2026-11-20', '2026-12-04']);

console.log('recurrence ok');
