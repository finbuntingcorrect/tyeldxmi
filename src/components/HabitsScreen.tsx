import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { dateFromKey, formatLocalDate } from '../lib/date';
import { habitSpan, nextHabitStatus, trackerProgressLabel, type HabitStatus, type Notebook } from '../lib/notebook';
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
  if (status === 'missed') return 'не сделано';
  return 'без отметки';
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
  const done = days.filter((date) => marks.some((mark) => mark.habitId === habit.id && mark.date === date && mark.status === 'done')).length;

  function markDay(date: string, status: HabitStatus | null) {
    if (date > today) return;
    onMark(habit.id, date, nextHabitStatus(status));
  }

  return (
    <article data-habit={habit.id} className="border border-line bg-card p-4 sm:p-5">
      <h3 className="text-2xl">{habit.title}</h3>
      <p className="mt-1 text-sm text-muted">{trackerProgressLabel(done)}</p>
      <p className="mt-1 text-xs text-muted">с {shortStart(habit.start)}</p>
      <p className="mt-3 text-xs text-muted">Нажмите на кружок: галочка, затем пропуск, затем снова пусто.</p>
      <div className="mt-4 grid grid-cols-6 gap-2">
        {days.map((date) => {
          const status = marks.find((mark) => mark.habitId === habit.id && mark.date === date)?.status ?? null;
          const ahead = date > today;
          const tone = status === 'done'
            ? 'border-success bg-success text-white'
            : status === 'missed'
              ? 'border-danger bg-danger-soft text-danger'
              : 'border-ink bg-card text-ink';
          return (
            <button
              key={date}
              type="button"
              disabled={ahead}
              aria-current={date === today ? 'date' : undefined}
              aria-pressed={status === 'done'}
              aria-label={`${habit.title}, ${formatLocalDate(dateFromKey(date))}, ${statusLabel(status)}`}
              onClick={() => markDay(date, status)}
              className={`mx-auto grid aspect-square w-full max-w-11 place-items-center rounded-full border ${tone} ${date === today ? 'ring-2 ring-primary' : ''} ${ahead ? 'cursor-default opacity-40' : 'cursor-pointer'}`}
            >
              {status === 'done' ? <Check aria-hidden="true" size={14} strokeWidth={2.5} /> : null}
              {status === 'missed' ? <X aria-hidden="true" size={14} strokeWidth={2.5} /> : null}
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
      <header className="border-b border-line px-4 py-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Привычки</p>
        <h2 className="mt-1 text-3xl sm:text-4xl">Тридцать дней</h2>
      </header>
      <div className="border-b border-line px-4 py-4 sm:px-6">
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
      {book.habits.length === 0 ? <p className="px-4 py-6 text-sm text-muted sm:px-6">Пока нет привычек. Добавьте первую, и появится карточка на 30 дней.</p> : (
        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
          {book.habits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} today={today} marks={book.marks} onMark={onMark} />
          ))}
        </div>
      )}
    </section>
  );
}
