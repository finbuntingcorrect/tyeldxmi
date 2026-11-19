import assert from 'node:assert/strict';
import { addDays } from '../../server/recurrence.ts';
import {
  chooseMode,
  parseNotebook,
  setName,
  createHabit,
  createTask,
  emptyNotebook,
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
  skipThisOccurrence,
  nextHabitStatus,
  notebookIsEmpty,
  applyFocus,
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
const banked = applyFocus(timed, { taskId: timedId, phase: 'focus', focusMinutes: 20, durationMs: 1_200_000, endsAt: null, pausedRemainingMs: 1_140_000, paused: true, sliceAppliedMs: 60_000, settled: false, reminded: false, signalId: 'sig' }, { taskId: timedId, addMs: 60_000 }, 50);
assert.equal(banked.tasks[0].focusMs, 60_000);
const same = applyFocus(banked, banked.focusSession, { taskId: timedId, focusMs: 60_000 }, 60);
assert.equal(same.tasks[0].focusMs, 60_000);
const restored = parseNotebook(JSON.parse(JSON.stringify(same)));
assert.equal(restored?.focusSession?.paused, true);
assert.equal(restored?.focusSession?.taskId, timedId);
assert.equal(restored?.tasks[0].focusMs, 60_000);
assert.equal(restored?.cat.reminders, false);
assert.equal(restored?.cat.sound, false);

console.log('notebook ok');
