import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays } from '../../server/recurrence';
import { DAY_PARTS, WEEKDAYS } from '../lib/plannerCopy';
import { monthGrid, tasksForDate, weekDates, type Notebook, type NotebookTask, type TaskDraft, type WeekItem } from '../lib/notebook';
import { isMonthKey } from '../lib/route';
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

function loadClass(open: number) {
  if (open >= 4) return 'day-load-3';
  if (open === 3) return 'day-load-2';
  if (open >= 1) return 'day-load-1';
  return '';
}

function loadWidth(open: number) {
  if (open >= 4) return '100%';
  if (open === 3) return '75%';
  if (open === 2) return '50%';
  if (open === 1) return '25%';
  return '0%';
}

function openLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} дело не закрыто`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} дела не закрыты`;
  return `${count} дел не закрыто`;
}

function ShortRule() {
  return <div className="mx-3 mt-1 border-t border-line" />;
}

function CarryLine({ count, label, onCarry }: { count: number; label: string; onCarry: () => void }) {
  if (count === 0) return null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 px-1 py-1 text-sm text-muted">
      <span>{openLabel(count)}</span>
      <button type="button" onClick={onCarry} className="min-h-11 font-semibold text-ink underline decoration-line underline-offset-4">{label}</button>
    </p>
  );
}

function CaptureField({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState('');
  return (
    <form
      className="px-4 sm:px-6"
      onSubmit={(event) => {
        event.preventDefault();
        const next = title.trim();
        if (!next) return;
        onAdd(next);
        setTitle('');
      }}
    >
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        aria-label="Записать и забыть"
        placeholder="Записать и забыть"
        maxLength={160}
        className="paper-field"
      />
    </form>
  );
}

function AddRow({ label, onAdd }: { label: string; onAdd: (title: string) => void }) {
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
    return <button type="button" onClick={() => setOpen(true)} className="min-h-11 px-1 text-sm font-semibold text-muted">+ Добавить</button>;
  }

  return (
    <form className="flex min-w-0 flex-col items-stretch gap-2 py-1 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <input autoFocus aria-label={label} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="paper-field min-w-0 sm:flex-1" />
      <button type="submit" className="paper-submit sm:shrink-0">Ок</button>
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
  return (
    <section>
      <header className="px-4 py-4 sm:px-6">
        <AppLink href="/" className="text-sm font-semibold text-muted">К месяцу</AppLink>
        <h2 className="mt-2 font-serif text-3xl leading-tight break-words sm:text-5xl">{formatLocalDate(dateFromKey(date))}</h2>
        <ShortRule />
        <CarryLine
          count={date > today ? 0 : openCount(tasks)}
          label={date < today ? 'Перенести на сегодня' : 'Перенести на завтра'}
          onCarry={() => props.onCarry(date, date < today ? today : addDays(date, 1))}
        />
      </header>
      <div className="paper-dots px-3 pb-4 sm:px-6">
        {DAY_PARTS.map((part) => {
          const rows = tasks.filter((task) => task.dayPart === part.id);
          return (
            <div key={part.id} className="pt-3">
              <p className="px-1 text-sm text-muted">{part.label}</p>
              <ShortRule />
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
  const todayWeek = weekDates(today);
  const inboxWeek = todayWeek[0];
  const weekKey = weekDates(today.slice(0, 7) === monthKey ? today : `${monthKey}-01`)[0];
  const goals = book.weekItems.filter((item) => item.week === weekKey && item.kind === 'goal');
  const inbox = book.weekItems.filter((item) => item.week === inboxWeek && item.kind === 'inbox');

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
          <p className="mt-1 text-sm text-muted">Гуще клетка — больше открытых дел.</p>
          {today.slice(0, 7) !== monthKey ? (
            <button type="button" onClick={() => showMonth(today)} className="mt-1 min-h-11 text-sm font-semibold text-ink underline decoration-line underline-offset-4">К сегодня</button>
          ) : null}
        </div>
        <button type="button" aria-label="Следующий месяц" onClick={() => showMonth(shiftMonth(anchor, 1))} className="grid h-11 w-11 shrink-0 place-items-center text-ink">
          <ChevronRight aria-hidden="true" size={22} />
        </button>
      </header>
      <CaptureField onAdd={(title) => props.onAddWeekItem(inboxWeek, 'inbox', title)} />
      <div className="px-4 pb-2 sm:px-6">
        <p className="mt-3 text-sm text-muted">Список дел</p>
        <ShortRule />
        {inbox.map((item) => (
          <div key={item.id}>
            <div className="flex items-start">
              <PaperCheck checked={item.completed} label={item.completed ? `Вернуть «${item.title}»` : `Отметить «${item.title}»`} onClick={() => props.onToggleWeekItem(item.id)} />
              <p className={`min-w-0 flex-1 py-2.5 text-base break-words ${item.completed ? 'text-muted line-through' : 'text-ink'}`}>{item.title}</p>
            </div>
            <div className="flex flex-wrap pb-1 pl-11">
              {todayWeek.map((day, index) => (
                <button key={day} type="button" onClick={() => props.onAssignWeekItem(item.id, day)} className="paper-choice">
                  {WEEKDAYS[index].label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 px-2 pb-4 sm:px-4">
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((day) => (
              <p key={day.id} className="px-1 py-1 text-center text-xs text-muted">{day.label}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 border-l border-t border-line">
            {grid.map((day) => {
              const tasks = tasksForDate(book, day);
              const outside = day.slice(0, 7) !== monthKey;
              const shown = tasks.slice(0, 2);
              const rest = tasks.length - shown.length;
              const open = openCount(tasks);
              const number = Number(day.slice(8));
              const name = open === 0 ? `${number}, свободно` : `${number}, ${openLabel(open)}`;
              return (
                <AppLink
                  key={day}
                  href={`/day/${day}`}
                  state={{ month: monthKey }}
                  aria-current={day === today ? 'date' : undefined}
                  aria-label={name}
                  className={`flex min-h-20 min-w-0 flex-col border-r border-b border-line px-1 py-1 text-left sm:min-h-28 ${loadClass(open)} ${day === today ? 'shadow-[inset_0_-2px_0_var(--color-primary)]' : ''}`}
                >
                  <span className={`block text-sm ${day === today ? 'text-primary' : outside ? 'text-muted' : 'text-ink'}`}>{number}</span>
                  {shown.map((task) => (
                    <p key={task.id} className={`truncate text-xs ${task.completed || outside ? 'text-muted' : 'text-ink'} ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
                  ))}
                  {rest > 0 ? <p className="truncate text-xs text-muted">ещё {rest}</p> : null}
                  {open > 0 ? <span aria-hidden="true" className="mt-auto block h-1" style={{ width: loadWidth(open), background: 'var(--color-primary)' }} /> : null}
                </AppLink>
              );
            })}
          </div>
        </div>
        <aside className="px-3 py-4 sm:px-5">
          <p className="text-sm text-muted">Цели недели</p>
          <ShortRule />
          {goals.map((item) => (
            <div key={item.id} className="flex items-start">
              <PaperCheck checked={item.completed} label={item.completed ? `Вернуть цель «${item.title}»` : `Отметить цель «${item.title}»`} onClick={() => props.onToggleWeekItem(item.id)} />
              <p className={`min-w-0 flex-1 py-2.5 text-base break-words ${item.completed ? 'text-muted line-through' : 'text-ink'}`}>{item.title}</p>
            </div>
          ))}
          <AddRow label="Новая цель недели" onAdd={(title) => props.onAddWeekItem(weekKey, 'goal', title)} />
        </aside>
      </div>
    </section>
  );
}
