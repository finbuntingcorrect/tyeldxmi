import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays } from '../../server/recurrence';
import { DAY_PARTS, WEEKDAYS, priorityRank } from '../lib/plannerCopy';
import { goalWeekKey, monthGrid, tasksForDate, weekDates, type Notebook, type NotebookTask, type TaskDraft, type WeekItem } from '../lib/notebook';
import { isMonthKey, isPageDate } from '../lib/route';
import { dateFromKey, formatLocalDate } from '../lib/date';
import type { DayPart, Priority } from '../types';
import { AppLink } from './AppLink';
import { PaperCheck } from './PaperCheck';
import { AddTask, PlanTask } from './PlanTask';

type PlannerScreenProps = {
  book: Notebook;
  today: string;
  onCreate: (draft: TaskDraft) => void;
  onToggle: (id: string) => void;
  onMove: (id: string, date: string) => void;
  onPart: (id: string, part: DayPart) => void;
  onPriority: (id: string, priority: Priority) => void;
  onUpdate: (id: string, draft: TaskDraft, scope: 'one' | 'future') => void;
  onAddWeekItem: (week: string, kind: WeekItem['kind'], title: string) => void;
  onToggleWeekItem: (id: string) => void;
  onAssignWeekItem: (id: string, date: string) => void;
  onCarry: (from: string, to: string) => void;
  onSkip: (id: string) => void;
  onDeleteFollowing: (id: string) => void;
  onFocus: (id: string) => void;
  onNote: (id: string, text: string) => void;
};

function monthTitle(key: string) {
  const formatted = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(dateFromKey(`${key.slice(0, 7)}-01`));
  const clean = formatted.replace(/\s*г\.?$/u, '').trim();
  return clean.charAt(0).toLocaleUpperCase('ru-RU') + clean.slice(1);
}

function shiftMonth(key: string, delta: number) {
  const date = dateFromKey(`${key.slice(0, 7)}-01`);
  date.setMonth(date.getMonth() + delta);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function openCount(tasks: { completed: boolean }[]) {
  return tasks.filter((task) => !task.completed).length;
}

const SELECTED_DAY_KEY = 'today-cat.selected-day';

function readSelectedDay() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const value = sessionStorage.getItem(SELECTED_DAY_KEY);
    return value && isPageDate(value) ? value : null;
  } catch {
    return null;
  }
}

function openLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} дело не закрыто`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} дела не закрыты`;
  return `${count} дел не закрыто`;
}

function CarryLine({ count, label, onCarry }: { count: number; label: string; onCarry: () => void }) {
  if (count === 0) return null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 px-1 py-1 text-sm text-muted">
      <span>{openLabel(count)}</span>
      <button type="button" onClick={onCarry} className="min-h-11 font-semibold text-ink">{label}</button>
    </p>
  );
}

function weekSpan(start: string) {
  const days = weekDates(start);
  const first = dateFromKey(days[0]);
  const last = dateFromKey(days[6]);
  const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric' });
  const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
    return `${day.format(first)}–${dayMonth.format(last)}`;
  }
  return `${dayMonth.format(first)} – ${dayMonth.format(last)}`;
}

function AddGoal({ onAdd }: { onAdd: (title: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  function submit() {
    const next = title.trim();
    if (!next) return;
    onAdd(next);
    setTitle('');
    setOpen(false);
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="mt-1 min-h-11 px-1 text-sm font-semibold text-ink">+ Добавить цель</button>;
  }

  function close() {
    setTitle('');
    setOpen(false);
  }

  return (
    <form
      className="mt-2 flex min-w-0 flex-col items-stretch gap-2"
      onSubmit={(event) => { event.preventDefault(); submit(); }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        close();
      }}
    >
      <input autoFocus aria-label="Новая цель недели" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="paper-field min-w-0" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" className="paper-submit sm:min-w-36">Добавить</button>
        <button type="button" onClick={close} className="paper-choice">Отмена</button>
      </div>
    </form>
  );
}

function renderTask(props: PlannerScreenProps, task: NotebookTask, shelves = false) {
  return (
    <PlanTask
      key={task.id}
      task={task}
      today={props.today}
      shelves={shelves}
      onToggle={props.onToggle}
      onMove={props.onMove}
      onPart={props.onPart}
      onPriority={props.onPriority}
      onUpdate={props.onUpdate}
      onSkip={props.onSkip}
      onDeleteFollowing={props.onDeleteFollowing}
      series={props.book.series.find((rule) => rule.id === task.seriesId) ?? null}
      onFocus={props.onFocus}
      onNote={props.onNote}
    />
  );
}

export function DayBoard(props: PlannerScreenProps & { date: string }) {
  const { book, today, date } = props;
  const tasks = tasksForDate(book, date);
  useEffect(() => {
    try {
      sessionStorage.setItem(SELECTED_DAY_KEY, date);
    } catch {
      // The calendar highlight is optional when storage is blocked.
    }
  }, [date]);
  return (
    <section>
      <header className="px-3 pt-3 pb-1 sm:px-5">
        <div className="flex min-w-0 items-start gap-1">
          <AppLink
            href="/app"
            state={{ month: date.slice(0, 7) }}
            aria-label="Вернуться к календарю"
            title="Вернуться к календарю"
            className="grid h-11 w-11 shrink-0 place-items-center text-ink"
          >
            <ChevronLeft aria-hidden="true" size={22} />
          </AppLink>
          <h2 className="min-w-0 flex-1 pt-2 font-serif text-[1.5rem] leading-[1.2] break-words text-ink sm:text-[2rem]">
            {date === today ? (
              <span aria-hidden="true" className="mr-2 inline-grid h-7 w-7 shrink-0 place-items-center rounded-full align-middle font-sans text-sm" style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>{Number(date.slice(8))}</span>
            ) : null}
            {formatLocalDate(dateFromKey(date))}
          </h2>
        </div>
        <CarryLine
          count={date > today ? 0 : openCount(tasks)}
          label={date < today ? 'Перенести на сегодня' : 'Перенести на завтра'}
          onCarry={() => props.onCarry(date, date < today ? today : addDays(date, 1))}
        />
      </header>
      <div className="bg-card px-3 pb-4 sm:px-6">
        {DAY_PARTS.map((part) => {
          const rows = tasks
            .filter((task) => task.dayPart === part.id)
            .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
          return (
            <div key={part.id} className={part.id === DAY_PARTS[0].id ? 'pt-1' : 'pt-4'}>
              <p className="px-1 text-sm text-muted">{part.label}</p>
              {rows.map((task) => renderTask(props, task, part.id === 'anytime'))}
              <AddTask date={date} part={part.id} onCreate={props.onCreate} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MonthBoard(props: PlannerScreenProps) {
  const { book, today } = props;
  const [anchor, setAnchor] = useState(() => {
    const month = (window.history.state as { month?: string } | null)?.month;
    return month && isMonthKey(month) ? `${month}-01` : today;
  });
  const grid = monthGrid(anchor);
  const monthKey = anchor.slice(0, 7);
  const selectedDay = readSelectedDay();
  const [pickedWeek, setPickedWeek] = useState<{ month: string; week: string } | null>(null);
  const baseWeek = goalWeekKey(monthKey, today, selectedDay);
  const weekKey = pickedWeek?.month === monthKey ? pickedWeek.week : baseWeek;
  const goals = book.weekItems.filter((item) => item.week === weekKey && item.kind === 'goal');

  function showMonth(next: string) {
    setAnchor(next);
    window.history.replaceState({ month: next.slice(0, 7) }, '', window.location.pathname);
  }

  return (
    <section>
      <header className="flex items-center justify-between gap-2 px-2 py-4 sm:px-4">
        <button type="button" aria-label="Предыдущий месяц" onClick={() => showMonth(shiftMonth(anchor, -1))} className="grid h-11 w-11 shrink-0 place-items-center text-ink">
          <ChevronLeft aria-hidden="true" size={22} />
        </button>
        <div className="min-w-0 text-center">
          <h2 className="font-serif text-3xl leading-tight break-words sm:text-5xl">{monthTitle(anchor)}</h2>
          {today.slice(0, 7) !== monthKey ? (
            <button type="button" onClick={() => showMonth(today)} className="mt-1 min-h-11 text-sm font-semibold text-ink">К сегодня</button>
          ) : null}
        </div>
        <button type="button" aria-label="Следующий месяц" onClick={() => showMonth(shiftMonth(anchor, 1))} className="grid h-11 w-11 shrink-0 place-items-center text-ink">
          <ChevronRight aria-hidden="true" size={22} />
        </button>
      </header>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-3 lg:pr-4">
        <div className="min-w-0 px-2 pb-4 sm:px-4">
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((day) => (
              <p key={day.id} className="px-1 py-1 text-center text-xs text-muted">{day.label}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 border-l border-t border-line bg-card">
            {grid.map((day) => {
              const tasks = tasksForDate(book, day);
              const outside = day.slice(0, 7) !== monthKey;
              const shown = tasks.slice(0, 2);
              const hidden = tasks.slice(2);
              const rest = hidden.length;
              const hiddenImportant = hidden.some((task) => task.priority === 'high');
              const open = openCount(tasks);
              const number = Number(day.slice(8));
              const importantOpen = tasks.some((task) => task.priority === 'high' && !task.completed);
              const selected = selectedDay === day;
              const name = [
                `${number}`,
                open === 0 ? 'свободно' : openLabel(open),
                day === today ? 'сегодня' : '',
                selected ? 'выбранный день' : '',
                importantOpen ? 'есть важное' : '',
              ].filter(Boolean).join(', ');
              return (
                <AppLink
                  key={day}
                  href={`/app/day/${day}`}
                  state={{ month: monthKey }}
                  aria-current={day === today ? 'date' : undefined}
                  aria-label={name}
                  className={`flex min-h-20 min-w-0 flex-col overflow-hidden border-r border-b border-line bg-card px-1 py-1 text-left sm:min-h-28 ${selected ? 'date-selected' : ''}`}
                >
                  <span className={`block text-sm ${outside && day !== today ? 'text-muted' : 'text-ink'}`}>
                    {day === today ? (
                      <span className="inline-grid h-6 w-6 place-items-center rounded-full" style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)' }}>{number}</span>
                    ) : number}
                  </span>
                  {shown.map((task) => (
                    <p key={task.id} className="mt-0.5 flex min-w-0 items-center gap-0.5">
                      {task.priority === 'high' ? <span aria-hidden="true" className="shrink-0 text-[11px] font-bold" style={{ color: task.completed ? 'var(--color-muted)' : 'var(--color-important)' }}>!</span> : null}
                      <span className={`min-w-0 truncate text-xs ${task.completed ? 'text-muted line-through' : task.priority === 'high' ? 'task-chip' : task.priority === 'low' || outside ? 'text-low' : 'text-ink'}`}>{task.title}</span>
                    </p>
                  ))}
                  {rest > 0 ? (
                    <p className="mt-0.5 flex min-w-0 items-center gap-0.5 overflow-hidden text-[11px] leading-none whitespace-nowrap text-muted">
                      {hiddenImportant ? <span aria-hidden="true" className="shrink-0 font-bold" style={{ color: 'var(--color-important)' }}>!</span> : null}
                      <span className="truncate">Ещё {rest}</span>
                    </p>
                  ) : null}
                </AppLink>
              );
            })}
          </div>
        </div>
        <aside className="week-goals mx-3 mb-4 p-5 lg:mx-0 lg:mt-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-serif text-[1.375rem] leading-tight text-ink">Цели недели</h3>
              <p className="mt-1 text-sm text-muted">{weekSpan(weekKey)}</p>
            </div>
            <div className="flex shrink-0">
              <button type="button" aria-label="Предыдущая неделя" onClick={() => setPickedWeek({ month: monthKey, week: addDays(weekKey, -7) })} className="grid h-11 w-11 place-items-center text-ink">
                <ChevronLeft aria-hidden="true" size={18} />
              </button>
              <button type="button" aria-label="Следующая неделя" onClick={() => setPickedWeek({ month: monthKey, week: addDays(weekKey, 7) })} className="grid h-11 w-11 place-items-center text-ink">
                <ChevronRight aria-hidden="true" size={18} />
              </button>
            </div>
          </div>
          <div className="mt-2">
            {goals.map((item) => (
              <div key={item.id} className="flex items-start">
                <PaperCheck checked={item.completed} label={item.completed ? `Вернуть цель «${item.title}»` : `Отметить цель «${item.title}»`} onClick={() => props.onToggleWeekItem(item.id)} />
                <p className={`min-w-0 flex-1 py-2.5 text-base break-words ${item.completed ? 'text-muted line-through' : 'text-ink'}`}>{item.title}</p>
              </div>
            ))}
            <AddGoal onAdd={(title) => props.onAddWeekItem(weekKey, 'goal', title)} />
          </div>
        </aside>
      </div>
    </section>
  );
}
