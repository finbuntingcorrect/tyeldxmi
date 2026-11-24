import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { dateFromKey, formatLocalDate } from '../lib/date';
import { monthGrid, type HabitStatus, type Notebook } from '../lib/notebook';
import { isMonthKey } from '../lib/route';
import { WEEKDAYS } from '../lib/plannerCopy';
import type { RepeatKind } from '../types';

type HabitsScreenProps = {
  book: Notebook;
  today: string;
  onCreate: (title: string, repeatKind: RepeatKind, weekdays: number[], start: string) => void;
  onRename: (id: string, title: string) => void;
  onArchive: (id: string, archived: boolean) => void;
  onMark: (habitId: string, date: string, status: HabitStatus | null) => void;
};

function monthTitle(month: string) {
  const formatted = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(dateFromKey(`${month}-01`));
  const clean = formatted.replace(/\s*г\.?$/u, '').trim();
  return clean.charAt(0).toLocaleUpperCase('ru-RU') + clean.slice(1);
}

function shiftMonth(month: string, delta: number) {
  const date = dateFromKey(`${month}-01`);
  date.setMonth(date.getMonth() + delta);
  const year = date.getFullYear();
  const next = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${next}`;
}

function HabitCard({
  habit,
  month,
  today,
  marks,
  onRename,
  onArchive,
  onMark,
}: {
  habit: Notebook['habits'][number];
  month: string;
  today: string;
  marks: Notebook['marks'];
  onRename: HabitsScreenProps['onRename'];
  onArchive: HabitsScreenProps['onArchive'];
  onMark: HabitsScreenProps['onMark'];
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(habit.title);
  const days = monthGrid(`${month}-01`);
  const done = marks.filter((mark) => mark.habitId === habit.id && mark.status === 'done' && mark.date.slice(0, 7) === month).length;

  useEffect(() => {
    if (!menu) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setMenu(false);
    }
    function onPointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    }
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menu]);

  function saveName() {
    const next = draft.trim();
    if (!next) {
      setDraft(habit.title);
      setRenaming(false);
      return;
    }
    onRename(habit.id, next);
    setRenaming(false);
  }

  function markDay(date: string, status: HabitStatus | null) {
    if (habit.archived || date > today || date < habit.start) return;
    onMark(habit.id, date, status === 'done' ? null : 'done');
  }

  return (
    <article data-habit={habit.id} className="min-w-0 py-3">
      <div ref={menuRef}>
        <div className="flex items-start gap-2">
          {renaming ? (
            <form className="min-w-0 flex-1" onSubmit={(event) => { event.preventDefault(); saveName(); }}>
              <label htmlFor={`habit-name-${habit.id}`} className="sr-only">Название привычки</label>
              <input
                id={`habit-name-${habit.id}`}
                autoFocus
                value={draft}
                maxLength={160}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape') return;
                  event.preventDefault();
                  event.stopPropagation();
                  setDraft(habit.title);
                  setRenaming(false);
                }}
                className="paper-field"
              />
              <div className="mt-2 flex gap-2">
                <button type="submit" className="paper-choice">Сохранить</button>
                <button type="button" onClick={() => { setDraft(habit.title); setRenaming(false); }} className="paper-choice">Отмена</button>
              </div>
            </form>
          ) : (
            <p className="min-w-0 flex-1 text-lg break-words text-ink">{habit.title}</p>
          )}
          <button
            type="button"
            aria-label={`Действия: ${habit.title}`}
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => setMenu((value) => !value)}
            className="min-h-11 shrink-0 px-2 text-sm font-semibold text-ink"
          >
            Ещё
          </button>
        </div>
        {menu ? (
          <div role="menu" className="mt-1 flex flex-wrap gap-2">
            <button type="button" role="menuitem" onClick={() => { setDraft(habit.title); setRenaming(true); setMenu(false); }} className="paper-choice">Редактировать</button>
            <button type="button" role="menuitem" onClick={() => { onArchive(habit.id, !habit.archived); setMenu(false); }} className="paper-choice">{habit.archived ? 'Вернуть' : 'Архивировать'}</button>
          </div>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted">{done === 0 ? 'В этом месяце пока пусто' : `В этом месяце ${done}`}</p>
      <div className="mt-3 grid grid-cols-7">
        {WEEKDAYS.map((day) => (
          <p key={day.id} className="px-0.5 text-center text-xs text-muted">{day.label}</p>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-y-1">
        {days.map((date) => {
          const status = marks.find((mark) => mark.habitId === habit.id && mark.date === date)?.status ?? null;
          const doneDay = status === 'done';
          const future = date > today;
          const before = date < habit.start;
          const outside = date.slice(0, 7) !== month;
          const locked = future || before || habit.archived;
          const state = future ? 'будущая дата' : doneDay ? 'выполнено' : 'не отмечено';
          return (
            <div key={date} className="flex justify-center">
              <button
                type="button"
                disabled={locked}
                aria-current={date === today ? 'date' : undefined}
                aria-pressed={doneDay}
                aria-label={`${habit.title}, ${formatLocalDate(dateFromKey(date))}, ${state}`}
                onClick={() => markDay(date, status)}
                className={`grid h-11 w-11 place-items-center rounded-full border text-sm leading-none font-semibold ${doneDay ? 'border-solid border-ink bg-ink text-card' : future ? 'border-dashed border-line text-muted' : before ? 'border-transparent text-muted' : 'border-solid border-ink text-ink'} ${outside && !doneDay ? 'opacity-50' : ''} ${locked ? 'cursor-default' : ''}`}
                style={date === today ? { boxShadow: '0 0 0 2px var(--color-card), 0 0 0 4px var(--color-primary)' } : undefined}
              >
                {Number(date.slice(8))}
              </button>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function HabitsScreen({ book, today, onCreate, onRename, onArchive, onMark }: HabitsScreenProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const saving = useRef(false);
  const [month, setMonth] = useState(() => {
    const stored = (window.history.state as { month?: string } | null)?.month;
    return stored && isMonthKey(stored) ? stored : today.slice(0, 7);
  });
  const active = book.habits.filter((habit) => !habit.archived);
  const archived = book.habits.filter((habit) => habit.archived);
  const empty = active.length === 0;

  function showMonth(next: string) {
    if (next === month) return;
    window.history.pushState({ month: next }, '', window.location.pathname);
    setMonth(next);
  }

  useEffect(() => {
    function onPop() {
      if (window.location.pathname !== '/app/habits') return;
      const stored = (window.history.state as { month?: string } | null)?.month;
      setMonth(stored && isMonthKey(stored) ? stored : today.slice(0, 7));
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [today]);

  function add() {
    if (saving.current) return;
    const next = title.trim();
    if (!next) return;
    saving.current = true;
    onCreate(next, 'daily', [], today);
    setTitle('');
    setOpen(false);
  }

  const form = open ? (
    <form className="py-2" onSubmit={(event) => { event.preventDefault(); add(); }}>
      <label htmlFor="habit-title" className="text-sm font-semibold">Название</label>
      <input id="habit-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="paper-field mt-1" />
      <div className="mt-3 flex gap-2">
        <button type="submit" className="paper-submit">Сохранить</button>
        <button type="button" onClick={() => { setTitle(''); setOpen(false); }} className="paper-choice">Отмена</button>
      </div>
    </form>
  ) : null;

  return (
    <section className="min-w-0">
      {book.habits.length === 0 ? (
        <header className="px-4 py-4 sm:px-6">
          <h2 className="font-serif text-3xl sm:text-5xl">Привычки</h2>
        </header>
      ) : (
        <header className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <button type="button" aria-label="Предыдущий месяц" onClick={() => showMonth(shiftMonth(month, -1))} className="grid h-11 w-11 shrink-0 place-items-center text-ink">
              <ChevronLeft aria-hidden="true" size={22} />
            </button>
            <div className="min-w-0 text-center">
              <h2 className="font-serif text-3xl leading-tight break-words sm:text-5xl">{monthTitle(month)}</h2>
              {month !== today.slice(0, 7) ? (
                <button type="button" onClick={() => showMonth(today.slice(0, 7))} className="mt-1 min-h-11 text-sm font-semibold text-ink">К сегодня</button>
              ) : null}
            </div>
            <button type="button" aria-label="Следующий месяц" onClick={() => showMonth(shiftMonth(month, 1))} className="grid h-11 w-11 shrink-0 place-items-center text-ink">
              <ChevronRight aria-hidden="true" size={22} />
            </button>
          </div>
        </header>
      )}
      {empty && !open && archived.length === 0 ? (
        <div className="px-4 py-8 text-center sm:px-6">
          <p className="text-base text-ink">Пока нет привычек.</p>
          <button type="button" onClick={() => { saving.current = false; setOpen(true); }} className="paper-submit mt-4">Добавить привычку</button>
        </div>
      ) : (
        <div className="px-4 sm:px-6">
          {form ?? <button type="button" onClick={() => { saving.current = false; setOpen(true); }} className="paper-submit">Добавить привычку</button>}
          <div className="mt-2 divide-y divide-line">
            {active.map((habit) => (
              <HabitCard key={habit.id} habit={habit} month={month} today={today} marks={book.marks} onRename={onRename} onArchive={onArchive} onMark={onMark} />
            ))}
          </div>
        </div>
      )}
      {archived.length > 0 ? (
        <details className="px-4 py-4 sm:px-6">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-ink">Архив · {archived.length}</summary>
          <div className="divide-y divide-line">
            {archived.map((habit) => (
              <HabitCard key={habit.id} habit={habit} month={month} today={today} marks={book.marks} onRename={onRename} onArchive={onArchive} onMark={onMark} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
