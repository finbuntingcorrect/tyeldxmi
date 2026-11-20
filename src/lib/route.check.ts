import assert from 'node:assert/strict';
import { isMonthKey, modeForPage, pagePath, parseRoute } from './route';

assert.deepEqual(parseRoute('/'), { name: 'calendar' });
assert.deepEqual(parseRoute('/habits/'), { name: 'habits' });
assert.deepEqual(parseRoute('/focus'), { name: 'focus' });
assert.deepEqual(parseRoute('/settings'), { name: 'settings' });
assert.deepEqual(parseRoute('/day/2026-11-20'), { name: 'day', date: '2026-11-20' });
assert.deepEqual(parseRoute('/day/2026-02-31'), { name: 'calendar' });
assert.deepEqual(parseRoute('/nope'), { name: 'calendar' });
assert.equal(pagePath({ name: 'day', date: '2026-11-20' }), '/day/2026-11-20');
assert.equal(pagePath({ name: 'calendar' }), '/');
assert.equal(modeForPage({ name: 'day', date: '2026-11-20' }), 'planner');
assert.equal(modeForPage({ name: 'settings' }), null);
assert.equal(isMonthKey('2026-11'), true);
assert.equal(isMonthKey('2026-13'), false);

console.log('route ok');
