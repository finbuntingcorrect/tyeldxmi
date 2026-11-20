import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays } from '../../server/recurrence';
import { DAY_PARTS, WEEKDAYS } from '../lib/plannerCopy';
import { monthGrid, tasksForDate, weekDates, type Notebook, type NotebookTask, type TaskDraft, type WeekItem } from '../lib/notebook';
import { calendarMonth } from '../lib/route';
import { useRoute } from '../hooks/routeContext';
import { dateFromKey, formatLocalDate } from '../lib/date';
import type { DayPart, Priority } from '../types';
import { AppLink } from './AppLink';
import { PaperCheck } from './PaperCheck';
import { PlanTask } from './PlanTask';

const MONTH_MEMORY = 'today-cat.calendar-month';

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

function readStoredMonth() {
  try {
    return sessionStorage.getItem(MONTH_MEMORY);
  } catch {
    return null;
  }
}

function writeStoredMonth(month: string) {
  try {
    sessionStorage.setItem(MONTH_MEMORY, month);
  } catch {
    return;
  }
}

function visibleMonth(anchor: string) {
  const grid = monthGrid(anchor);
  const month = anchor.slice(0, 7);
  const tail = grid.slice(35);
  if (tail.length === 7 && tail.every((day) => day.slice(0, 7) !== month)) return grid.slice(0, 35);
  return grid;
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
      <input autoFocus aria-label={label} value={title} onChange={(event) => setTitle(event.target.value)} onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center' })} maxLength={160} className="paper-field min-w-0 sm:flex-1" />
      <button type="submit" className="paper-submit sm:shrink-0">Ок</button>
    </form>
  );
}

function createOn(props: PlannerScreenProps, date: string, dayPart: DayPart, title: string) {
  props.onCreate({ title, date, dayPart, priority: 'normal', repeatKind: 'none', weekdays: [] });
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
      onFocus={props.onFocus}
      onNote={props.onNote}
    />
  );
}

export function DayBoard(props: PlannerScreenProps & { date: string }) {
  const { book, today, date } = props;
  const { go } = useRoute();
  const tasks = tasksForDate(book, date);
  const month = calendarMonth(window.history.state, readStoredMonth(), today);

  function openDay(next: string) {
    go(`/day/${next}`, { month });
  }

  return (
    <section>
      <header className="px-4 py-4 sm:px-6">
        <AppLink href="/" state={{ month }} className="inline-flex min-h-11 items-center text-sm font-semibold text-muted">← Календарь</AppLink>
        <div className="mt-1 flex items-center justify-between gap-2">
          <button type="button" aria-label="Предыдущий день" onClick={() => openDay(addDays(date, -1))} className="grid h-11 w-11 shrink-0 place-items-center text-ink">
            <ChevronLeft aria-hidden="true" size={22} />
          </button>
          <h2 className="min-w-0 text-center font-serif text-3xl leading-tight break-words sm:text-5xl">{formatLocalDate(dateFromKey(date))}</h2>
          <button type="button" aria-label="Следующий день" onClick={() => openDay(addDays(date, 1))} className="grid h-11 w-11 shrink-0 place-items-center text-ink">
            <ChevronRight aria-hidden="true" size={22} />
          </button>
        </div>
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
            <div key={part.id} className={rows.length === 0 ? 'pt-1' : 'pt-3'}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 px-1">
                <p className="text-sm text-muted">{part.label}</p>
                {rows.length === 0 ? <AddRow label={`Новая задача, ${part.label}`} onAdd={(title) => createOn(props, date, part.id, title)} /> : null}
              </div>
              {rows.length > 0 ? (
                <>
                  <ShortRule />
                  {rows.map((task) => renderTask(props, task, part.id === 'anytime'))}
                  <AddRow label={`Новая задача, ${part.label}`} onAdd={(title) => createOn(props, date, part.id, title)} />
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MonthBoard(props: PlannerScreenProps) {
  const { book, today } = props;
  const [anchor, setAnchor] = useState(() => `${calendarMonth(window.history.state, readStoredMonth(), today)}-01`);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const grid = visibleMonth(anchor);
  const monthKey = anchor.slice(0, 7);
  const todayWeek = weekDates(today);
  const inboxWeek = todayWeek[0];
  const weekKey = weekDates(today.slice(0, 7) === monthKey ? today : `${monthKey}-01`)[0];
  const goals = book.weekItems.filter((item) => item.week === weekKey && item.kind === 'goal');
  const inbox = book.weekItems.filter((item) => item.week === inboxWeek && item.kind === 'inbox');

  useEffect(() => {
    writeStoredMonth(monthKey);
    const state = window.history.state && typeof window.history.state === 'object' ? window.history.state as Record<string, unknown> : {};
    if (state.month === monthKey) return;
    window.history.replaceState({ ...state, month: monthKey }, '', window.location.pathname);
  }, [monthKey]);

  function showMonth(next: string) {
    setAnchor(next);
  }

  return (
    <section>
      <header className="flex items-center justify-between gap-2 px-2 py-3 sm:px-4">
        <button type="button" aria-label="Предыдущий месяц" onClick={() => showMonth(shiftMonth(anchor, -1))} className="grid h-11 w-11 shrink-0 place-items-center text-ink">
          <ChevronLeft aria-hidden="true" size={22} />
        </button>
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <h2 className="font-serif text-3xl leading-tight break-words sm:text-4xl">{monthTitle(anchor)}</h2>
          <button type="button" onClick={() => showMonth(today)} className="min-h-11 text-sm font-semibold text-ink underline decoration-line underline-offset-4">Сегодня</button>
        </div>
        <button type="button" aria-label="Следующий месяц" onClick={() => showMonth(shiftMonth(anchor, 1))} className="grid h-11 w-11 shrink-0 place-items-center text-ink">
          <ChevronRight aria-hidden="true" size={22} />
        </button>
      </header>
      <div className="flex flex-wrap gap-x-4 px-4 sm:px-6">
        <button type="button" aria-expanded={goalsOpen} onClick={() => setGoalsOpen((value) => !value)} className="min-h-11 text-sm font-semibold text-muted">
          Цели недели{goals.length > 0 ? ` · ${goals.length}` : ''}
        </button>
        <button type="button" aria-expanded={inboxOpen} onClick={() => setInboxOpen((value) => !value)} className="min-h-11 text-sm font-semibold text-muted">
          Список дел{inbox.length > 0 ? ` · ${inbox.length}` : ''}
        </button>
      </div>
      {goalsOpen ? (
        <div className="px-4 pb-2 sm:px-6">
          <ShortRule />
          {goals.map((item) => (
            <div key={item.id} className="flex items-start">
              <PaperCheck checked={item.completed} label={item.completed ? `Вернуть цель «${item.title}»` : `Отметить цель «${item.title}»`} onClick={() => props.onToggleWeekItem(item.id)} />
              <p className={`min-w-0 flex-1 py-2.5 text-base break-words ${item.completed ? 'text-muted line-through' : 'text-ink'}`}>{item.title}</p>
            </div>
          ))}
          <AddRow label="Новая цель недели" onAdd={(title) => props.onAddWeekItem(weekKey, 'goal', title)} />
        </div>
      ) : null}
      {inboxOpen ? (
        <div className="px-4 pb-2 sm:px-6">
          <CaptureField onAdd={(title) => props.onAddWeekItem(inboxWeek, 'inbox', title)} />
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
      ) : null}
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
            const number = Number(day.slice(8));
            const name = tasks.length === 0 ? `${number}, нет задач` : `${number}, ${openLabel(openCount(tasks))}`;
            return (
              <AppLink
                key={day}
                href={`/day/${day}`}
                state={{ month: monthKey }}
                aria-current={day === today ? 'date' : undefined}
                aria-label={name}
                className={`flex min-h-12 min-w-0 flex-col border-r border-b border-line px-1 py-1 text-left sm:min-h-[4.75rem] ${outside ? 'text-muted' : 'text-ink'}`}
              >
                <span
                  className="inline-grid h-6 w-6 place-items-center rounded-full text-sm"
                  style={day === today ? { background: 'var(--color-primary)', color: 'var(--color-on-primary)' } : undefined}
                >
                  {number}
                </span>
                {tasks.length > 0 ? <span className="px-0.5 text-xs text-muted sm:hidden">{tasks.length}</span> : null}
                <span className="hidden min-w-0 sm:block">
                  {shown.map((task) => (
                    <span key={task.id} className={`block truncate text-xs ${task.completed || outside ? 'text-muted' : 'text-ink'} ${task.completed ? 'line-through' : ''}`}>{task.title}</span>
                  ))}
                  {rest > 0 ? <span className="block truncate text-xs text-muted">Ещё {rest}</span> : null}
                </span>
              </AppLink>
            );
          })}
        </div>
      </div>
    </section>
  );
}
