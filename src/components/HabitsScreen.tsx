import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { weekday } from '../../server/recurrence';
import { dateFromKey } from '../lib/date';
import { habitIsScheduled, monthDates, nextHabitStatus, type Habit, type HabitStatus, type Notebook } from '../lib/notebook';
import { isMonthKey } from '../lib/route';
import type { RepeatKind } from '../types';

type HabitsScreenProps = {
  book: Notebook;
  today: string;
  onCreate: (title: string, repeatKind: RepeatKind, weekdays: number[], start: string) => void;
  onRename: (id: string, title: string) => void;
  onArchive: (id: string, archived: boolean) => void;
  onMark: (habitId: string, date: string, status: HabitStatus | null) => Promise<string | null> | void;
};

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const DOW = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function monthTitle(month: string) {
  const formatted = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(dateFromKey(`${month}-01`));
  const clean = formatted.replace(/\s*г\.?$/u, '').trim();
  return clean.charAt(0).toLocaleUpperCase('ru-RU') + clean.slice(1);
}

function shiftMonth(month: string, delta: number) {
  const date = dateFromKey(`${month}-01`);
  date.setMonth(date.getMonth() + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dayText(date: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' }).format(dateFromKey(date));
}

function markLabel(status: HabitStatus | null) {
  if (status === 'done') return 'выполнено';
  if (status === 'missed') return 'не выполнено';
  return 'не отмечено';
}

function showFocus(node: HTMLElement | null | undefined) {
  node?.focus(Object.assign({ preventScroll: true }, { focusVisible: true }));
}

function focusHabitTitle(id: string) {
  window.requestAnimationFrame(() => showFocus(document.getElementById(`habit-title-${id}`)));
}

function placeHabitMenu(menu: HTMLElement, anchor: HTMLElement) {
  const rect = anchor.getBoundingClientRect();
  const margin = 8;
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  let left = rect.left;
  let top = rect.bottom + 4;
  if (left + width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - width - margin);
  if (top + height > window.innerHeight - margin) top = Math.max(margin, rect.top - height - 4);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

function alignTracker(node: HTMLDivElement, month: string, today: string) {
  if (month !== today.slice(0, 7)) {
    node.scrollLeft = 0;
    return;
  }
  const cell = node.querySelector<HTMLElement>('[data-today-col="true"]');
  const name = node.querySelector<HTMLElement>('.habit-name-head');
  if (!cell) return;
  const sticky = name?.getBoundingClientRect().width ?? 0;
  const delta = cell.getBoundingClientRect().left - node.getBoundingClientRect().left - sticky;
  node.scrollLeft += delta - 4;
}

function HabitTable({
  habits,
  month,
  today,
  marks,
  readOnly,
  adding,
  onRename,
  onArchive,
  onMark,
}: {
  habits: Habit[];
  month: string;
  today: string;
  marks: Notebook['marks'];
  readOnly: boolean;
  adding?: { open: boolean; title: string; invalid: boolean; onOpen: () => void; onTitle: (value: string) => void; onSave: () => void; onCancel: () => void };
  onRename: HabitsScreenProps['onRename'];
  onArchive: HabitsScreenProps['onArchive'];
  onMark: HabitsScreenProps['onMark'];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [focus, setFocus] = useState<{ month: string; key: string | null }>({ month, key: null });
  if (focus.month !== month) setFocus({ month, key: null });
  const cursor = focus.key;
  const dates = useMemo(() => monthDates(month), [month]);
  const markMap = useMemo(() => {
    const map = new Map<string, HabitStatus>();
    for (const mark of marks) map.set(`${mark.habitId}:${mark.date}`, mark.status);
    return map;
  }, [marks]);
  function cellLocked(habit: Habit, date: string) {
    if (readOnly || habit.archived || date > today || date < habit.start) return true;
    return !habitIsScheduled(habit, date);
  }
  let firstOpen: string | null = null;
  if (!readOnly) {
    for (const habit of habits) {
      for (const date of dates) {
        if (!cellLocked(habit, date)) {
          firstOpen = `${habit.id}:${date}`;
          break;
        }
      }
      if (firstOpen) break;
    }
  }
  const cursorHere = cursor !== null && habits.some((habit) => cursor.startsWith(`${habit.id}:`));
  const tabStop = cursorHere ? cursor : firstOpen;

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || readOnly) return;
    alignTracker(node, month, today);
  }, [month, today, readOnly]);

  const menuHabit = habits.find((habit) => habit.id === menuId) ?? null;

  useLayoutEffect(() => {
    if (!menuId) return;
    const menu = document.getElementById(`habit-menu-${menuId}`);
    const anchor = document.getElementById(`habit-title-${menuId}`);
    if (!menu || !anchor) return;
    placeHabitMenu(menu, anchor);
    const frame = window.requestAnimationFrame(() => showFocus(menu.querySelector<HTMLElement>('[role="menuitem"]')));
    return () => window.cancelAnimationFrame(frame);
  }, [menuId]);

  useEffect(() => {
    if (!menuId) return;
    const id = menuId;
    function place() {
      const menu = document.getElementById(`habit-menu-${id}`);
      const anchor = document.getElementById(`habit-title-${id}`);
      if (!menu || !anchor) return;
      placeHabitMenu(menu, anchor);
    }
    function dismiss() {
      setMenuId(null);
      focusHabitTitle(id);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dismiss();
    }
    function onPointer(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (document.getElementById(`habit-menu-${id}`)?.contains(target)) return;
      if (document.getElementById(`habit-title-${id}`)?.contains(target)) return;
      dismiss();
    }
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menuId]);

  function move(habitId: string, date: string, key: string) {
    const row = habits.findIndex((habit) => habit.id === habitId);
    const column = dates.indexOf(date);
    if (row < 0 || column < 0) return;
    let nextRow = row;
    let nextColumn = column;
    if (key === 'ArrowLeft') nextColumn = Math.max(0, column - 1);
    if (key === 'ArrowRight') nextColumn = Math.min(dates.length - 1, column + 1);
    if (key === 'ArrowUp') nextRow = Math.max(0, row - 1);
    if (key === 'ArrowDown') nextRow = Math.min(habits.length - 1, row + 1);
    if (key === 'Home') nextColumn = 0;
    if (key === 'End') nextColumn = dates.length - 1;
    const nextId = habits[nextRow]?.id;
    const nextDate = dates[nextColumn];
    if (!nextId || !nextDate) return;
    const next = `${nextId}:${nextDate}`;
    setFocus({ month, key: next });
    const cell = document.getElementById(`habit-cell-${nextId}-${nextDate}`);
    cell?.focus();
    const scroller = scrollerRef.current;
    if (!cell || !scroller) return;
    const cellRect = cell.getBoundingClientRect();
    const scrollRect = scroller.getBoundingClientRect();
    const sticky = scroller.querySelector('.habit-name-head')?.getBoundingClientRect().width ?? 0;
    if (cellRect.left < scrollRect.left + sticky) scroller.scrollLeft -= scrollRect.left + sticky - cellRect.left + 4;
    else if (cellRect.right > scrollRect.right) scroller.scrollLeft += cellRect.right - scrollRect.right + 4;
  }

  function finishRename(habit: Habit) {
    setDraft(habit.title);
    setRenamingId(null);
    focusHabitTitle(habit.id);
  }

  function saveName(habit: Habit) {
    const next = draft.trim();
    if (!next) {
      finishRename(habit);
      return;
    }
    onRename(habit.id, next);
    setRenamingId(null);
    focusHabitTitle(habit.id);
  }

  return (
    <div ref={scrollerRef} className="habit-scroll" style={{ ['--habit-days' as string]: dates.length }}>
      <table className="habit-table">
        <caption className="sr-only">Трекер привычек за {monthTitle(month)}</caption>
        <colgroup>
          <col className="habit-name-col" />
          {dates.map((date) => <col key={date} className="habit-day-col" />)}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="habit-name habit-name-head">Привычка</th>
            {dates.map((date) => {
              const weekend = weekday(date) === 0 || weekday(date) === 6;
              const current = date === today;
              return (
                <th
                  key={date}
                  scope="col"
                  data-today-col={current ? 'true' : undefined}
                  aria-current={current ? 'date' : undefined}
                  className={`habit-day-head ${current ? 'is-today' : ''} ${weekend ? 'is-weekend' : ''}`}
                >
                  <span className="habit-num">{Number(date.slice(8))}</span>
                  <span className="habit-dow">{DOW[weekday(date)]}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {habits.map((habit) => (
            <tr key={habit.id}>
              <th scope="row" className="habit-name">
                {renamingId === habit.id ? (
                  <form className="habit-rename" onSubmit={(event) => { event.preventDefault(); saveName(habit); }}>
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
                        finishRename(habit);
                      }}
                      className="paper-field"
                    />
                    <div className="habit-rename-actions">
                      <button type="submit" className="paper-choice">Сохранить</button>
                      <button type="button" className="paper-choice" onClick={() => finishRename(habit)}>Отмена</button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    id={`habit-title-${habit.id}`}
                    className="habit-title"
                    aria-haspopup="menu"
                    aria-expanded={menuId === habit.id}
                    aria-controls={menuId === habit.id ? `habit-menu-${habit.id}` : undefined}
                    onClick={() => setMenuId((current) => current === habit.id ? null : habit.id)}
                  >
                    {habit.title}
                  </button>
                )}
              </th>
              {dates.map((date) => {
                const status = markMap.get(`${habit.id}:${date}`) ?? null;
                const before = date < habit.start;
                const future = date > today;
                const scheduled = !before && habitIsScheduled(habit, date);
                const locked = cellLocked(habit, date);
                const reason = future ? 'будущая дата' : before ? 'до начала привычки' : !scheduled ? 'вне расписания' : markLabel(status);
                const key = `${habit.id}:${date}`;
                const weekend = weekday(date) === 0 || weekday(date) === 6;
                const tone = date === today ? 'is-today' : weekend ? 'is-weekend' : '';
                const stateClass = future || before ? 'is-muted' : !scheduled ? 'is-off' : '';
                return (
                  <td key={date} className={`${tone} ${stateClass}`}>
                    <button
                      id={`habit-cell-${habit.id}-${date}`}
                      type="button"
                      className="habit-cell"
                      aria-disabled={locked || undefined}
                      tabIndex={readOnly ? -1 : key === tabStop ? 0 : -1}
                      aria-label={`${habit.title}, ${dayText(date)}, ${reason}`}
                      onFocus={() => setFocus({ month, key })}
                      onKeyDown={(event) => {
                        if (readOnly || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
                        event.preventDefault();
                        move(habit.id, date, event.key);
                      }}
                      onClick={() => {
                        if (locked) return;
                        onMark(habit.id, date, nextHabitStatus(status));
                      }}
                    >
                      {status === 'done' ? <span className="habit-check" aria-hidden="true">✓</span> : null}
                      {status === 'missed' ? <span className="habit-cross" aria-hidden="true">×</span> : null}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
          {adding ? (
            <tr>
              <th scope="row" className="habit-name">
                {adding.open ? (
                  <form className="habit-rename" onSubmit={(event) => { event.preventDefault(); adding.onSave(); }}>
                    <label htmlFor="habit-title" className="sr-only">Название привычки</label>
                    <input
                      id="habit-title"
                      autoFocus
                      value={adding.title}
                      maxLength={160}
                      aria-invalid={adding.invalid || undefined}
                      placeholder="Название"
                      onChange={(event) => adding.onTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Escape') return;
                        event.preventDefault();
                        event.stopPropagation();
                        adding.onCancel();
                      }}
                      className="paper-field"
                    />
                    <div className="habit-rename-actions">
                      <button type="submit" className="paper-choice">Сохранить</button>
                      <button type="button" className="paper-choice" onClick={adding.onCancel}>Отмена</button>
                    </div>
                  </form>
                ) : (
                  <button type="button" className="habit-add" onClick={adding.onOpen}>
                    <Plus aria-hidden="true" size={18} />
                    Добавить привычку
                  </button>
                )}
              </th>
              {dates.map((date) => <td key={date} />)}
            </tr>
          ) : null}
        </tbody>
      </table>
      {menuHabit ? createPortal(
        <div id={`habit-menu-${menuHabit.id}`} role="menu" aria-label={`Действия: ${menuHabit.title}`} className="habit-menu">
          <button type="button" role="menuitem" className="paper-choice" onClick={() => { setDraft(menuHabit.title); setRenamingId(menuHabit.id); setMenuId(null); }}>Редактировать</button>
          <button type="button" role="menuitem" className="paper-choice" onClick={() => { onArchive(menuHabit.id, !menuHabit.archived); setMenuId(null); }}>{menuHabit.archived ? 'Вернуть' : 'Архивировать'}</button>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

export function HabitsScreen({ book, today, onCreate, onRename, onArchive, onMark }: HabitsScreenProps) {
  const pickerId = useId();
  const saving = useRef(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [picking, setPicking] = useState(false);
  const [month, setMonth] = useState(() => {
    const stored = (window.history.state as { month?: string } | null)?.month;
    return stored && isMonthKey(stored) ? stored : today.slice(0, 7);
  });
  const active = book.habits.filter((habit) => !habit.archived);
  const archived = book.habits.filter((habit) => habit.archived);
  const currentMonth = today.slice(0, 7);
  const yearNow = Number(today.slice(0, 4));
  const selectedYear = Number(month.slice(0, 4));
  const years = Array.from(new Set([selectedYear, ...Array.from({ length: 10 }, (_, index) => yearNow - 8 + index)])).sort((a, b) => a - b);

  function showMonth(next: string) {
    if (!isMonthKey(next) || next === month) return;
    window.history.pushState({ month: next }, '', window.location.pathname);
    setMonth(next);
    setPicking(false);
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

  function addHabit() {
    if (saving.current) return;
    const next = title.trim();
    if (!next) {
      setInvalid(true);
      return;
    }
    saving.current = true;
    onCreate(next, 'daily', [], today);
    setTitle('');
    setInvalid(false);
    setAdding(false);
    saving.current = false;
  }

  const addRow = {
    open: adding,
    title,
    invalid,
    onOpen: () => { saving.current = false; setInvalid(false); setAdding(true); },
    onTitle: (value: string) => { setTitle(value); setInvalid(false); },
    onSave: addHabit,
    onCancel: () => { setTitle(''); setInvalid(false); setAdding(false); },
  };

  return (
    <section className="habit-board">
      <header className="habit-nav">
        <button type="button" className="habit-arrow" aria-label="Предыдущий месяц" onClick={() => showMonth(shiftMonth(month, -1))}>
          <ChevronLeft aria-hidden="true" size={22} />
        </button>
        <div className="habit-month-wrap">
          <button
            type="button"
            className="habit-month"
            aria-expanded={picking}
            aria-controls={pickerId}
            onClick={() => setPicking((value) => !value)}
          >
            {monthTitle(month)}
          </button>
          <p className="sr-only" aria-live="polite">{`Месяц ${monthTitle(month)}`}</p>
          {picking ? (
            <div id={pickerId} className="habit-picker" role="group" aria-label="Выбор месяца и года">
              <label>
                Месяц
                <select value={month.slice(5, 7)} onChange={(event) => showMonth(`${month.slice(0, 4)}-${event.target.value}`)}>
                  {MONTHS.map((name, index) => (
                    <option key={name} value={String(index + 1).padStart(2, '0')}>{name}</option>
                  ))}
                </select>
              </label>
              <label>
                Год
                <select value={month.slice(0, 4)} onChange={(event) => showMonth(`${event.target.value}-${month.slice(5, 7)}`)}>
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
              </label>
            </div>
          ) : null}
        </div>
        <button type="button" className="habit-arrow" aria-label="Следующий месяц" onClick={() => showMonth(shiftMonth(month, 1))}>
          <ChevronRight aria-hidden="true" size={22} />
        </button>
        <button type="button" className="habit-current" disabled={month === currentMonth} onClick={() => showMonth(currentMonth)}>Текущий месяц</button>
      </header>
      <p className="habit-hint">Нажимай на ячейку: ✓ → × → пусто</p>
      {active.length === 0 && !adding ? <p className="habit-empty">Пока нет привычек.</p> : null}
      <HabitTable
        habits={active}
        month={month}
        today={today}
        marks={book.marks}
        readOnly={false}
        adding={addRow}
        onRename={onRename}
        onArchive={onArchive}
        onMark={onMark}
      />
      {archived.length > 0 ? (
        <details className="habit-archive">
          <summary>Архив · {archived.length}</summary>
          <HabitTable
            habits={archived}
            month={month}
            today={today}
            marks={book.marks}
            readOnly
            onRename={onRename}
            onArchive={onArchive}
            onMark={onMark}
          />
        </details>
      ) : null}
    </section>
  );
}
