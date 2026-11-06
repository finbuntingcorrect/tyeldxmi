import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { WEEKDAYS } from '../lib/plannerCopy';
import { habitProgressLabel, habitsForDate, weekDates, type Habit, type HabitStatus, type Notebook } from '../lib/notebook';
import type { RepeatKind } from '../types';

type HabitsScreenProps = {
  book: Notebook;
  today: string;
  onCreate: (title: string, repeatKind: RepeatKind, weekdays: number[], start: string) => void;
  onMark: (habitId: string, date: string, status: HabitStatus | null) => void;
};

function cycle(status: HabitStatus | null): HabitStatus | null {
  if (status === null) return 'done';
  if (status === 'done') return 'missed';
  return null;
}

function stateName(status: HabitStatus | null) {
  if (status === 'done') return 'сделано';
  if (status === 'missed') return 'не сделано';
  return 'без отметки';
}

function scheduled(book: Notebook, habit: Habit, date: string) {
  return habitsForDate(book, date).some((row) => row.habit.id === habit.id);
}

export function HabitsScreen({ book, today, onCreate, onMark }: HabitsScreenProps) {
  const week = weekDates(today);
  const todayRows = habitsForDate(book, today);
  const done = todayRows.filter((row) => row.status === 'done').length;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [repeatKind, setRepeatKind] = useState<RepeatKind>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);

  function submit() {
    onCreate(title, repeatKind, weekdays, week[0]);
    setTitle('');
    setOpen(false);
  }

  return (
    <section>
      <header className="border-b border-line px-4 py-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Неделя</p>
        <h2 className="mt-1 text-3xl">Привычки</h2>
        <p className="mt-2 text-sm text-muted">{todayRows.length === 0 ? 'На сегодня привычек нет' : habitProgressLabel(done, todayRows.length)}</p>
      </header>
      {book.habits.length === 0 ? <p className="px-4 py-6 text-sm text-muted sm:px-6">Добавьте первую привычку, и здесь появится сетка на семь дней.</p> : (
        <div>
          <div className="grid grid-cols-7 border-b border-line sm:grid-cols-[minmax(9rem,14rem)_1fr]" aria-hidden="true">
            <div className="hidden sm:block" />
            <div className="col-span-7 grid grid-cols-7 sm:col-span-1">
              {week.map((day, index) => (
                <div key={day} className={`px-1 py-2 text-center ${day === today ? 'shadow-[inset_0_-2px_0_var(--color-primary)]' : ''}`}>
                  <span className="block text-[11px] font-semibold text-muted">{WEEKDAYS[index].label}</span>
                  <span className="mt-0.5 block font-serif text-lg">{Number(day.slice(8))}</span>
                </div>
              ))}
            </div>
          </div>
          <ul>
            {book.habits.map((habit) => (
              <li key={habit.id} className="grid grid-cols-1 border-b border-line sm:grid-cols-[minmax(9rem,14rem)_1fr] sm:items-center">
                <h3 className="px-4 pt-3 text-xl sm:px-6 sm:py-3">{habit.title}</h3>
                <div className="grid grid-cols-7">
                  {week.map((day, index) => {
                    const active = scheduled(book, habit, day);
                    const status = book.marks.find((mark) => mark.habitId === habit.id && mark.date === day)?.status ?? null;
                    if (!active) return <div key={day} className="grid h-11 place-items-center"><span className="h-4 w-4 border border-line" /></div>;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => onMark(habit.id, day, cycle(status))}
                        aria-label={`${habit.title}, ${WEEKDAYS[index].label} ${Number(day.slice(8))}: ${stateName(status)}`}
                        className="grid h-11 place-items-center"
                      >
                        <span aria-hidden="true" className={`grid h-4 w-4 place-items-center border ${status === 'done' ? 'border-success text-success' : status === 'missed' ? 'border-danger text-danger' : 'border-ink'}`}>
                          {status === 'done' ? <Check size={12} strokeWidth={2.5} /> : null}
                          {status === 'missed' ? <X size={12} strokeWidth={2.5} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
          <p className="flex flex-wrap gap-4 px-4 py-3 text-xs text-muted sm:px-6">
            <span className="inline-flex items-center gap-2"><span className="inline-block h-3.5 w-3.5 border border-ink" /> без отметки</span>
            <span className="inline-flex items-center gap-2"><span className="inline-grid h-3.5 w-3.5 place-items-center border border-success text-success"><Check size={10} /></span> сделано</span>
            <span className="inline-flex items-center gap-2"><span className="inline-grid h-3.5 w-3.5 place-items-center border border-danger text-danger"><X size={10} /></span> не сделано</span>
          </p>
        </div>
      )}
      <div className="border-t border-line px-4 py-4 sm:px-6">
        <button type="button" onClick={() => setOpen((value) => !value)} className="paper-submit">Добавить привычку</button>
        {open ? (
          <form className="mt-4" onSubmit={(event) => { event.preventDefault(); submit(); }}>
            <label htmlFor="habit-title" className="text-sm font-semibold">Название</label>
            <input id="habit-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="paper-field" />
            <div className="mt-3 flex flex-wrap">
              {(['daily', 'weekdays', 'weekly'] as const).map((kind) => (
                <button key={kind} type="button" aria-pressed={repeatKind === kind} onClick={() => setRepeatKind(kind)} className="paper-choice">
                  {kind === 'daily' ? 'Каждый день' : kind === 'weekdays' ? 'По будням' : 'По выбранным дням'}
                </button>
              ))}
            </div>
            {repeatKind === 'weekly' ? (
              <div className="flex flex-wrap">
                {WEEKDAYS.map((day) => {
                  const selected = weekdays.includes(day.id);
                  return (
                    <button key={day.id} type="button" aria-pressed={selected} onClick={() => setWeekdays((current) => selected ? current.filter((item) => item !== day.id) : [...current, day.id])} className="paper-choice">
                      {day.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <button type="submit" className="paper-submit mt-4">Сохранить привычку</button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
