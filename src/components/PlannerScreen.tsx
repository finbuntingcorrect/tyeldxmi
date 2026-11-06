import { useState } from 'react';
import { DAY_PARTS, WEEKDAYS } from '../lib/plannerCopy';
import { weekday } from '../../server/recurrence';
import { tasksForDate, weekDates, type Notebook, type TaskDraft } from '../lib/notebook';
import { dateFromKey, formatLocalDate } from '../lib/date';
import type { DayPart, Priority } from '../types';
import { PlanTask } from './PlanTask';

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

function rangeLabel(week: string[]) {
  const start = dateFromKey(week[0]);
  const end = dateFromKey(week[6]);
  const startMonth = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(start);
  const endMonth = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(end);
  if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${end.getDate()} ${endMonth}`;
  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`;
}

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

  function chooseDay(day: string) {
    setSelected(day);
    setDate(day);
  }

  function submit() {
    props.onCreate({ title, date: date || selected, dayPart, priority: 'normal', repeatKind, weekdays });
    setTitle('');
  }

  return (
    <div className="lg:grid lg:grid-cols-2">
      <div className="lg:border-r lg:border-line">
        <div className="hidden border-b border-line px-5 py-4 lg:block">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Неделя</p>
          <h2 className="mt-1 text-3xl">{rangeLabel(week)}</h2>
        </div>
        <div aria-label="Неделя" className="sticky top-0 z-10 grid grid-cols-7 border-b border-line bg-card lg:static lg:grid-cols-1 lg:border-b-0">
          {week.map((day, index) => {
            const dayTasks = tasksForDate(book, day);
            const active = day === selected;
            const preview = dayTasks.slice(0, 3);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={active}
                aria-current={day === today ? 'date' : undefined}
                onClick={() => chooseDay(day)}
                className={`min-w-0 px-1 py-2 text-center lg:border-b lg:border-line lg:px-5 lg:py-3 lg:text-left ${active ? 'shadow-[inset_0_-2px_0_var(--color-primary)] lg:bg-field lg:shadow-[inset_2px_0_0_var(--color-primary)]' : ''}`}
              >
                <span className="block text-[11px] font-semibold text-muted lg:text-xs">{WEEKDAYS[index].label}{day === today ? <span className="hidden lg:inline"> · сегодня</span> : null}</span>
                <span className="mt-0.5 block font-serif text-xl lg:text-3xl">{Number(day.slice(8))}</span>
                <span className="mt-2 hidden lg:block">
                  {preview.map((task) => (
                    <span key={task.id} className={`block truncate text-sm font-sans font-normal ${task.completed ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</span>
                  ))}
                  {dayTasks.length > preview.length ? <span className="mt-1 block text-xs text-muted">ещё {dayTasks.length - preview.length}</span> : null}
                  {dayTasks.length === 0 ? <span className="block text-sm text-muted">Пусто</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <section className="min-w-0">
        <header className="border-b border-line px-4 py-4 sm:px-6">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">День</p>
          <h2 className="mt-1 text-3xl sm:text-4xl">{formatLocalDate(dateFromKey(selected))}</h2>
        </header>
        <form className="border-b border-line px-4 py-4 sm:px-6" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <label htmlFor="plan-task" className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Новая задача</label>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end">
            <input id="plan-task" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Что нужно сделать?" maxLength={160} className="paper-field" />
            <button type="submit" className="paper-submit">Добавить</button>
          </div>
          <div className="mt-3 flex flex-wrap">
            {DAY_PARTS.map((part) => (
              <button key={part.id} type="button" aria-pressed={dayPart === part.id} onClick={() => setDayPart(part.id)} className="paper-choice">{part.label}</button>
            ))}
            <label className="flex min-h-11 items-center gap-2 px-2 text-sm font-semibold">Дата
              <input type="date" value={date || selected} onChange={(event) => setDate(event.target.value)} className="bg-transparent" />
            </label>
          </div>
          <div className="flex flex-wrap">
            {(['none', 'daily', 'weekdays', 'weekly'] as const).map((kind) => (
              <button key={kind} type="button" aria-pressed={repeatKind === kind} onClick={() => setRepeatKind(kind)} className="paper-choice">
                {kind === 'none' ? 'Без повтора' : kind === 'daily' ? 'Каждый день' : kind === 'weekdays' ? 'По будням' : 'По дням'}
              </button>
            ))}
          </div>
          {repeatKind === 'weekly' ? (
            <div className="flex flex-wrap">
              {WEEKDAYS.map((day) => {
                const pressed = weekdays.includes(day.id);
                return (
                  <button key={day.id} type="button" aria-pressed={pressed} onClick={() => setWeekdays((current) => pressed ? current.filter((item) => item !== day.id) : [...current, day.id])} className="paper-choice">
                    {day.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </form>
        <div className="paper-dots">
          {DAY_PARTS.map((part) => {
            const rows = tasks.filter((task) => task.dayPart === part.id);
            return (
              <section key={part.id} className="px-4 py-4 sm:px-6">
                <h3 className="text-2xl">{part.label}</h3>
                <div className="mt-2 border-t border-line">
                  {rows.length === 0 ? <p className="py-3 text-sm text-muted">Пока пусто</p> : null}
                  {rows.map((task) => (
                    <PlanTask key={task.id} task={task} onToggle={props.onToggle} onMove={props.onMove} onPart={props.onPart} onPriority={props.onPriority} onUpdate={props.onUpdate} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}
