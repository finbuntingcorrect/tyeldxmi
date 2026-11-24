import assert from 'node:assert/strict';
import { addDays } from '../../server/recurrence.ts';
import {
  chooseMode,
  parseNotebook,
  personName,
  setName,
  createHabit,
  dayHint,
  deleteHabit,
  goalWeekKey,
  renameHabit,
  setHabitArchived,
  createTask,
  emptyNotebook,
  needsHello,
  fromLegacyTasks,
  addWeekItem,
  assignWeekItem,
  habitProgressLabel,
  habitSpan,
  habitsForDate,
  materialize,
  bringReturnRow,
  carryOpenTasks,
  claimWeekItem,
  deferTask,
  dismissTask,
  moveTask,
  searchTasks,
  setDayNote,
  setTaskDuration,
  setTaskNote,
  deleteFollowingOccurrences,
  skipThisOccurrence,
  updateTask,
  nextHabitStatus,
  notebookIsEmpty,
  applyFocus,
  markTreatFed,
  setHabitMark,
  returnRows,
  tasksForDate,
  toggleTask,
  trackerProgressLabel,
  monthGrid,
  weekDates,
} from './notebook.ts';

const november = monthGrid('2026-11-18');
assert.equal(november.length, 42);
assert.equal(november[0], '2026-10-26');
assert.equal(november[41], '2026-12-06');
assert.equal(monthGrid('2026-11-01')[0], '2026-10-26');

const week = weekDates('2026-11-06');
assert.deepEqual(week, ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);

let book = createTask(emptyNotebook(), {
  title: 'Тренировка',
  date: '2026-11-06',
  dayPart: 'morning',
  priority: 'normal',
  repeatKind: 'weekdays',
  weekdays: [],
}, '2026-11-06T08:00:00.000Z');
book = materialize(book, '2026-11-06', '2026-11-13');
const friday = tasksForDate(book, '2026-11-06').filter((task) => task.title === 'Тренировка');
const monday = tasksForDate(book, '2026-11-09').filter((task) => task.title === 'Тренировка');
assert.equal(friday.length, 1);
assert.equal(monday.length, 1);
assert.equal(tasksForDate(book, '2026-11-07').some((task) => task.title === 'Тренировка'), false);

book = moveTask(book, friday[0].id, '2026-11-07');
book = materialize(book, '2026-11-06', '2026-11-16');
const saturday = tasksForDate(book, '2026-11-07').filter((task) => task.title === 'Тренировка');
assert.equal(saturday.length, 1);
assert.equal(saturday[0].originalDate, '2026-11-06');
assert.equal(saturday[0].dayPart, 'morning');
assert.equal(tasksForDate(book, '2026-11-09').length, 1);
assert.equal(tasksForDate(book, '2026-11-13').length, 1);
assert.equal(tasksForDate(book, '2026-11-06').some((task) => task.title === 'Тренировка'), false);

let tail = createTask(emptyNotebook(), {
  title: 'Отчёт',
  date: '2026-11-16',
  dayPart: 'evening',
  priority: 'normal',
  repeatKind: 'none',
  weekdays: [],
});
tail = createTask(tail, {
  title: 'Закрыто',
  date: '2026-11-16',
  dayPart: 'morning',
  priority: 'normal',
  repeatKind: 'none',
  weekdays: [],
});
const closed = tasksForDate(tail, '2026-11-16').find((task) => task.title === 'Закрыто');
assert.ok(closed);
tail = toggleTask(tail, closed.id);
const carried = carryOpenTasks(tail, '2026-11-16', '2026-11-17');
assert.equal(tasksForDate(carried, '2026-11-17').some((task) => task.title === 'Отчёт'), true);
assert.equal(tasksForDate(carried, '2026-11-16').some((task) => task.title === 'Отчёт'), false);
assert.equal(tasksForDate(carried, '2026-11-16').some((task) => task.title === 'Закрыто' && task.completed), true);
assert.equal(carryOpenTasks(carried, '2026-11-16', '2026-11-16'), carried);

let seriesBook = createTask(emptyNotebook(), {
  title: 'Тренировка',
  date: '2026-11-06',
  dayPart: 'morning',
  priority: 'normal',
  repeatKind: 'weekdays',
  weekdays: [],
}, '2026-11-06T08:00:00.000Z');
seriesBook = materialize(seriesBook, '2026-11-06', '2026-11-20');
const ruleBefore = JSON.parse(JSON.stringify(seriesBook.series[0])) as typeof seriesBook.series[0];
const seriesFriday = tasksForDate(seriesBook, '2026-11-06')[0];
const seriesMonday = tasksForDate(seriesBook, '2026-11-09')[0];
seriesBook = moveTask(seriesBook, seriesFriday.id, addDays(seriesFriday.date, 1));
seriesBook = moveTask(seriesBook, seriesMonday.id, addDays(seriesMonday.date, 7));
assert.deepEqual(seriesBook.series[0], ruleBefore);
assert.equal(tasksForDate(seriesBook, '2026-11-07')[0].seriesId, ruleBefore.id);
assert.equal(tasksForDate(seriesBook, '2026-11-07')[0].originalDate, '2026-11-06');
assert.equal(tasksForDate(seriesBook, '2026-11-07')[0].exception, true);
assert.equal(tasksForDate(seriesBook, '2026-11-16').some((task) => task.originalDate === '2026-11-09' && task.exception), true);
assert.equal(tasksForDate(seriesBook, '2026-11-13')[0].date, '2026-11-13');
assert.equal(tasksForDate(seriesBook, '2026-11-13')[0].exception, false);

let skipped = createTask(emptyNotebook(), {
  title: 'Тренировка',
  date: '2026-11-06',
  dayPart: 'morning',
  priority: 'normal',
  repeatKind: 'weekdays',
  weekdays: [],
}, '2026-11-06T08:00:00.000Z');
skipped = materialize(skipped, '2026-11-06', '2026-11-13');
const skipRule = JSON.parse(JSON.stringify(skipped.series[0])) as typeof skipped.series[0];
const skipFriday = tasksForDate(skipped, '2026-11-06')[0];
skipped = { ...skipped, focusId: skipFriday.id };
skipped = skipThisOccurrence(skipped, skipFriday.id);
assert.equal(skipped.focusId, null);
assert.equal(skipped.tasks.find((task) => task.id === skipFriday.id)?.deleted, true);
assert.deepEqual(skipped.skips, [{ seriesId: skipRule.id, originalDate: '2026-11-06' }]);
assert.deepEqual(skipped.series[0], skipRule);
assert.equal(tasksForDate(skipped, '2026-11-09').length, 1);
skipped = materialize(skipped, '2026-11-06', '2026-11-13');
assert.equal(tasksForDate(skipped, '2026-11-06').length, 0);
assert.equal(tasksForDate(skipped, '2026-11-09')[0].deleted, false);
assert.equal(skipped.series[0].start, skipRule.start);
assert.equal(skipped.series[0].until, skipRule.until);
assert.equal(skipped.series[0].repeatKind, skipRule.repeatKind);
assert.deepEqual(skipped.series[0].weekdays, skipRule.weekdays);
assert.equal(skipThisOccurrence(skipped, 'missing'), skipped);

let dailySkip = createTask(emptyNotebook(), {
  title: 'Страница',
  date: '2026-11-16',
  dayPart: 'morning',
  priority: 'normal',
  repeatKind: 'daily',
  weekdays: [],
}, '2026-11-16T08:00:00.000Z');
dailySkip = materialize(dailySkip, '2026-11-16', '2026-11-20');
const dailyUntil = dailySkip.series[0].until;
const dailyFirst = tasksForDate(dailySkip, '2026-11-16')[0];
dailySkip = skipThisOccurrence(dailySkip, dailyFirst.id);
assert.equal(tasksForDate(dailySkip, '2026-11-16').length, 0);
assert.equal(tasksForDate(dailySkip, '2026-11-17').length, 1);
assert.equal(dailySkip.series[0].until, dailyUntil);
assert.equal(dailySkip.series[0].start, '2026-11-16');
dailySkip = materialize(dailySkip, '2026-11-16', '2026-11-20');
assert.equal(tasksForDate(dailySkip, '2026-11-16').length, 0);
assert.equal(tasksForDate(dailySkip, '2026-11-17')[0].deleted, false);

let singleSkip = createTask(emptyNotebook(), {
  title: 'Разовая',
  date: '2026-11-16',
  dayPart: 'anytime',
  priority: 'normal',
  repeatKind: 'none',
  weekdays: [],
});
singleSkip = skipThisOccurrence(singleSkip, singleSkip.tasks[0].id);
assert.equal(singleSkip.tasks[0].deleted, true);
assert.equal(singleSkip.skips.length, 0);
assert.equal(tasksForDate(singleSkip, '2026-11-16').length, 0);

const noted = setDayNote(emptyNotebook(), '2026-11-17', '  Тихий день  ');
assert.equal(noted.dayNotes[0].text, 'Тихий день');
assert.equal(setDayNote(noted, '2026-11-17', '   ').dayNotes.length, 0);
const readNotes = parseNotebook({ dayNotes: [{ date: '2026-11-17', text: 'Было спокойно' }, { date: '2026-11-18', text: '   ' }] });
assert.equal(readNotes?.dayNotes.length, 1);
assert.equal(readNotes?.dayNotes[0].text, 'Было спокойно');
assert.equal(parseNotebook({ greeted: true, mode: 'planner' })?.dayNotes.length, 0);
const keptNote = parseNotebook(JSON.parse(JSON.stringify(noted)));
assert.equal(keptNote?.dayNotes[0].date, '2026-11-17');

let once = createTask(emptyNotebook(), {
  title: 'Разовое',
  date: '2026-11-17',
  dayPart: 'evening',
  priority: 'normal',
  repeatKind: 'none',
  weekdays: [],
});
const onceId = once.tasks[0].id;
once = dismissTask(once, onceId);
assert.equal(once.tasks.find((task) => task.id === onceId)?.deleted, true);
assert.equal(tasksForDate(once, '2026-11-17').length, 0);

let movedOnce = createTask(emptyNotebook(), {
  title: 'Перенесённое',
  date: '2026-11-16',
  dayPart: 'anytime',
  priority: 'normal',
  repeatKind: 'none',
  weekdays: [],
});
const movedId = movedOnce.tasks[0].id;
movedOnce = moveTask(movedOnce, movedId, '2026-11-17');
const deferred = deferTask(movedOnce, movedId);
assert.equal(deferred.tasks.find((task) => task.id === movedId)?.deleted, true);
assert.equal(deferred.weekItems.some((item) => item.kind === 'inbox' && item.week === null && item.title === 'Перенесённое'), true);
assert.equal(tasksForDate(deferred, '2026-11-17').some((task) => task.id === movedId), false);
const parked = parseNotebook({
  weekItems: [
    { id: 'later-a', week: null, kind: 'inbox', title: 'Когда-нибудь' },
    { id: 'later-b', week: '', kind: 'inbox', title: 'Пустая неделя' },
    { id: 'later-c', week: '2026-11-16', kind: 'inbox', title: 'На неделе' },
  ],
});
assert.deepEqual(parked?.weekItems.filter((item) => item.week === null).map((item) => item.title), ['Когда-нибудь', 'Пустая неделя']);
const claimed = claimWeekItem(parked ?? emptyNotebook(), 'later-a', '2026-11-16');
assert.equal(claimed.weekItems.find((item) => item.id === 'later-a')?.week, '2026-11-16');

let daily = createTask(emptyNotebook(), {
  title: 'Страница',
  date: '2026-11-14',
  dayPart: 'morning',
  priority: 'normal',
  repeatKind: 'daily',
  weekdays: [],
}, '2026-11-14T08:00:00.000Z');
daily = createTask(daily, {
  title: 'Старое письмо',
  date: '2026-11-14',
  dayPart: 'anytime',
  priority: 'normal',
  repeatKind: 'none',
  weekdays: [],
});
const dailyRule = JSON.parse(JSON.stringify(daily.series[0])) as typeof daily.series[0];
const waiting = returnRows(daily, '2026-11-18');
assert.equal(waiting.length, 2);
assert.equal(waiting.filter((row) => row.seriesId === dailyRule.id).length, 1);
assert.deepEqual(waiting.find((row) => row.seriesId)?.tasks.map((task) => task.date), ['2026-11-14', '2026-11-15', '2026-11-16']);
const brought = bringReturnRow(daily, '2026-11-18', dailyRule.id);
assert.deepEqual(brought.series[0], dailyRule);
assert.equal(brought.series[0].start, dailyRule.start);
assert.equal(brought.series[0].until, dailyRule.until);
assert.equal(tasksForDate(brought, '2026-11-18').some((task) => task.originalDate === '2026-11-16'), true);
assert.equal(tasksForDate(brought, '2026-11-14').some((task) => task.seriesId === dailyRule.id), false);
assert.equal(tasksForDate(brought, '2026-11-15').some((task) => task.seriesId === dailyRule.id), false);
assert.equal(tasksForDate(brought, '2026-11-17').some((task) => task.seriesId === dailyRule.id), true);

let why = createTask(emptyNotebook(), {
  title: 'Письмо',
  date: '2026-11-16',
  dayPart: 'anytime',
  priority: 'normal',
  repeatKind: 'none',
  weekdays: [],
});
const whyId = why.tasks[0].id;
why = setTaskNote(why, whyId, '  чтобы закрыть хвост  ');
assert.equal(why.tasks[0].note, 'чтобы закрыть хвост');
why = setTaskNote(why, whyId, 'я'.repeat(140));
assert.equal(why.tasks[0].note?.length, 120);
const readNote = parseNotebook(JSON.parse(JSON.stringify(why)));
assert.equal(readNote?.tasks[0].note?.length, 120);
const blankNote = parseNotebook({ version: 1, tasks: [{ id: 'blank-note', title: 'Пусто', date: '2026-11-16', note: '   ' }] });
assert.equal(blankNote?.tasks[0].note, null);
const oldNote = parseNotebook({ version: 1, tasks: [{ id: 'old-note', title: 'Старое', date: '2026-11-16' }] });
assert.equal(oldNote?.tasks[0].note, null);
why = setTaskNote(why, whyId, '   ');
assert.equal(why.tasks[0].note, null);
const notedTask = createTask(emptyNotebook(), {
  title: 'С заметкой',
  date: '2026-11-16',
  dayPart: 'morning',
  priority: 'high',
  repeatKind: 'none',
  weekdays: [],
  note: '  не забыть  ',
});
assert.equal(notedTask.tasks[0].note, 'не забыть');
const notedDaily = createTask(emptyNotebook(), {
  title: 'Каждый день',
  date: '2026-11-16',
  dayPart: 'morning',
  priority: 'normal',
  repeatKind: 'daily',
  weekdays: [],
  note: 'утром',
});
assert.equal(tasksForDate(notedDaily, '2026-11-16')[0].note, 'утром');
why = setTaskDuration(why, whyId, 'long');
assert.equal(why.tasks[0].duration, 'long');
assert.equal(parseNotebook(JSON.parse(JSON.stringify(why)))?.tasks[0].duration, 'long');
assert.equal(parseNotebook({ version: 1, tasks: [{ id: 'plain', title: 'Без длины', date: '2026-11-16' }] })?.tasks[0].duration, null);
const hidden = createTask(why, {
  title: 'Скрытое',
  date: '2026-11-16',
  dayPart: 'anytime',
  priority: 'normal',
  repeatKind: 'none',
  weekdays: [],
});
const hiddenId = hidden.tasks.find((task) => task.title === 'Скрытое')?.id ?? '';
const searchable = dismissTask(setTaskNote(hidden, whyId, 'тихий хвост'), hiddenId);
assert.equal(searchTasks(searchable, 'хвост').some((task) => task.id === whyId), true);
assert.equal(searchTasks(searchable, 'Скрытое').length, 0);
const finished = toggleTask(searchable, whyId);
assert.equal(searchTasks(finished, 'хвост').some((task) => task.completed), true);

const focusBook = toggleTask(book, saturday[0].id, '2026-11-07T12:00:00.000Z');
assert.equal(tasksForDate(focusBook, '2026-11-07')[0].completed, true);

let habits = createHabit(emptyNotebook(), 'Почитать 20 минут', 'daily', [], '2026-11-06');
const habitId = habits.habits[0].id;
habits = setHabitMark(habits, habitId, '2026-11-06', 'done');
assert.equal(habitsForDate(habits, '2026-11-06')[0].status, 'done');
assert.equal(habitsForDate(habits, '2026-11-07')[0].status, null);
assert.equal(habits.marks.find((mark) => mark.date === '2026-11-06')?.status, 'done');
habits = setHabitMark(habits, habitId, '2026-11-06', null);
assert.equal(habitsForDate(habits, '2026-11-06')[0].status, null);

const weekdayHabit = createHabit(emptyNotebook(), 'Зарядка', 'weekdays', [], '2026-11-06');
assert.equal(habitsForDate(weekdayHabit, '2026-11-06').length, 1);
assert.equal(habitsForDate(weekdayHabit, '2026-11-07').length, 0);
assert.equal(habitsForDate(weekdayHabit, addDays('2026-11-06', 3)).length, 1);

assert.equal(habitProgressLabel(2, 4), '2 из 4 привычек выполнено');
assert.equal(habitProgressLabel(1, 1), '1 из 1 привычки выполнена');

const legacy = fromLegacyTasks([{
  id: 'local-1',
  title: 'Старая задача',
  completed: true,
  createdAt: '2026-11-01T00:00:00.000Z',
  completedAt: '2026-11-01T01:00:00.000Z',
  date: '2026-11-01',
}]);
assert.equal(legacy.tasks[0].completed, true);
assert.equal(legacy.tasks[0].date, '2026-11-01');
assert.equal(chooseMode(legacy, 'planner').greeted, true);
assert.equal(setName(emptyNotebook(), '  Аня  ').name, 'Аня');
assert.equal(setName(emptyNotebook(), 'anya@example.com').name, '');
assert.equal(personName('Аня', 'anya@example.com'), 'Аня');
assert.equal(personName('anya@example.com', 'anya@example.com'), '');
assert.equal(personName('other@example.com', 'anya@example.com'), '');
const named = parseNotebook({ greeted: true, mode: 'focus', name: '  Катя ', theme: 'pink', tasks: [] });
assert.equal(named?.name, 'Катя');
assert.equal(named?.theme, 'pink');
assert.equal(parseNotebook({ greeted: true, mode: 'habits', theme: 'purple' })?.theme, null);

const wednesday = createTask(emptyNotebook(), {
  title: 'Собрание',
  date: '2026-11-04',
  dayPart: 'anytime',
  priority: 'high',
  repeatKind: 'none',
  weekdays: [],
});
assert.equal(tasksForDate(wednesday, '2026-11-04')[0].title, 'Собрание');
assert.equal(weekDates('2026-11-04').every((day) => day === '2026-11-04' || !tasksForDate(wednesday, day).some((task) => task.title === 'Собрание')), true);
const kept = parseNotebook(JSON.parse(JSON.stringify(wednesday)));
assert.equal(kept?.tasks[0].title, 'Собрание');
assert.equal(kept?.weekItems.length, 0);

let notes = addWeekItem(emptyNotebook(), '2026-11-02', 'inbox', 'Без даты');
notes = addWeekItem(notes, '2026-11-09', 'goal', 'Другая неделя');
assert.equal(notes.weekItems.filter((item) => item.week === '2026-11-02').length, 1);
const assigned = assignWeekItem(notes, notes.weekItems[0].id, '2026-11-04');
assert.equal(assigned.weekItems.some((item) => item.kind === 'inbox'), false);
assert.equal(tasksForDate(assigned, '2026-11-04')[0].title, 'Без даты');
assert.equal(assigned.weekItems[0].title, 'Другая неделя');

const first = createHabit(emptyNotebook(), 'Читать 20 минут', 'daily', [], '2026-11-01');
const second = createHabit(first, '10 минут зарядки', 'daily', [], '2026-11-06');
assert.equal(habitSpan(first.habits[0].start).length, 30);
assert.equal(habitSpan(second.habits[1].start)[0], '2026-11-06');
assert.equal(habitSpan(second.habits[0].start)[0], '2026-11-01');
const marked = setHabitMark(second, second.habits[0].id, '2026-11-01', 'done');
assert.equal(marked.marks.filter((mark) => mark.habitId === second.habits[1].id).length, 0);
assert.equal(marked.marks.filter((mark) => mark.habitId === second.habits[0].id).length, 1);
assert.equal(trackerProgressLabel(8), '8 из 30 дней выполнено');
assert.equal(notebookIsEmpty(emptyNotebook()), true);
assert.equal(notebookIsEmpty(first), false);
assert.equal(nextHabitStatus(null), 'done');
assert.equal(nextHabitStatus('done'), 'missed');
assert.equal(nextHabitStatus('missed'), null);

const timed = createTask(emptyNotebook(), {
  title: 'Письмо',
  date: '2026-11-12',
  dayPart: 'anytime',
  priority: 'normal',
  repeatKind: 'none',
  weekdays: [],
});
const timedId = timed.tasks[0].id;
const banked = applyFocus(timed, { taskId: timedId, phase: 'focus', focusMinutes: 20, durationMs: 1_200_000, endsAt: null, pausedRemainingMs: 1_140_000, paused: true, sliceAppliedMs: 60_000, settled: false, full: false, plannedBreak: 'short', reminded: false, signalId: 'sig' }, { taskId: timedId, addMs: 60_000 }, 50);
assert.equal(banked.tasks[0].focusMs, 60_000);
assert.equal(banked.cat.focusMsToday, 60_000);
assert.equal(banked.cat.focusCompleted, 0);
const same = applyFocus(banked, banked.focusSession, { taskId: timedId, focusMs: 60_000 }, 60);
assert.equal(same.tasks[0].focusMs, 60_000);
assert.equal(same.cat.focusMsToday, 60_000);
const rounded = applyFocus(same, { ...same.focusSession!, settled: true, full: true, paused: false }, { taskId: timedId, addMs: 0 }, 70);
assert.equal(rounded.cat.focusCompleted, 1);
assert.equal(rounded.cat.focusCycle, 1);
const twice = applyFocus(rounded, rounded.focusSession, { taskId: timedId, focusMs: 60_000 }, 80);
assert.equal(twice.cat.focusCompleted, 1);
const earlyFocus = applyFocus(twice, { ...twice.focusSession!, signalId: 'early', settled: true, full: false }, { taskId: timedId, addMs: 0 }, 90);
assert.equal(earlyFocus.cat.focusCompleted, 1);
assert.equal(earlyFocus.cat.focusCycle, 1);
const rested = applyFocus(earlyFocus, { ...earlyFocus.focusSession!, signalId: 'break-1', phase: 'break', settled: true, full: true }, undefined, 95);
assert.equal(rested.cat.focusCompleted, 1);
assert.equal(rested.cat.focusCycle, 1);
const restedAgain = applyFocus(rested, rested.focusSession, undefined, 96);
assert.equal(restedAgain.cat.focusCompleted, 1);
let cycle = earlyFocus;
for (let step = 2; step <= 4; step += 1) {
  const signal = `round-${step}`;
  const open = applyFocus(cycle, { ...cycle.focusSession!, signalId: signal, settled: false, full: false, phase: 'focus' }, undefined, 100 + step);
  assert.equal(open.cat.focusCycle, step - 1);
  cycle = applyFocus(open, { ...open.focusSession!, settled: true, full: true }, undefined, 110 + step);
  assert.equal(cycle.cat.focusCycle, step);
  assert.equal(cycle.cat.focusCompleted, step);
  const again = applyFocus(cycle, cycle.focusSession, undefined, 120 + step);
  assert.equal(again.cat.focusCompleted, step);
}
const keptToday = applyFocus(cycle, { ...cycle.focusSession!, signalId: 'next', settled: false, full: false, phase: 'focus' }, { taskId: timedId, resetCycle: true }, 200);
assert.equal(keptToday.cat.focusCycle, 0);
assert.equal(keptToday.cat.focusCompleted, 4);
const withTreat = markTreatFed(keptToday, '2026-11-20', 'whiskas');
assert.equal(withTreat.cat.treats.some((item) => item.date === '2026-11-20' && item.whiskas), true);
assert.equal(markTreatFed(withTreat, '2026-11-20', 'whiskas'), withTreat);
assert.equal(withTreat.focusSession?.signalId, keptToday.focusSession?.signalId);
assert.equal(withTreat.cat.focusCompleted, 4);
const nextMorning = new Date(2026, 10, 21, 9, 0, 0).getTime();
const rolled = applyFocus(withTreat, null, undefined, nextMorning);
assert.equal(rolled.cat.focusMsToday, 0);
assert.equal(rolled.cat.focusCompleted, 0);
assert.equal(rolled.cat.treats.some((item) => item.date === '2026-11-20' && item.whiskas && !item.sheba), true);
const keptHistory = parseNotebook(JSON.parse(JSON.stringify(rolled)));
assert.equal(keptHistory?.cat.treats.some((item) => item.date === '2026-11-20' && item.whiskas), true);
const restored = parseNotebook(JSON.parse(JSON.stringify(same)));
assert.equal(restored?.focusSession?.paused, true);
assert.equal(restored?.focusSession?.taskId, timedId);
assert.equal(restored?.tasks[0].focusMs, 60_000);
assert.equal(restored?.cat.reminders, false);
assert.equal(restored?.cat.sound, false);

let repeated = createTask(emptyNotebook(), {
  title: 'Страница',
  date: '2026-11-16',
  dayPart: 'morning',
  priority: 'normal',
  repeatKind: 'daily',
  weekdays: [],
}, '2026-11-16T08:00:00.000Z');
repeated = materialize(repeated, '2026-11-16', '2026-11-18');
const firstRepeat = tasksForDate(repeated, '2026-11-16')[0];
const secondRepeat = tasksForDate(repeated, '2026-11-17')[0];
repeated = toggleTask(repeated, firstRepeat.id, '2026-11-16T21:00:00.000Z');
assert.equal(tasksForDate(repeated, '2026-11-16')[0].completed, true);
assert.equal(tasksForDate(repeated, '2026-11-17')[0].completed, false);
const beforeAnotherPass = repeated.tasks.filter((task) => task.seriesId === firstRepeat.seriesId && !task.deleted).length;
repeated = materialize(repeated, '2026-11-16', '2026-11-18');
assert.equal(repeated.tasks.filter((task) => task.seriesId === firstRepeat.seriesId && !task.deleted).length, beforeAnotherPass);
assert.equal(tasksForDate(repeated, '2026-11-17').filter((task) => task.id === secondRepeat.id).length, 1);

let monthEnd = createTask(emptyNotebook(), {
  title: 'Отчёт',
  date: '2026-01-31',
  dayPart: 'anytime',
  priority: 'normal',
  repeatKind: 'monthly',
  weekdays: [],
  monthDay: 31,
}, '2026-01-31T08:00:00.000Z');
monthEnd = materialize(monthEnd, '2026-01-31', '2026-04-30');
assert.equal(tasksForDate(monthEnd, '2026-01-31').length, 1);
assert.equal(tasksForDate(monthEnd, '2026-02-27').length, 0);
assert.equal(tasksForDate(monthEnd, '2026-02-28').length, 1);
assert.equal(tasksForDate(monthEnd, '2026-03-31').length, 1);
assert.equal(tasksForDate(monthEnd, '2026-04-30').length, 1);
const february = tasksForDate(monthEnd, '2026-02-28')[0];
monthEnd = skipThisOccurrence(monthEnd, february.id);
monthEnd = materialize(monthEnd, '2026-01-31', '2026-03-31');
assert.equal(tasksForDate(monthEnd, '2026-02-28').length, 0);
assert.equal(tasksForDate(monthEnd, '2026-03-31').length, 1);
assert.equal(monthEnd.series[0].monthDay, 31);
assert.equal(monthEnd.series[0].until, null);

let editable = createTask(emptyNotebook(), {
  title: 'Зарядка',
  date: '2026-11-16',
  dayPart: 'morning',
  priority: 'normal',
  repeatKind: 'daily',
  weekdays: [],
}, '2026-11-16T08:00:00.000Z');
editable = materialize(editable, '2026-11-16', '2026-11-20');
const keptDone = tasksForDate(editable, '2026-11-16')[0];
editable = toggleTask(editable, keptDone.id, '2026-11-16T21:00:00.000Z');
const changedDay = tasksForDate(editable, '2026-11-18')[0];
editable = updateTask(editable, changedDay.id, {
  title: 'Пробежка',
  date: '2026-11-18',
  dayPart: 'morning',
  priority: 'normal',
  repeatKind: 'daily',
  weekdays: [],
}, 'future', '2026-11-18T08:00:00.000Z');
assert.equal(tasksForDate(editable, '2026-11-16')[0].title, 'Зарядка');
assert.equal(tasksForDate(editable, '2026-11-16')[0].completed, true);
assert.equal(tasksForDate(editable, '2026-11-18')[0].title, 'Пробежка');
assert.equal(tasksForDate(editable, '2026-11-20')[0].title, 'Пробежка');
const visibleBefore = editable.tasks.filter((task) => !task.deleted && task.title === 'Пробежка').length;
editable = materialize(editable, '2026-11-16', '2026-11-20');
assert.equal(editable.tasks.filter((task) => !task.deleted && task.title === 'Пробежка').length, visibleBefore);

const cut = tasksForDate(editable, '2026-11-19')[0];
editable = deleteFollowingOccurrences(editable, cut.id);
editable = materialize(editable, '2026-11-16', '2026-11-20');
assert.equal(tasksForDate(editable, '2026-11-16')[0].completed, true);
assert.equal(tasksForDate(editable, '2026-11-18').length, 1);
assert.equal(tasksForDate(editable, '2026-11-19').length, 0);
assert.equal(tasksForDate(editable, '2026-11-20').length, 0);

const legacySeries = parseNotebook({
  series: [{ id: 'old', title: 'Пн и ср', start: '2026-11-02', repeatKind: 'weekly', weekdays: [1, 3], until: '2026-12-01' }],
});
assert.equal(legacySeries?.series[0].interval, 1);
assert.equal(legacySeries?.series[0].monthDay, null);
assert.equal(legacySeries?.series[0].until, '2026-12-01');
assert.deepEqual(legacySeries?.series[0].weekdays, [1, 3]);

let ranked = emptyNotebook();
ranked = createTask(ranked, { title: 'Позже обычная', date: '2026-11-20', dayPart: 'morning', priority: 'normal', repeatKind: 'none', weekdays: [] }, '2026-11-20T10:00:00.000Z');
ranked = createTask(ranked, { title: 'Низкая', date: '2026-11-20', dayPart: 'morning', priority: 'low', repeatKind: 'none', weekdays: [] }, '2026-11-20T08:00:00.000Z');
ranked = createTask(ranked, { title: 'Важная', date: '2026-11-20', dayPart: 'morning', priority: 'high', repeatKind: 'none', weekdays: [] }, '2026-11-20T09:00:00.000Z');
ranked = createTask(ranked, { title: 'Раньше обычная', date: '2026-11-20', dayPart: 'morning', priority: 'normal', repeatKind: 'none', weekdays: [] }, '2026-11-20T07:00:00.000Z');
const morningOrder = tasksForDate(ranked, '2026-11-20').filter((task) => task.dayPart === 'morning').map((task) => task.title);
assert.deepEqual(morningOrder, ['Важная', 'Раньше обычная', 'Позже обычная', 'Низкая']);

assert.equal(dayHint(1, 2, 0, 1, false), 'Есть незакрытые дела');
assert.equal(dayHint(0, 2, 1, 1, false), 'Есть незакрытые дела');
assert.equal(dayHint(0, 2, 0, 1, false), 'Можно отдохнуть');
assert.equal(dayHint(0, 0, 0, 0, false), 'На сегодня тихо');
assert.equal(dayHint(1, 2, 1, 1, true), 'Задача выполнена');
assert.equal(goalWeekKey('2026-12', '2026-11-20', '2026-12-20'), '2026-12-14');
assert.equal(goalWeekKey('2026-12', '2026-11-20', null), '2026-11-30');
assert.equal(goalWeekKey('2026-11', '2026-11-20', '2026-12-20'), '2026-11-16');

let managed = createHabit(emptyNotebook(), 'Вода', 'daily', [], '2026-11-01');
const managedId = managed.habits[0].id;
managed = setHabitMark(managed, managedId, '2026-11-20', 'done');
assert.equal(habitsForDate(managed, '2026-11-20')[0].status, 'done');
managed = renameHabit(managed, managedId, 'Вода с лимоном');
assert.equal(managed.habits[0].title, 'Вода с лимоном');
assert.equal(managed.marks.length, 1);
managed = setHabitArchived(managed, managedId, true);
assert.equal(habitsForDate(managed, '2026-11-20').length, 0);
assert.equal(managed.marks.length, 1);
const keptHabit = parseNotebook(managed);
assert.equal(keptHabit?.habits[0].archived, true);
assert.equal(keptHabit?.habits[0].title, 'Вода с лимоном');
const legacyHabit = parseNotebook({ habits: [{ id: 'h1', title: 'Чтение', repeatKind: 'daily', weekdays: [], start: '2026-11-01' }] });
assert.equal(legacyHabit?.habits[0].archived, false);
managed = deleteHabit(managed, managedId);
assert.equal(managed.habits.length, 0);
assert.equal(managed.marks.length, 0);

assert.equal(needsHello(emptyNotebook()), true);
assert.equal(needsHello(chooseMode(emptyNotebook(), 'planner')), false);
const withTask = createTask(emptyNotebook(), { title: 'Старая', date: '2026-11-20', dayPart: 'morning', priority: 'normal', repeatKind: 'none', weekdays: [] }, '2026-11-20T10:00:00.000Z');
assert.equal(withTask.greeted, false);
assert.equal(needsHello(withTask), false);
const greetedWithTask = parseNotebook({ ...withTask, greeted: true, mode: 'planner' });
assert.equal(needsHello(greetedWithTask ?? emptyNotebook()), false);

let keptDaily = createTask(emptyNotebook(), {
  title: 'Страница',
  date: '2026-11-01',
  dayPart: 'morning',
  priority: 'normal',
  repeatKind: 'daily',
  weekdays: [],
}, '2026-11-01T08:00:00.000Z');
keptDaily = materialize(keptDaily, '2026-11-01', '2026-12-15');
const novemberDay = tasksForDate(keptDaily, '2026-11-20')[0];
keptDaily = toggleTask(keptDaily, novemberDay.id, '2026-11-20T12:00:00.000Z');
const seriesRule = JSON.parse(JSON.stringify(keptDaily.series[0])) as typeof keptDaily.series[0];
const beforeMonth = keptDaily.tasks.filter((task) => task.seriesId === novemberDay.seriesId).length;
const decemberDay = tasksForDate(keptDaily, '2026-12-01')[0];
keptDaily = moveTask(keptDaily, decemberDay.id, '2026-12-02');
keptDaily = materialize(keptDaily, '2026-11-01', '2026-12-15');
assert.equal(keptDaily.tasks.filter((task) => task.seriesId === novemberDay.seriesId).length, beforeMonth);
assert.equal(tasksForDate(keptDaily, '2026-11-20')[0].completed, true);
assert.equal(tasksForDate(keptDaily, '2026-11-20')[0].completedAt, '2026-11-20T12:00:00.000Z');
assert.equal(tasksForDate(keptDaily, '2026-12-01').length, 0);
const decemberSecond = tasksForDate(keptDaily, '2026-12-02');
const shifted = decemberSecond.find((task) => task.originalDate === '2026-12-01');
assert.ok(shifted);
assert.equal(decemberSecond.some((task) => task.originalDate === '2026-12-02'), true);
assert.equal(tasksForDate(keptDaily, '2026-12-03')[0].date, '2026-12-03');
assert.deepEqual(keptDaily.series[0], seriesRule);
const savedAgain = updateTask(keptDaily, shifted.id, {
  title: shifted.title,
  date: shifted.date,
  dayPart: shifted.dayPart,
  priority: shifted.priority,
  repeatKind: 'daily',
  weekdays: [],
}, 'one', '2026-12-02T08:00:00.000Z');
assert.equal(savedAgain.tasks.length, keptDaily.tasks.length);
assert.equal(tasksForDate(savedAgain, '2026-11-20')[0].completed, true);
assert.deepEqual(savedAgain.series[0], seriesRule);

console.log('notebook ok');
