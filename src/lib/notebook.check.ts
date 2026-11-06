import assert from 'node:assert/strict';
import { addDays } from '../../server/recurrence';
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
  moveTask,
  setHabitMark,
  tasksForDate,
  toggleTask,
  trackerProgressLabel,
  weekDates,
} from './notebook';

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

console.log('notebook ok');
