import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { addDays } from '../../server/recurrence';
import { dateFromKey } from '../lib/date';
import { tasksForDate, weekDates, type Notebook, type TaskDraft, type TaskMark, type WeekItem } from '../lib/notebook';
import { isPageDate, weekMonday } from '../lib/route';
import { PlanTask } from './PlanTask';

const DAY_NAMES = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const BANDS = ['sage', 'peach', 'sand', 'sage', 'sand', 'peach', 'sage'];

type DiaryScreenProps = {
  book: Notebook;
  today: string;
  week: string | null;
  highlight: string | null;
  reduced: boolean;
  onOpenWeek: (monday: string) => void;
  onOpenDay: (date: string) => void;
  onCreate: (draft: TaskDraft) => void;
  onPart: (id: string, part: import('../types').DayPart) => void;
  onPriority: (id: string, priority: import('../types').Priority) => void;
  onMove: (id: string, date: string) => void;
  onUpdate: (id: string, draft: TaskDraft, scope: 'one' | 'future') => void;
  onSkip: (id: string) => void;
  onDeleteFollowing: (id: string) => void;
  onFocus: (id: string) => void;
  onNote: (id: string, text: string) => void;
  onMark: (id: string, mark: TaskMark | null) => Promise<string | null>;
  onAddWeekItem: (week: string, kind: WeekItem['kind'], title: string) => void;
  onToggleWeekItem: (id: string) => void;
  ensureWeek: (monday: string) => void;
};

function monthName(date: Date) {
  const formatted = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date);
  return formatted.replace(/^\d+\s+/u, '');
}

function weekLabel(monday: string) {
  const days = weekDates(monday);
  const first = dateFromKey(days[0]);
  const last = dateFromKey(days[6]);
  if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
    return `${first.getDate()}–${last.getDate()} ${monthName(last)} ${last.getFullYear()}`;
  }
  if (first.getFullYear() !== last.getFullYear()) {
    return `${first.getDate()} ${monthName(first)} ${first.getFullYear()} – ${last.getDate()} ${monthName(last)} ${last.getFullYear()}`;
  }
  return `${first.getDate()} ${monthName(first)} – ${last.getDate()} ${monthName(last)} ${last.getFullYear()}`;
}

function dayLabel(date: string) {
  const value = dateFromKey(date);
  return `${value.getDate()} ${monthName(value)}`;
}

export function DiaryScreen(props: DiaryScreenProps) {
  const target = weekMonday(props.week && isPageDate(props.week) ? props.week : props.today);
  const [shown, setShown] = useState(target);
  const [turning, setTurning] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [editing, setEditing] = useState(0);
  const [fresh, setFresh] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const [importantDays, setImportantDays] = useState<Record<string, boolean>>({});
  const desired = useRef(target);
  const adding = useRef(new Set<string>());
  const ensureRef = useRef(props.ensureWeek);
  const pickerId = useId();
  const days = weekDates(shown);
  const goals = props.book.weekItems.filter((item) => item.week === shown && item.kind === 'goal');
  const label = weekLabel(shown);

  useEffect(() => {
    ensureRef.current = props.ensureWeek;
  });
  useEffect(() => {
    ensureRef.current(shown);
  }, [shown]);

  if (editing === 0 && target !== shown) {
    if (props.reduced || turning) {
      if (props.reduced) {
        setShown(target);
        if (turning) setTurning(false);
      }
    } else {
      setDirection(target > shown ? 'next' : 'prev');
      setTurning(true);
    }
  }

  function finishTurn(event: React.AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    setShown(desired.current);
    setTurning(false);
  }

  const pending = useRef(target);
  useEffect(() => {
    desired.current = target;
    pending.current = target;
  }, [target]);

  useEffect(() => {
    if (!turning) return;
    const timer = window.setTimeout(() => {
      setShown(desired.current);
      setTurning(false);
    }, 480);
    return () => window.clearTimeout(timer);
  }, [turning]);

  function shift(delta: number) {
    if (editing > 0) return;
    const next = addDays(pending.current, delta);
    pending.current = next;
    props.onOpenWeek(next);
  }

  async function choose(id: string, mark: TaskMark | null) {
    setFresh(id);
    const message = await props.onMark(id, mark);
    if (message) {
      setFresh((current) => current === id ? null : current);
      return;
    }
    window.setTimeout(() => setFresh((current) => current === id ? null : current), 260);
  }

  function closeAdd(date: string) {
    adding.current.delete(date);
    setDrafts((current) => ({ ...current, [date]: '' }));
    setImportantDays((current) => ({ ...current, [date]: false }));
    setOpenDays((current) => ({ ...current, [date]: false }));
  }

  function renderDay(date: string, index: number) {
    const open = openDays[date] === true;
    const important = importantDays[date] === true;
    return (
      <section
        key={date}
        className={`diary-day band-${BANDS[index]} ${date === props.today ? 'is-today' : ''} ${date === props.highlight ? 'is-selected' : ''}`}
        aria-labelledby={`day-${date}`}
      >
        <header className="diary-day-head">
          <h3 id={`day-${date}`}>{DAY_NAMES[index]}, {dayLabel(date)}</h3>
          {date === props.today ? <span className="diary-today">Сегодня</span> : null}
        </header>
        <div className="diary-lines">
          {tasksForDate(props.book, date).map((task) => (
            <PlanTask
              key={task.id}
              diary
              stampFresh={fresh === task.id}
              task={task}
              today={props.today}
              series={props.book.series.find((rule) => rule.id === task.seriesId) ?? null}
              onToggle={() => undefined}
              onPart={props.onPart}
              onPriority={props.onPriority}
              onMove={props.onMove}
              onUpdate={props.onUpdate}
              onSkip={props.onSkip}
              onDeleteFollowing={props.onDeleteFollowing}
              onFocus={props.onFocus}
              onNote={props.onNote}
              onMark={(id, mark) => { void choose(id, mark); }}
              onEditing={(value) => setEditing((count) => value ? count + 1 : Math.max(0, count - 1))}
            />
          ))}
          {open ? (
            <form
              className={`diary-task diary-compose ${important ? 'is-important' : ''}`}
              onSubmit={(event) => {
                event.preventDefault();
                const title = (drafts[date] ?? '').trim();
                if (!title || adding.current.has(date)) return;
                adding.current.add(date);
                props.onCreate({ title, date, dayPart: 'anytime', priority: important ? 'high' : 'normal', repeatKind: 'none', weekdays: [] });
                closeAdd(date);
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                closeAdd(date);
              }}
            >
              <span className="diary-state" aria-hidden="true"><span className="diary-state-box" /></span>
              <input
                id={`add-${date}`}
                autoFocus
                value={drafts[date] ?? ''}
                maxLength={160}
                aria-label={`Новая задача, ${dayLabel(date)}`}
                onChange={(event) => setDrafts((current) => ({ ...current, [date]: event.target.value }))}
                className="diary-compose-input"
              />
              <button
                type="button"
                className={`diary-flag ${important ? 'is-on' : ''}`}
                aria-pressed={important}
                onClick={() => setImportantDays((current) => ({ ...current, [date]: !important }))}
              >
                Важно
              </button>
              <button type="submit" className="diary-compose-save" aria-label="Сохранить задачу">
                <Check aria-hidden="true" size={18} />
              </button>
            </form>
          ) : (
            <button type="button" className="diary-plus" aria-label="Добавить задачу" onClick={() => { adding.current.delete(date); setOpenDays((current) => ({ ...current, [date]: true })); }}>
              <Plus aria-hidden="true" size={18} />
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="diary" aria-busy={turning}>
      <div className="diary-nav">
        <button type="button" className="diary-arrow" aria-label="Предыдущая неделя" disabled={editing > 0} onClick={() => shift(-7)}>
          <ChevronLeft aria-hidden="true" size={22} />
        </button>
        <div className="diary-range">
          <button type="button" className="diary-range-button" aria-expanded={picking} aria-controls={pickerId} onClick={() => setPicking((value) => !value)}>
            {label}
          </button>
          <p className="sr-only" aria-live="polite">{turning ? '' : `Неделя ${label}`}</p>
          {picking ? (
            <div id={pickerId} className="diary-picker">
              <label htmlFor={`${pickerId}-date`}>Перейти к дате</label>
              <input
                id={`${pickerId}-date`}
                type="date"
                autoFocus
                defaultValue={props.highlight || shown}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!isPageDate(value)) return;
                  setPicking(false);
                  props.onOpenDay(value);
                }}
              />
            </div>
          ) : null}
        </div>
        <button type="button" className="diary-arrow" aria-label="Следующая неделя" disabled={editing > 0} onClick={() => shift(7)}>
          <ChevronRight aria-hidden="true" size={22} />
        </button>
        <button type="button" className="diary-today-button" disabled={editing > 0} onClick={() => { pending.current = weekMonday(props.today); props.onOpenWeek(pending.current); }}>Эта неделя</button>
      </div>
      <div className={`diary-spread ${turning ? `is-turning turn-${direction}` : ''}`} onAnimationEnd={finishTurn}>
        <div className="diary-page diary-page-left">
          {renderDay(days[0], 0)}
          {renderDay(days[1], 1)}
          {renderDay(days[2], 2)}
        </div>
        <div className="diary-page diary-page-right">
          {renderDay(days[3], 3)}
          {renderDay(days[4], 4)}
          <div className="diary-weekend">
            {renderDay(days[5], 5)}
            {renderDay(days[6], 6)}
          </div>
        </div>
      </div>
      <aside className="diary-goals">
        <h3>Цели недели</h3>
        <p>{label}</p>
        {goals.map((item) => (
          <label key={item.id} className="diary-goal">
            <input type="checkbox" checked={item.completed} onChange={() => props.onToggleWeekItem(item.id)} />
            <span className={item.completed ? 'is-done' : undefined}>{item.title}</span>
          </label>
        ))}
        <GoalAdd
          onAdd={(title) => props.onAddWeekItem(shown, 'goal', title)}
          onEditing={(value) => setEditing((count) => value ? count + 1 : Math.max(0, count - 1))}
        />
      </aside>
    </section>
  );
}

function GoalAdd({ onAdd, onEditing }: { onAdd: (title: string) => void; onEditing: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const lock = useRef(false);
  if (!open) return <button type="button" className="diary-goal-add" onClick={() => { lock.current = false; setOpen(true); onEditing(true); }}>Добавить цель</button>;
  return (
    <form className="diary-add" onSubmit={(event) => {
      event.preventDefault();
      if (lock.current) return;
      const next = title.trim();
      if (!next) return;
      lock.current = true;
      onAdd(next);
      setTitle('');
      setOpen(false);
      onEditing(false);
    }}
    >
      <label className="sr-only" htmlFor="week-goal">Новая цель недели</label>
      <input id="week-goal" autoFocus value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} className="paper-field" />
      <button type="submit" className="paper-submit">Добавить</button>
      <button type="button" className="paper-choice" onClick={() => { setTitle(''); setOpen(false); onEditing(false); }}>Отмена</button>
    </form>
  );
}
