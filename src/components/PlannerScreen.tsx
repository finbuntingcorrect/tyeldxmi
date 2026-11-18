import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays } from '../../server/recurrence';
import { DAY_PARTS, WEEKDAYS } from '../lib/plannerCopy';
import { tasksForDate, weekDates, type Notebook, type NotebookTask, type TaskDraft, type WeekItem } from '../lib/notebook';
import { dateFromKey, formatLocalDate } from '../lib/date';
import type { DayPart, Priority } from '../types';
import { PaperCheck } from './PaperCheck';
import { PlanTask } from './PlanTask';

const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

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

function rangeLabel(week: string[]) {
  const start = dateFromKey(week[0]);
  const end = dateFromKey(week[6]);
  const startMonth = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(start);
  const endMonth = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(end);
  if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${end.getDate()} ${endMonth}`;
  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`;
}

function dayLabel(day: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(dateFromKey(day));
}

function openCount(tasks: { completed: boolean }[]) {
  return tasks.filter((task) => !task.completed).length;
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

function CaptureLine({ week, inbox, onAdd, onToggle, onAssign }: {
  week: string[];
  inbox: WeekItem[];
  onAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onAssign: (id: string, date: string) => void;
}) {
  const [title, setTitle] = useState('');
  return (
    <div className="px-3 py-3 sm:px-5">
      <form
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
      <p className="mt-4 text-sm text-muted">Список дел</p>
      <ShortRule />
      {inbox.map((item) => (
        <div key={item.id}>
          <div className="flex items-start">
            <PaperCheck checked={item.completed} label={item.completed ? `Вернуть «${item.title}»` : `Отметить «${item.title}»`} onClick={() => onToggle(item.id)} />
            <p className={`min-w-0 flex-1 py-2.5 text-base break-words ${item.completed ? 'text-muted line-through' : 'text-ink'}`}>{item.title}</p>
          </div>
          <div className="flex flex-wrap pb-1 pl-11">
            {week.map((day, index) => (
              <button key={day} type="button" onClick={() => onAssign(item.id, day)} className="paper-choice">
                {WEEKDAYS[index].label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
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

export function PlannerScreen(props: PlannerScreenProps) {
  const { book, today } = props;
  const [anchor, setAnchor] = useState(today);
  const [detail, setDetail] = useState<string | null>(null);
  const week = weekDates(anchor);
  const weekKey = week[0];
  const goals = book.weekItems.filter((item) => item.week === weekKey && item.kind === 'goal');
  const inbox = book.weekItems.filter((item) => item.week === weekKey && item.kind === 'inbox');

  function shift(delta: number) {
    setDetail(null);
    setAnchor(addDays(weekKey, delta * 7));
  }

  function createOn(date: string, dayPart: DayPart, title: string) {
    props.onCreate({ title, date, dayPart, priority: 'normal', repeatKind: 'none', weekdays: [] });
  }

  function renderTask(task: NotebookTask, shelves = false) {
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

  function renderShelves(date: string, tasks: NotebookTask[]) {
    return DAY_PARTS.map((part) => {
      const rows = tasks.filter((task) => task.dayPart === part.id);
      return (
        <div key={part.id} className="pt-3">
          <p className="px-1 text-sm text-muted">{part.label}</p>
          <ShortRule />
          {rows.map((task) => renderTask(task, part.id === 'anytime'))}
          <AddRow label={`Новая задача, ${part.label}`} onAdd={(title) => createOn(date, part.id, title)} />
        </div>
      );
    });
  }

  if (detail) {
    const tasks = tasksForDate(book, detail);
    return (
      <section>
        <header className="px-4 py-4 sm:px-6">
          <button type="button" onClick={() => setDetail(null)} className="text-sm font-semibold text-muted">К неделе</button>
          <h2 className="mt-2 font-serif text-3xl leading-tight break-words sm:text-5xl">{formatLocalDate(dateFromKey(detail))}</h2>
          <ShortRule />
          <CarryLine
            count={detail > today ? 0 : openCount(tasks)}
            label={detail < today ? 'Перенести на сегодня' : 'Перенести на завтра'}
            onCarry={() => props.onCarry(detail, detail < today ? today : addDays(detail, 1))}
          />
        </header>
        <div className="paper-dots px-3 pb-4 sm:px-6">
          {renderShelves(detail, tasks)}
        </div>
      </section>
    );
  }

  return (
    <section>
      <header className="flex items-center justify-between gap-2 px-2 py-4 sm:px-4">
        <button type="button" aria-label="Предыдущая неделя" onClick={() => shift(-1)} className="grid h-11 w-11 shrink-0 place-items-center text-ink">
          <ChevronLeft aria-hidden="true" size={22} />
        </button>
        <div className="min-w-0 text-center">
          <h2 className="font-serif text-4xl leading-tight break-words sm:text-5xl">План на неделю</h2>
          <p className="mt-1 text-sm text-muted">{rangeLabel(week)}</p>
          {!week.includes(today) ? (
            <button type="button" onClick={() => { setDetail(null); setAnchor(today); }} className="mt-1 min-h-11 text-sm font-semibold text-ink underline decoration-line underline-offset-4">К сегодня</button>
          ) : null}
        </div>
        <button type="button" aria-label="Следующая неделя" onClick={() => shift(1)} className="grid h-11 w-11 shrink-0 place-items-center text-ink">
          <ChevronRight aria-hidden="true" size={22} />
        </button>
      </header>
      <CaptureLine
        week={week}
        inbox={inbox}
        onAdd={(title) => props.onAddWeekItem(weekKey, 'inbox', title)}
        onToggle={props.onToggleWeekItem}
        onAssign={props.onAssignWeekItem}
      />
      <div className="lg:grid lg:grid-cols-[minmax(0,1.5fr)_18rem]">
        <div>
          {week.map((day, index) => {
            const tasks = tasksForDate(book, day);
            return (
              <section key={day} aria-label={DAY_NAMES[index]} aria-current={day === today ? 'date' : undefined} className="min-w-0 px-3 py-3 sm:px-5">
                <button type="button" onClick={() => setDetail(day)} className="flex w-full min-w-0 flex-col items-start gap-0.5 text-left sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <h3 className={`text-lg ${day === today ? 'text-primary' : 'text-ink'}`}>{DAY_NAMES[index]}</h3>
                  <span className="text-sm text-muted">{dayLabel(day)}{day === today ? ' · сегодня' : ''}{openCount(tasks) > 0 ? ` · ${openCount(tasks)} открыто` : ''}</span>
                </button>
                <ShortRule />
                {day === today ? renderShelves(day, tasks) : (
                  <>
                    {tasks.map((task) => renderTask(task))}
                    <AddRow label={`Новая задача, ${DAY_NAMES[index]}`} onAdd={(title) => createOn(day, 'anytime', title)} />
                  </>
                )}
                <CarryLine
                  count={day > today ? 0 : openCount(tasks)}
                  label={day < today ? 'Перенести на сегодня' : 'Перенести на завтра'}
                  onCarry={() => props.onCarry(day, day < today ? today : addDays(day, 1))}
                />
              </section>
            );
          })}
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
