import assert from 'node:assert/strict';
import {
  catPose,
  clampCatPosition,
  finishEarly,
  formatClock,
  parseFocusMinutes,
  pauseSession,
  remainingMs,
  reminderDue,
  resumeSession,
  settleSession,
  startBreak,
  startFocus,
  unappliedFocusMs,
} from './focusSession';

const start = 1_000_000;
const session = startFocus('task-1', 20, start, 'sig-1');

assert.equal(parseFocusMinutes('20'), 20);
assert.equal(parseFocusMinutes(15), 15);
assert.equal(parseFocusMinutes(0), null);
assert.equal(parseFocusMinutes(181), null);
assert.equal(parseFocusMinutes('20.5'), null);
assert.equal(parseFocusMinutes(''), null);

assert.equal(remainingMs(session, start), 20 * 60_000);
assert.equal(remainingMs(session, start + 5 * 60_000), 15 * 60_000);
assert.equal(remainingMs(session, start + 25 * 60_000), 0);
assert.equal(formatClock(0), '0:00');
assert.equal(formatClock(65_000), '1:05');

const paused = pauseSession(session, start + 5 * 60_000);
assert.equal(paused.addMs, 5 * 60_000);
assert.equal(paused.session.paused, true);
assert.equal(remainingMs(paused.session, start + 60 * 60_000), 15 * 60_000);
assert.equal(unappliedFocusMs(paused.session, start + 60 * 60_000), 0);
const resumed = resumeSession(paused.session, start + 10 * 60_000);
assert.equal(resumed.paused, false);
assert.equal(resumed.durationMs, 15 * 60_000);
assert.equal(remainingMs(resumed, start + 10 * 60_000), 15 * 60_000);
const finished = settleSession(resumed, start + 25 * 60_000);
assert.equal(finished.addMs, 15 * 60_000);
assert.equal(finished.session.settled, true);
assert.equal(settleSession(finished.session, start + 30 * 60_000).addMs, 0);
assert.equal(pauseSession(finished.session, start + 30 * 60_000).addMs, 0);

const early = finishEarly(session, start + 3 * 60_000);
assert.equal(early.addMs, 3 * 60_000);
assert.equal(finishEarly(early.session, start + 4 * 60_000).addMs, 0);

const broke = startBreak(finished.session, start + 25 * 60_000, 'sig-break');
assert.equal(unappliedFocusMs(broke, start + 26 * 60_000), 0);
assert.equal(settleSession(broke, start + 31 * 60_000).addMs, 0);

assert.equal(reminderDue(session, start + 9 * 60_000, true), false);
assert.equal(reminderDue(session, start + 10 * 60_000, true), true);
assert.equal(reminderDue(session, start + 10 * 60_000, false), false);
assert.equal(reminderDue({ ...session, reminded: true }, start + 12 * 60_000, true), false);
assert.equal(reminderDue(session, start + 20 * 60_000, true), false);
assert.equal(reminderDue(paused.session, start + 12 * 60_000, true), false);

assert.equal(catPose({ greeting: true, openTasks: true, taskSuccess: false, remindVisible: false, session: null, now: start }), 'greet');
assert.equal(catPose({ greeting: true, openTasks: false, taskSuccess: false, remindVisible: false, session: null, now: start }), 'greet');
assert.equal(catPose({ greeting: false, openTasks: false, taskSuccess: false, remindVisible: false, session: null, now: start }), 'sleep');
assert.equal(catPose({ greeting: false, openTasks: true, taskSuccess: false, remindVisible: false, session: null, now: start }), 'idle');
assert.equal(catPose({ greeting: true, openTasks: true, taskSuccess: true, remindVisible: false, session, now: start + 1000 }), 'focus');
assert.equal(catPose({ greeting: true, openTasks: false, taskSuccess: false, remindVisible: false, session: paused.session, now: start }), 'pause');
assert.equal(catPose({ greeting: false, openTasks: true, taskSuccess: false, remindVisible: true, session, now: start + 1000 }), 'remind');
assert.equal(catPose({ greeting: false, openTasks: true, taskSuccess: false, remindVisible: false, session: finished.session, now: start + 25 * 60_000 }), 'success');
assert.equal(catPose({ greeting: false, openTasks: true, taskSuccess: false, remindVisible: false, session: broke, now: start + 26 * 60_000 }), 'break');

assert.deepEqual(clampCatPosition(-20, 4000, 800, 600, 88, 72, 96), { x: 8, y: 416 });

console.log('focus session ok');
