import assert from 'node:assert/strict';
import {
  catFrame,
  catPose,
  clampCatPosition,
  finishEarly,
  formatClock,
  parseFocusMinutes,
  pauseSession,
  cycleMarks,
  plannedBreakFor,
  remainingMs,
  reminderDue,
  resumeSession,
  settleSession,
  shouldAutoAdvance,
  startBreak,
  startFocus,
  unappliedFocusMs,
  defaultCatPrefs,
  feedTreat,
  focusWorkedMs,
  treatDurationMs,
  treatForMinutes,
  treatOffer,
  clampDialDrag,
  clampDialMinutes,
  dialMinutesFromAngle,
  parseFocusSession,
  TREAT_FRAMES,
  WHISKAS_MS,
  SHEBA_MS,
} from './focusSession.ts';

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
assert.equal(formatClock(0), '00:00');
assert.equal(formatClock(65_000), '01:05');
assert.equal(formatClock(-50), '00:00');

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
assert.equal(finished.session.full, true);
assert.equal(settleSession(finished.session, start + 30 * 60_000).addMs, 0);
assert.equal(pauseSession(finished.session, start + 30 * 60_000).addMs, 0);

const early = finishEarly(session, start + 3 * 60_000);
assert.equal(early.addMs, 3 * 60_000);
assert.equal(early.session.full, false);
assert.equal(finishEarly(early.session, start + 4 * 60_000).addMs, 0);

const broke = startBreak(finished.session, start + 25 * 60_000, 'sig-break');
assert.equal(unappliedFocusMs(broke, start + 26 * 60_000), 0);
assert.equal(settleSession(broke, start + 31 * 60_000).addMs, 0);
assert.equal(plannedBreakFor(0, 4), 'short');
assert.equal(plannedBreakFor(3, 4), 'long');
assert.deepEqual(cycleMarks(0, 4, true), { label: 'Подход 1 из 4', filled: 0 });
assert.deepEqual(cycleMarks(0, 4, false), { label: 'Подход 1 из 4', filled: 0 });
assert.deepEqual(cycleMarks(1, 4, false), { label: 'Подход 1 из 4', filled: 1 });
assert.deepEqual(cycleMarks(1, 4, true), { label: 'Подход 2 из 4', filled: 1 });
assert.deepEqual(cycleMarks(3, 4, true), { label: 'Подход 4 из 4', filled: 3 });
assert.deepEqual(cycleMarks(4, 4, false), { label: 'Цикл завершён', filled: 4 });
assert.deepEqual(cycleMarks(2, 4, false), { label: 'Подход 2 из 4', filled: 2 });
assert.equal(shouldAutoAdvance(start + 20 * 60_000, start + 20 * 60_000 + 1000, true), true);
assert.equal(shouldAutoAdvance(start + 20 * 60_000, start + 20 * 60_000 + 60_000, true), false);
assert.equal(shouldAutoAdvance(start + 20 * 60_000, start + 20 * 60_000 + 1000, false), false);
const long = startBreak(finished.session, start + 25 * 60_000, 'sig-long', 15, 'long');
assert.equal(long.durationMs, 15 * 60_000);
assert.equal(long.plannedBreak, 'long');

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
assert.deepEqual(clampCatPosition(0, 0, 1280, 800, 176, 76, 120, 1088), { x: 1088, y: 76 });
assert.deepEqual(clampCatPosition(2000, 2000, 1280, 800, 176, 76, 120, 1088), { x: 1096, y: 504 });
const phoneFrame = catFrame(390, 844, 24);
assert.equal(phoneFrame.lane, 0);
assert.equal(phoneFrame.tight, true);
assert.equal(phoneFrame.size, 72);
assert.equal(phoneFrame.top, 844 - 72 - 24);
assert.equal(catFrame(1280, 800, 24).top, 76);
assert.ok(catFrame(1280, 800, 24).lane > 80);
assert.equal(catFrame(1280, 800, 24).tight, false);

const duration = treatDurationMs();
assert.ok(duration >= 4000 && duration <= 5000);
assert.equal(TREAT_FRAMES[0].frame, 0);
assert.equal(TREAT_FRAMES.at(-1)?.frame, 5);
assert.ok(TREAT_FRAMES.filter((item) => item.frame === 2 || item.frame === 3).length >= 4);

const idle = defaultCatPrefs();
assert.deepEqual(treatOffer(0, { whiskas: false, sheba: false }), { line: 'До угощения — 20 мин', available: [] });
assert.deepEqual(treatOffer(19 * 60_000, { whiskas: false, sheba: false }), { line: 'До угощения — 1 мин', available: [] });
assert.deepEqual(treatOffer(WHISKAS_MS, { whiskas: false, sheba: false }).available, ['whiskas']);
assert.equal(treatOffer(WHISKAS_MS, { whiskas: false, sheba: false }).line, 'До угощения — 20 мин');
assert.deepEqual(treatOffer(SHEBA_MS, { whiskas: false, sheba: false }).available, ['whiskas', 'sheba']);
assert.equal(treatOffer(45 * 60_000, { whiskas: false, sheba: false }).line, '');
assert.deepEqual(treatOffer(45 * 60_000, { whiskas: true, sheba: false }).available, ['sheba']);
assert.equal(treatOffer(45 * 60_000, { whiskas: true, sheba: true }).line, 'Все угощения сегодня получены');
assert.equal(treatForMinutes(1), 'whiskas');
assert.equal(treatForMinutes(20), 'whiskas');
assert.equal(treatForMinutes(39), 'whiskas');
assert.equal(treatForMinutes(40), 'sheba');
assert.equal(treatForMinutes(60), 'sheba');
assert.equal(clampDialMinutes(0), 1);
assert.equal(clampDialMinutes(20.2), 20);
assert.equal(clampDialMinutes(90), 60);
assert.equal(dialMinutesFromAngle(0), 60);
assert.equal(dialMinutesFromAngle((1 / 60) * Math.PI * 2), 1);
assert.equal(dialMinutesFromAngle((20 / 60) * Math.PI * 2), 20);
assert.equal(clampDialDrag(59, 2), 60);
assert.equal(clampDialDrag(2, 58), 1);
assert.equal(clampDialDrag(20, 21), 21);
assert.equal(parseFocusSession({ ...session, rewarded: true })?.rewarded, true);
assert.equal(parseFocusSession(session)?.rewarded, false);

const todayCat = { ...idle, focusDate: '2026-11-20', focusMsToday: 19 * 60_000 };
const running = startFocus('task-1', 45, start, 'long');
assert.equal(focusWorkedMs(todayCat, running, start + 60_000, '2026-11-20'), 20 * 60_000);
assert.equal(focusWorkedMs(todayCat, { ...running, phase: 'break' }, start + 5 * 60_000, '2026-11-20'), 19 * 60_000);
const held = pauseSession(running, start + 60_000);
assert.equal(focusWorkedMs(todayCat, held.session, start + 90_000, '2026-11-20'), 19 * 60_000);
assert.equal(focusWorkedMs(todayCat, running, start + 60_000, '2026-11-21'), 60_000);
const once = feedTreat(todayCat, '2026-11-20', 'whiskas');
assert.equal(feedTreat(once, '2026-11-20', 'whiskas'), once);
assert.equal(once.focusMsToday, todayCat.focusMsToday);
assert.equal(once.treats.find((item) => item.date === '2026-11-19'), undefined);

console.log('focus session ok');
