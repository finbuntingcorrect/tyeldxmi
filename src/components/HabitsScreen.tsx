import { useState } from 'react';
import { dateFromKey, formatLocalDate } from '../lib/date';
import { habitSpan, nextHabitStatus, weekDates, type HabitStatus, type Notebook } from '../lib/notebook';
import { WEEKDAYS } from '../lib/plannerCopy';
import type { RepeatKind } from '../types';

const PRESETS = ['10 минут зарядки', 'Читать 20 минут', 'Учить английский'];

type HabitsScreenProps = {
  book: Notebook;
  today: string;
  onCreate: (title: string, repeatKind: RepeatKind, weekdays: number[], start: string) => void;
  onMark: (habitId: string, date: string, status: HabitStatus | null) => void;
};

function shortStart(start: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(dateFromKey(start));
}

function statusLabel(status: HabitStatus | null) {
  if (status === 'done') return 'сделано';
  if (status === 'missed') return 'не в счёт';
  return 'пусто';
}

function markTone(status: HabitStatus | null) {
  if (status === 'done') return 'border-ink bg-ink';
  if (status === 'missed') return 'border-line bg-transparent';
  return 'border-line bg-transparent opacity-40';
}

function HabitCard({
  habit,
  today,
  marks,
  onMark,
}: {
  habit: Notebook['habits'][number];
  today: string;
  marks: Notebook['marks'];
  onMark: HabitsScreenProps['onMark'];
}) {
  const days = habitSpan(habit.start);
  const week = weekDates(today);
  const weekDone = week.filter((date) => marks.some((mark) => mark.habitId === habit.id && mark.date === date && mark.status === 'done')).length;

  function markDay(date: string, status: HabitStatus | null) {
    if (date > today || date < habit.start) return;
    onMark(habit.id, date, nextHabitStatus(status));
  }

  return (
    <article data-habit={habit.id} className="py-2">
      <p className="text-lg break-words text-ink">{habit.title}</p>
      <p className="mt-1 text-sm text-muted">На этой неделе {weekDone} точек</p>
      <p className="mt-1 text-xs text-muted">с {shortStart(habit.start)}</p>
      <div className="mt-4 grid grid-cols-7 gap-1">
        {week.map((date, index) => {
          const status = marks.find((mark) => mark.habitId === habit.id && mark.date === date)?.status ?? null;
          const locked = date > today || date < habit.start;
          return (
            <button
              key={date}
              type="button"
              disabled={locked}
              aria-current={date === today ? 'date' : undefined}
              aria-pressed={status === 'done'}
              aria-label={`${habit.title}, ${WEEKDAYS[index].label}, ${formatLocalDate(dateFromKey(date))}, ${statusLabel(status)}`}
              onClick={() => markDay(date, status)}
              className={`flex min-h-11 flex-col items-center justify-center gap-1 ${locked ? 'cursor-default opacity-40' : 'cursor-pointer'}`}
            >
              <span className="text-xs text-muted">{WEEKDAYS[index].label}</span>
              <span aria-hidden="true" className={`h-3.5 w-3.5 rounded-full border ${markTone(status)} ${date === today ? 'ring-2 ring-primary ring-offset-2' : ''}`} />
            </button>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-6 gap-1.5">
        {days.map((date) => {
          const status = marks.find((mark) => mark.habitId === habit.id && mark.date === date)?.status ?? null;
          const ahead = date > today;
          return (
            <button
              key={date}
              type="button"
              disabled={ahead}
              aria-current={date === today ? 'date' : undefined}
              aria-pressed={status === 'done'}
              aria-label={`${habit.title}, ${formatLocalDate(dateFromKey(date))}, ${statusLabel(status)}`}
              onClick={() => markDay(date, status)}
              className={`mx-auto grid h-6 w-6 place-items-center ${ahead ? 'cursor-default opacity-40' : 'cursor-pointer'}`}
            >
              <span aria-hidden="true" className={`h-3 w-3 rounded-full border ${markTone(status)} ${date === today ? 'ring-2 ring-primary ring-offset-1' : ''}`} />
            </button>
          );
        })}
      </div>
    </article>
  );
}

export function HabitsScreen({ book, today, onCreate, onMark }: HabitsScreenProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  function add(name: string) {
    const next = name.trim();
    if (!next) return;
    onCreate(next, 'daily', [], today);
    setTitle('');
    setOpen(false);
  }

  return (
    <section>
      <header className="px-4 py-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Привычки</p>
        <h2 className="mt-1 font-serif text-4xl">Тридцать дней</h2>
        <div className="mx-3 mt-2 border-t border-line" />
        {book.habits.length > 0 ? <p className="mt-2 text-sm text-muted">Точка: сделано, не в счёт, пусто.</p> : null}
      </header>
      <div className="px-4 py-4 sm:px-6">
        <button type="button" onClick={() => setOpen((value) => !value)} className="paper-submit">Добавить привычку</button>
        {open ? (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button key={preset} type="button" onClick={() => add(preset)} className="min-h-11 border border-line px-3 text-sm font-semibold">{preset}</button>
              ))}
            </div>
            <form className="mt-4" onSubmit={(event) => { event.preventDefault(); add(title); }}>
              <label htmlFor="habit-title" className="text-sm font-semibold">Своя привычка</label>
              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end">
                <input id="habit-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="paper-field" />
                <button type="submit" className="paper-submit">Добавить</button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
      {book.habits.length === 0 ? <p className="px-4 py-6 text-sm text-muted sm:px-6">Пока нет привычек.</p> : (
        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
          {book.habits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} today={today} marks={book.marks} onMark={onMark} />
          ))}
        </div>
      )}
    </section>
  );
}
