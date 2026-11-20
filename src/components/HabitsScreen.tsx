import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { dateFromKey, formatLocalDate } from '../lib/date';
import { habitSpan, nextHabitStatus, trackerProgressLabel, type HabitStatus, type Notebook } from '../lib/notebook';
import type { RepeatKind } from '../types';

const PRESETS = ['10 минут зарядки', 'Читать 20 минут', 'Учить английский'];

type HabitsScreenProps = {
  book: Notebook;
  today: string;
  onCreate: (title: string, repeatKind: RepeatKind, weekdays: number[], start: string) => void;
  onRename: (id: string, title: string) => void;
  onArchive: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
  onMark: (habitId: string, date: string, status: HabitStatus | null) => void;
};

function shortStart(start: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(dateFromKey(start));
}

function statusLabel(status: HabitStatus | null) {
  if (status === 'done') return 'сделано';
  if (status === 'missed') return 'не в счёт';
  return 'пусто';
}

function markTone(status: HabitStatus | null) {
  if (status === 'done') return 'border-ink bg-ink text-card';
  if (status === 'missed') return 'border-danger text-danger';
  return 'border-ink text-ink';
}

function HabitCard({
  habit,
  today,
  marks,
  onRename,
  onArchive,
  onDelete,
  onMark,
}: {
  habit: Notebook['habits'][number];
  today: string;
  marks: Notebook['marks'];
  onRename: HabitsScreenProps['onRename'];
  onArchive: HabitsScreenProps['onArchive'];
  onDelete: HabitsScreenProps['onDelete'];
  onMark: HabitsScreenProps['onMark'];
}) {
  const days = habitSpan(habit.start);
  const done = days.filter((date) => marks.some((mark) => mark.habitId === habit.id && mark.date === date && mark.status === 'done')).length;
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(habit.title);

  useEffect(() => {
    if (!menu) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setMenu(false);
      setConfirmDelete(false);
    }
    function onPointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenu(false);
        setConfirmDelete(false);
      }
    }
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menu]);

  function markDay(date: string, status: HabitStatus | null) {
    if (date > today || date < habit.start) return;
    onMark(habit.id, date, nextHabitStatus(status));
  }

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

  return (
    <article data-habit={habit.id} className="py-2">
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
        <div ref={menuRef} className={`relative shrink-0 ${menu ? 'z-30' : ''}`}>
          <button
            type="button"
            aria-label={`Действия: ${habit.title}`}
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => { setMenu((value) => !value); setConfirmDelete(false); }}
            className="grid h-11 w-11 place-items-center text-ink"
          >
            <MoreHorizontal aria-hidden="true" size={18} />
          </button>
          {menu ? (
            <div role="menu" className="absolute right-0 z-30 mt-1 min-w-44 border border-line bg-card py-1 shadow-sm">
              <button type="button" role="menuitem" onClick={() => { setDraft(habit.title); setRenaming(true); setMenu(false); }} className="block min-h-11 w-full px-3 text-left text-sm font-semibold">Переименовать</button>
              <button type="button" role="menuitem" onClick={() => { onArchive(habit.id, !habit.archived); setMenu(false); }} className="block min-h-11 w-full px-3 text-left text-sm font-semibold">{habit.archived ? 'Вернуть' : 'В архив'}</button>
              {confirmDelete ? (
                <button type="button" role="menuitem" onClick={() => { onDelete(habit.id); setMenu(false); }} className="block min-h-11 w-full px-3 text-left text-sm font-semibold text-danger">Удалить привычку</button>
              ) : (
                <button type="button" role="menuitem" onClick={() => setConfirmDelete(true)} className="block min-h-11 w-full px-3 text-left text-sm font-semibold text-danger">Удалить</button>
              )}
            </div>
          ) : null}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">{trackerProgressLabel(done)}</p>
      <p className="mt-1 text-xs text-muted">с {shortStart(habit.start)}</p>
      <div className="mt-4 grid grid-cols-6 gap-2">
        {days.map((date) => {
          const status = marks.find((mark) => mark.habitId === habit.id && mark.date === date)?.status ?? null;
          const ahead = date > today;
          const dayNumber = Number(date.slice(8));
          return (
            <button
              key={date}
              type="button"
              disabled={ahead}
              aria-current={date === today ? 'date' : undefined}
              aria-pressed={status === 'done'}
              aria-label={`${habit.title}, ${formatLocalDate(dateFromKey(date))}, ${statusLabel(status)}`}
              onClick={() => markDay(date, status)}
              className={`mx-auto grid aspect-square w-full max-w-11 place-items-center rounded-full border-2 text-[11px] leading-none font-semibold ${markTone(status)} ${date === today ? 'font-bold' : ''} ${ahead ? 'cursor-default opacity-40' : 'cursor-pointer'}`}
              style={date === today ? { boxShadow: '0 0 0 2px var(--color-card), 0 0 0 4px var(--color-primary)' } : undefined}
            >
              {dayNumber}
            </button>
          );
        })}
      </div>
    </article>
  );
}

export function HabitsScreen({ book, today, onCreate, onRename, onArchive, onDelete, onMark }: HabitsScreenProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  function add(name: string) {
    const next = name.trim();
    if (!next) return;
    onCreate(next, 'daily', [], today);
    setTitle('');
    setOpen(false);
  }

  const active = book.habits.filter((habit) => !habit.archived);
  const archived = book.habits.filter((habit) => habit.archived);

  return (
    <section>
      <header className="px-4 py-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Привычки</p>
        <h2 className="mt-1 font-serif text-4xl">Тридцать дней</h2>
        <div className="mx-3 mt-2 border-t border-line" />
        {book.habits.length > 0 ? <p className="mt-2 text-sm text-muted">Щелчок по кружку — сделано. Ещё щелчок — не в счёт.</p> : null}
      </header>
      <div className="px-4 py-4 sm:px-6">
        <button type="button" onClick={() => setOpen((value) => !value)} className="paper-submit">Добавить привычку</button>
        {open ? (
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button key={preset} type="button" onClick={() => add(preset)} className="min-h-11 border border-line px-3 text-sm font-semibold">{preset}</button>
              ))}
            </div>
            <form className="mt-4" onSubmit={(event) => { event.preventDefault(); add(title); }}>
              <label htmlFor="habit-title" className="text-sm font-semibold">Своя привычка</label>
              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end">
                <input id="habit-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="paper-field" />
                <button type="submit" className="paper-submit">Добавить</button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
      {active.length === 0 ? <p className="px-4 py-6 text-sm text-muted sm:px-6">{archived.length > 0 ? 'Активных привычек нет.' : 'Пока нет привычек.'}</p> : (
        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2">
          {active.map((habit) => (
            <HabitCard key={habit.id} habit={habit} today={today} marks={book.marks} onRename={onRename} onArchive={onArchive} onDelete={onDelete} onMark={onMark} />
          ))}
        </div>
      )}
      {archived.length > 0 ? (
        <details className="px-4 pb-6 sm:px-6">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-ink">Архив · {archived.length}</summary>
          <div className="grid gap-4 lg:grid-cols-2">
            {archived.map((habit) => (
              <HabitCard key={habit.id} habit={habit} today={today} marks={book.marks} onRename={onRename} onArchive={onArchive} onDelete={onDelete} onMark={onMark} />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
