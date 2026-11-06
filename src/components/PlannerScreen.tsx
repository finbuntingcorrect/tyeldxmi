import { useState } from 'react';
import { DAY_PARTS, WEEKDAYS } from '../lib/plannerCopy';
import { weekday } from '../../server/recurrence';
import { tasksForDate, weekDates, type Notebook, type TaskDraft } from '../lib/notebook';
import { dateFromKey, formatLocalDate } from '../lib/date';
import type { DayPart, Priority } from '../types';
import { PlanTask } from './PlanTask';

const WEEK_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

type PlannerScreenProps = {
  book: Notebook;
  today: string;
  onCreate: (draft: TaskDraft) => void;
  onToggle: (id: string) => void;
  onMove: (id: string, date: string) => void;
  onPart: (id: string, part: DayPart) => void;
  onPriority: (id: string, priority: Priority) => void;
  onUpdate: (id: string, draft: TaskDraft, scope: 'one' | 'future') => void;
};

export function PlannerScreen(props: PlannerScreenProps) {
  const { book, today } = props;
  const [selected, setSelected] = useState(today);
  const [title, setTitle] = useState('');
  const [dayPart, setDayPart] = useState<DayPart>('anytime');
  const [date, setDate] = useState(today);
  const [repeatKind, setRepeatKind] = useState<TaskDraft['repeatKind']>('none');
  const [weekdays, setWeekdays] = useState<number[]>([weekday(today)]);
  const week = weekDates(selected);
  const tasks = tasksForDate(book, selected);

  function submit() {
    props.onCreate({ title, date: date || selected, dayPart, priority: 'normal', repeatKind, weekdays });
    setTitle('');
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Неделя">
        {week.map((day, index) => {
          const count = tasksForDate(book, day).length;
          const active = day === selected;
          return (
            <button key={day} type="button" aria-pressed={active} aria-current={day === today ? 'date' : undefined} onClick={() => { setSelected(day); setDate(day); }} className={`min-h-16 min-w-14 shrink-0 rounded-2xl px-3 py-2 text-left ${active ? 'bg-primary' : 'bg-card'} ${day === today && !active ? 'ring-2 ring-primary' : ''}`}>
              <span className="block text-xs font-extrabold text-muted">{WEEK_LABELS[index]}</span>
              <span className="block text-lg font-extrabold">{Number(day.slice(8))}</span>
              {count > 0 ? <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-sage" /> : null}
            </button>
          );
        })}
      </div>
      <section className="min-w-0 rounded-[28px] border border-line bg-card p-4 sm:p-6">
        <h2 className="text-lg font-extrabold">{formatLocalDate(dateFromKey(selected))}</h2>
        <form className="mt-4 grid gap-2" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <label htmlFor="plan-task" className="sr-only">Новая задача</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="plan-task" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Что нужно сделать?" maxLength={160} className="min-h-12 flex-1 rounded-2xl border border-line px-4" />
            <button type="submit" className="min-h-12 rounded-2xl bg-primary px-5 font-extrabold">Добавить</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {DAY_PARTS.map((part) => (
              <button key={part.id} type="button" onClick={() => setDayPart(part.id)} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${dayPart === part.id ? 'bg-primary' : 'bg-cream'}`}>{part.label}</button>
            ))}
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold">Дата
              <input type="date" value={date || selected} onChange={(event) => setDate(event.target.value)} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['none', 'daily', 'weekdays', 'weekly'] as const).map((kind) => (
              <button key={kind} type="button" onClick={() => setRepeatKind(kind)} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${repeatKind === kind ? 'bg-primary' : 'bg-cream'}`}>
                {kind === 'none' ? 'Без повтора' : kind === 'daily' ? 'Каждый день' : kind === 'weekdays' ? 'По будням' : 'По дням'}
              </button>
            ))}
          </div>
          {repeatKind === 'weekly' ? (
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const pressed = weekdays.includes(day.id);
                return (
                  <button key={day.id} type="button" aria-pressed={pressed} onClick={() => setWeekdays((current) => pressed ? current.filter((item) => item !== day.id) : [...current, day.id])} className={`min-h-11 rounded-xl px-3 text-sm font-extrabold ${pressed ? 'bg-primary' : 'bg-cream'}`}>
                    {day.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </form>
        {DAY_PARTS.map((part) => (
          <div key={part.id} className="mt-5">
            <h3 className="mb-2 text-lg font-extrabold">{part.label}</h3>
            <div className="grid gap-2">
              {tasks.filter((task) => task.dayPart === part.id).length === 0 ? <p className="text-sm font-semibold text-muted">Пока пусто</p> : null}
              {tasks.filter((task) => task.dayPart === part.id).map((task) => (
                <PlanTask key={task.id} task={task} onToggle={props.onToggle} onMove={props.onMove} onPart={props.onPart} onPriority={props.onPriority} onUpdate={props.onUpdate} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
