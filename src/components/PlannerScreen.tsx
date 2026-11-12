import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays } from '../../server/recurrence';
import { DAY_PARTS, WEEKDAYS } from '../lib/plannerCopy';
import { tasksForDate, weekDates, type Notebook, type TaskDraft, type WeekItem } from '../lib/notebook';
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
  onFocus: (id: string) => void;
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
    <form className="flex items-end gap-2 py-1" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <input autoFocus aria-label={label} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="paper-field" />
      <button type="submit" className="paper-submit">Ок</button>
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

  if (detail) {
    const tasks = tasksForDate(book, detail);
    return (
      <section>
        <header className="border-b border-line px-4 py-4 sm:px-6">
          <button type="button" onClick={() => setDetail(null)} className="text-sm font-semibold text-muted">К неделе</button>
          <h2 className="mt-2 text-3xl sm:text-4xl">{formatLocalDate(dateFromKey(detail))}</h2>
        </header>
        <div className="paper-dots">
          {DAY_PARTS.map((part) => {
            const rows = tasks.filter((task) => task.dayPart === part.id);
            return (
              <section key={part.id} className="border-b border-line px-4 py-4 sm:px-6">
                <h3 className="text-2xl">{part.label}</h3>
                <div className="mt-2 border-t border-line">
                  {rows.map((task) => (
                    <PlanTask key={task.id} task={task} today={props.today} onToggle={props.onToggle} onMove={props.onMove} onPart={props.onPart} onPriority={props.onPriority} onUpdate={props.onUpdate} onFocus={props.onFocus} />
                  ))}
                  <AddRow label={`Новая задача, ${part.label}`} onAdd={(title) => createOn(detail, part.id, title)} />
                </div>
              </section>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section>
      <header className="flex items-center justify-between gap-2 border-b border-line px-2 py-4 sm:px-4">
        <button type="button" aria-label="Предыдущая неделя" onClick={() => shift(-1)} className="grid h-11 w-11 shrink-0 place-items-center text-ink">
          <ChevronLeft aria-hidden="true" size={22} />
        </button>
        <div className="min-w-0 text-center">
          <h2 className="text-3xl sm:text-4xl">План на неделю</h2>
          <p className="mt-1 text-sm text-muted">{rangeLabel(week)}</p>
        </div>
        <button type="button" aria-label="Следующая неделя" onClick={() => shift(1)} className="grid h-11 w-11 shrink-0 place-items-center text-ink">
          <ChevronRight aria-hidden="true" size={22} />
        </button>
      </header>
      <div className="lg:grid lg:grid-cols-[minmax(0,1.5fr)_18rem]">
        <div className="lg:border-r lg:border-line">
          {week.map((day, index) => {
            const tasks = tasksForDate(book, day);
            return (
              <section key={day} aria-label={DAY_NAMES[index]} aria-current={day === today ? 'date' : undefined} className={`border-b border-line px-4 py-3 sm:px-5 ${day === today ? 'day-today' : ''}`}>
                <button type="button" onClick={() => setDetail(day)} className="flex w-full items-baseline justify-between gap-3 text-left">
                  <h3 className="text-2xl">{DAY_NAMES[index]}</h3>
                  <span className="text-sm text-muted">{dayLabel(day)}{day === today ? ' · сегодня' : ''}</span>
                </button>
                <div className="mt-1 border-t border-line">
                  {tasks.map((task) => (
                    <PlanTask key={task.id} task={task} today={props.today} onToggle={props.onToggle} onMove={props.onMove} onPart={props.onPart} onPriority={props.onPriority} onUpdate={props.onUpdate} onFocus={props.onFocus} />
                  ))}
                  <AddRow label={`Новая задача, ${DAY_NAMES[index]}`} onAdd={(title) => createOn(day, 'anytime', title)} />
                </div>
              </section>
            );
          })}
        </div>
        <aside className="border-t border-line lg:border-t-0">
          <div className="border-b border-line px-4 py-4 sm:px-5">
            <h3 className="text-2xl">Цели недели</h3>
            <div className="mt-2 border-t border-line">
              {goals.map((item) => (
                <div key={item.id} className="flex items-start border-b border-line">
                  <PaperCheck checked={item.completed} label={item.completed ? `Вернуть цель «${item.title}»` : `Отметить цель «${item.title}»`} onClick={() => props.onToggleWeekItem(item.id)} />
                  <p className={`py-2.5 text-base ${item.completed ? 'text-muted line-through' : 'text-ink'}`}>{item.title}</p>
                </div>
              ))}
              <AddRow label="Новая цель недели" onAdd={(title) => props.onAddWeekItem(weekKey, 'goal', title)} />
            </div>
          </div>
          <div className="px-4 py-4 sm:px-5">
            <h3 className="text-2xl">Список дел</h3>
            <div className="mt-2 border-t border-line">
              {inbox.map((item) => (
                <div key={item.id} className="border-b border-line py-2">
                  <div className="flex items-start">
                    <PaperCheck checked={item.completed} label={item.completed ? `Вернуть «${item.title}»` : `Отметить «${item.title}»`} onClick={() => props.onToggleWeekItem(item.id)} />
                    <p className={`py-2.5 text-base ${item.completed ? 'text-muted line-through' : 'text-ink'}`}>{item.title}</p>
                  </div>
                  <label className="mt-1 block text-xs font-semibold text-muted">
                    Назначить день
                    <select aria-label={`Назначить день: ${item.title}`} defaultValue="" onChange={(event) => { if (event.target.value) props.onAssignWeekItem(item.id, event.target.value); }} className="mt-1 min-h-11 w-full border border-line bg-card px-2 text-sm text-ink">
                      <option value="">Не выбран</option>
                      {week.map((day, index) => <option key={day} value={day}>{WEEKDAYS[index].label}, {dayLabel(day)}</option>)}
                    </select>
                  </label>
                </div>
              ))}
              <AddRow label="Новое дело без даты" onAdd={(title) => props.onAddWeekItem(weekKey, 'inbox', title)} />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
