import { useState } from 'react';
import { WEEKDAYS } from '../lib/plannerCopy';
import { habitProgressLabel, habitsForDate, type HabitStatus, type Notebook } from '../lib/notebook';
import type { RepeatKind } from '../types';

type HabitsScreenProps = {
  book: Notebook;
  today: string;
  onCreate: (title: string, repeatKind: RepeatKind, weekdays: number[], start: string) => void;
  onMark: (habitId: string, date: string, status: HabitStatus | null) => void;
};

export function HabitsScreen({ book, today, onCreate, onMark }: HabitsScreenProps) {
  const rows = habitsForDate(book, today);
  const done = rows.filter((row) => row.status === 'done').length;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [repeatKind, setRepeatKind] = useState<RepeatKind>('daily');
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);

  function submit() {
    onCreate(title, repeatKind, weekdays, today);
    setTitle('');
    setOpen(false);
  }

  return (
    <section className="rounded-[28px] border border-line bg-card p-4 sm:p-6">
      <h2 className="text-lg font-extrabold">Привычки на сегодня</h2>
      <p className="mt-2 text-base font-bold text-ink">{rows.length === 0 ? 'На сегодня привычек нет' : habitProgressLabel(done, rows.length)}</p>
      <div className="mt-4 grid gap-3">
        {rows.map(({ habit, status }) => (
          <article key={habit.id} className="rounded-2xl border border-line bg-field p-3">
            <h3 className="text-base font-extrabold">{habit.title}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" aria-pressed={status === 'done'} onClick={() => onMark(habit.id, today, status === 'done' ? null : 'done')} className={`min-h-11 rounded-xl px-4 text-sm font-extrabold ${status === 'done' ? 'bg-success text-white' : 'bg-cream'}`}>Сделано</button>
              <button type="button" aria-pressed={status === 'missed'} onClick={() => onMark(habit.id, today, status === 'missed' ? null : 'missed')} className={`min-h-11 rounded-xl px-4 text-sm font-extrabold ${status === 'missed' ? 'bg-danger text-white' : 'bg-cream text-ink'}`}>Не сделано</button>
            </div>
          </article>
        ))}
      </div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="mt-4 min-h-11 rounded-xl bg-primary px-4 text-sm font-extrabold">Добавить привычку</button>
      {open ? (
        <form className="mt-3 grid gap-3 rounded-2xl bg-cream p-3" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <label htmlFor="habit-title" className="text-sm font-extrabold">Название</label>
          <input id="habit-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="min-h-12 rounded-2xl border border-line bg-field px-4 text-ink" />
          <div className="flex flex-wrap gap-2">
            {(['daily', 'weekdays', 'weekly'] as const).map((kind) => (
              <button key={kind} type="button" onClick={() => setRepeatKind(kind)} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${repeatKind === kind ? 'bg-primary' : 'bg-card'}`}>
                {kind === 'daily' ? 'Каждый день' : kind === 'weekdays' ? 'По будням' : 'По выбранным дням'}
              </button>
            ))}
          </div>
          {repeatKind === 'weekly' ? (
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const selected = weekdays.includes(day.id);
                return (
                  <button key={day.id} type="button" aria-pressed={selected} onClick={() => setWeekdays((current) => selected ? current.filter((item) => item !== day.id) : [...current, day.id])} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${selected ? 'bg-primary' : 'bg-card'}`}>
                    {day.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <button type="submit" className="min-h-11 rounded-xl bg-primary px-4 text-sm font-extrabold">Сохранить привычку</button>
        </form>
      ) : null}
    </section>
  );
}
