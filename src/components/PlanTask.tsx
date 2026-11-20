import { useEffect, useId, useRef, useState } from 'react';
import { Flag, Minus, MoreHorizontal, Repeat, X } from 'lucide-react';
import { addDays } from '../../server/recurrence';
import { dateFromKey, formatLocalDate } from '../lib/date';
import { WEEKDAYS } from '../lib/plannerCopy';
import type { NotebookTask, TaskDraft } from '../lib/notebook';
import type { DayPart, Priority, RepeatKind } from '../types';
import { PaperCheck } from './PaperCheck';

type PlanTaskProps = {
  task: NotebookTask;
  today: string;
  onToggle: (id: string) => void;
  onMove: (id: string, date: string) => void;
  onPart: (id: string, part: DayPart) => void;
  onPriority: (id: string, priority: Priority) => void;
  onUpdate: (id: string, draft: TaskDraft, scope: 'one' | 'future') => void;
  onSkip: (id: string) => void;
  onFocus: (id: string) => void;
  onNote: (id: string, text: string) => void;
  shelves?: boolean;
};

type RepeatChoice = RepeatKind | 'none';

const PART_OPTIONS: { id: DayPart; label: string }[] = [
  { id: 'anytime', label: 'Без времени' },
  { id: 'morning', label: 'Утро' },
  { id: 'afternoon', label: 'День' },
  { id: 'evening', label: 'Вечер' },
];

const PRIORITY_OPTIONS: { id: Priority; label: string }[] = [
  { id: 'normal', label: 'Обычный' },
  { id: 'high', label: 'Важный' },
  { id: 'low', label: 'Низкий' },
];

const REPEAT_OPTIONS: { id: RepeatChoice; label: string }[] = [
  { id: 'none', label: 'Не повторяется' },
  { id: 'daily', label: 'Каждый день' },
  { id: 'weekdays', label: 'По будням' },
  { id: 'weekly', label: 'По дням' },
];

function weekdayOf(date: string) {
  return dateFromKey(date).getDay();
}

function sortedDays(days: number[]) {
  return [...days].sort((a, b) => a - b);
}

function sameDays(left: number[], right: number[]) {
  const a = sortedDays(left);
  const b = sortedDays(right);
  return a.length === b.length && a.every((day, index) => day === b[index]);
}

function repeatLabel(kind: NotebookTask['repeatKind']) {
  return REPEAT_OPTIONS.find((option) => option.id === kind)?.label ?? '';
}

function saveScope(task: NotebookTask, draft: TaskDraft): 'one' | 'future' {
  if (!task.seriesId) return 'one';
  const same = draft.title.trim() === task.title
    && draft.dayPart === task.dayPart
    && draft.priority === task.priority
    && draft.repeatKind === (task.repeatKind ?? 'none')
    && (draft.repeatKind !== 'weekly' || sameDays(draft.weekdays, task.weekdays));
  return same ? 'one' : 'future';
}

function Choice({ id, label, value, onChange, options }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <>
      <label htmlFor={id} className="mt-4 block text-sm font-semibold">{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="paper-field mt-1 text-base">
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </>
  );
}

function WeekdayChoices({ days, onToggle }: { days: number[]; onToggle: (day: number) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {WEEKDAYS.map((day) => (
        <button key={day.id} type="button" aria-pressed={days.includes(day.id)} onClick={() => onToggle(day.id)} className="paper-choice min-w-11">
          {day.label}
        </button>
      ))}
    </div>
  );
}

function NoteField({ id, open, note, onOpen, onChange }: {
  id: string;
  open: boolean;
  note: string;
  onOpen: () => void;
  onChange: (value: string) => void;
}) {
  if (!open) {
    return <button type="button" onClick={onOpen} className="mt-4 min-h-11 text-left text-sm font-semibold text-ink">Добавить заметку</button>;
  }
  return (
    <>
      <label htmlFor={id} className="mt-4 block text-sm font-semibold">Заметка</label>
      <textarea id={id} value={note} onChange={(event) => onChange(event.target.value)} maxLength={120} rows={3} className="paper-field mt-1 text-base" />
    </>
  );
}

export function AddTask({ date, part, onCreate }: {
  date: string;
  part: DayPart;
  onCreate: (draft: TaskDraft) => void;
}) {
  const titleId = useId();
  const dateId = useId();
  const partId = useId();
  const priorityId = useId();
  const repeatId = useId();
  const noteId = useId();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [title, setTitle] = useState('');
  const [dateEdit, setDateEdit] = useState<{ from: string; value: string } | null>(null);
  const [partEdit, setPartEdit] = useState<{ from: DayPart; value: DayPart } | null>(null);
  const when = dateEdit?.from === date ? dateEdit.value : date;
  const dayPart = partEdit?.from === part ? partEdit.value : part;
  const [priority, setPriority] = useState<Priority>('normal');
  const [repeatKind, setRepeatKind] = useState<RepeatChoice>('none');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function chooseRepeat(next: string) {
    const kind = next as RepeatChoice;
    setRepeatKind(kind);
    if (kind === 'weekly' && weekdays.length === 0) setWeekdays([weekdayOf(when)]);
  }

  function submit() {
    const next = title.trim();
    if (!next) {
      setError('Напиши название.');
      return;
    }
    if (!when) {
      setError('Выбери дату.');
      return;
    }
    setError(null);
    const days = repeatKind === 'weekly' ? (weekdays.length > 0 ? sortedDays(weekdays) : [weekdayOf(when)]) : [];
    onCreate({
      title: next,
      date: when,
      dayPart,
      priority,
      repeatKind,
      weekdays: days,
      note: note.trim() || null,
    });
    setTitle('');
    setDateEdit(null);
    setPartEdit(null);
    setPriority('normal');
    setRepeatKind('none');
    setWeekdays([]);
    setNote('');
    setNoteOpen(false);
    setDetails(false);
    setOpen(false);
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="min-h-11 px-1 text-sm font-semibold text-muted">+ Добавить</button>;
  }

  return (
    <form className="max-w-[28rem] py-2" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <label htmlFor={titleId} className="block text-sm font-semibold">Название задачи</label>
      <input
        id={titleId}
        autoFocus
        value={title}
        onChange={(event) => { setTitle(event.target.value); setError(null); }}
        onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center' })}
        maxLength={160}
        autoComplete="off"
        aria-invalid={error === 'Напиши название.'}
        className="paper-field mt-1 text-base"
      />
      {error ? <p role="alert" className="mt-2 text-sm font-semibold text-danger">{error}</p> : null}
      {details ? (
        <>
          <label htmlFor={dateId} className="mt-4 block text-sm font-semibold">Дата</label>
          <input id={dateId} type="date" value={when} onChange={(event) => { setDateEdit({ from: date, value: event.target.value }); setError(null); }} className="paper-field mt-1 text-base" />
        </>
      ) : (
        <>
          <p className="mt-4 text-sm font-semibold">Дата</p>
          <p className="mt-1 text-base text-ink">{formatLocalDate(dateFromKey(when))}</p>
        </>
      )}
      {details ? (
        <>
          <Choice id={partId} label="Время дня" value={dayPart} onChange={(value) => setPartEdit({ from: part, value: value as DayPart })} options={PART_OPTIONS} />
          <Choice id={priorityId} label="Приоритет" value={priority} onChange={(value) => setPriority(value as Priority)} options={PRIORITY_OPTIONS} />
          <Choice id={repeatId} label="Повтор" value={repeatKind} onChange={chooseRepeat} options={REPEAT_OPTIONS} />
          {repeatKind === 'weekly' ? (
            <WeekdayChoices
              days={weekdays}
              onToggle={(day) => setWeekdays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])}
            />
          ) : null}
          <NoteField id={noteId} open={noteOpen} note={note} onOpen={() => setNoteOpen(true)} onChange={setNote} />
        </>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="submit" className="paper-submit sm:min-w-36">Добавить</button>
        <button type="button" aria-expanded={details} onClick={() => setDetails((value) => !value)} className="paper-choice">Подробнее</button>
      </div>
    </form>
  );
}

export function PlanTask({ task, today, onToggle, onMove, onUpdate, onSkip, onFocus, onNote }: PlanTaskProps) {
  const dialogTitleId = useId();
  const titleId = useId();
  const dateId = useId();
  const partId = useId();
  const priorityId = useId();
  const repeatId = useId();
  const noteId = useId();
  const titleButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [date, setDate] = useState(task.date);
  const [dayPart, setDayPart] = useState<DayPart>(task.dayPart);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [repeatKind, setRepeatKind] = useState<RepeatChoice>(task.repeatKind ?? 'none');
  const [weekdays, setWeekdays] = useState<number[]>(task.weekdays);
  const [note, setNote] = useState(task.note ?? '');
  const [noteOpen, setNoteOpen] = useState(Boolean(task.note?.trim()));

  function closeEditor() {
    setOpen(false);
    titleButtonRef.current?.focus();
  }

  function openEditor() {
    setMenu(false);
    setTitle(task.title);
    setDate(task.date);
    setDayPart(task.dayPart);
    setPriority(task.priority);
    setRepeatKind(task.repeatKind ?? 'none');
    setWeekdays(task.weekdays);
    setNote(task.note ?? '');
    setNoteOpen(Boolean(task.note?.trim()));
    setOpen(true);
  }

  function chooseRepeat(next: string) {
    const kind = next as RepeatChoice;
    setRepeatKind(kind);
    if (kind === 'weekly' && weekdays.length === 0) setWeekdays([weekdayOf(date)]);
  }

  function save() {
    const nextTitle = title.trim();
    if (!nextTitle || !date) return;
    const days = repeatKind === 'weekly' ? (weekdays.length > 0 ? sortedDays(weekdays) : [weekdayOf(date)]) : [];
    const draft: TaskDraft = {
      title: nextTitle,
      date,
      dayPart,
      priority,
      repeatKind,
      weekdays: days,
    };
    const sameFields = nextTitle === task.title
      && date === task.date
      && dayPart === task.dayPart
      && priority === task.priority
      && repeatKind === (task.repeatKind ?? 'none')
      && (repeatKind !== 'weekly' || sameDays(days, task.weekdays));
    const sameNote = note.trim() === (task.note ?? '');
    if (!sameFields) {
      if (date !== task.date) onMove(task.id, date);
      onUpdate(task.id, draft, saveScope(task, draft));
    }
    if (!sameNote) onNote(task.id, note);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      titleButtonRef.current?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!menu) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenu(false);
    }
    function onPointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    }
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menu]);

  return (
    <div className="border-b border-line/70">
      <div className="flex items-center">
        <PaperCheck
          checked={task.completed}
          label={task.completed ? `Вернуть «${task.title}»` : `Выполнить «${task.title}»`}
          onClick={() => onToggle(task.id)}
        />
        <button
          ref={titleButtonRef}
          type="button"
          onClick={openEditor}
          className={`min-h-11 min-w-0 flex-1 py-2 text-left text-base break-words ${task.completed ? 'text-muted line-through' : 'text-ink'}`}
        >
          {task.title}
        </button>
        {task.repeatKind ? (
          <span role="img" aria-label={repeatLabel(task.repeatKind)} className="grid h-11 w-7 shrink-0 place-items-center text-muted">
            <Repeat aria-hidden="true" size={15} />
          </span>
        ) : null}
        {task.priority === 'high' ? (
          <span role="img" aria-label="Важный" className="grid h-11 w-7 shrink-0 place-items-center text-ink">
            <Flag aria-hidden="true" size={15} />
          </span>
        ) : null}
        {task.priority === 'low' ? (
          <span role="img" aria-label="Низкий" className="grid h-11 w-7 shrink-0 place-items-center text-muted">
            <Minus aria-hidden="true" size={15} />
          </span>
        ) : null}
        <div ref={menuRef} className={`relative shrink-0 ${menu ? 'z-30' : ''}`}>
          <button
            type="button"
            aria-label={`Действия: ${task.title}`}
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => setMenu((value) => !value)}
            className="grid h-11 w-11 place-items-center text-ink"
          >
            <MoreHorizontal aria-hidden="true" size={18} />
          </button>
          {menu ? (
            <div role="menu" className="absolute right-0 z-30 min-w-56 border border-line bg-card py-1 shadow-sm">
              <button type="button" role="menuitem" onClick={() => { setMenu(false); onMove(task.id, addDays(task.date, 1)); }} className="block min-h-11 w-full px-3 text-left text-sm font-semibold">
                На завтра
              </button>
              {task.date === today ? (
                <button type="button" role="menuitem" onClick={() => { setMenu(false); onFocus(task.id); }} className="block min-h-11 w-full px-3 text-left text-sm font-semibold">
                  В фокус
                </button>
              ) : null}
              <div className="mt-1 border-t border-line pt-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setMenu(false); onSkip(task.id); }}
                  className="block min-h-11 w-full px-3 text-left text-sm font-semibold text-danger"
                >
                  {task.seriesId ? 'Пропустить только этот день' : 'Удалить'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 sm:items-center sm:p-4" onClick={closeEditor}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[min(40rem,calc(100dvh-0.5rem))] w-full max-w-[28rem] flex-col overflow-hidden border border-line bg-card shadow-sm"
          >
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); save(); }}>
              <div className="flex items-center justify-between gap-3 px-5 pt-4">
                <h2 id={dialogTitleId} className="font-serif text-2xl text-ink">Задача</h2>
                <button type="button" aria-label="Закрыть" onClick={closeEditor} className="grid h-11 w-11 place-items-center text-ink">
                  <X aria-hidden="true" size={18} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-4">
                <label htmlFor={titleId} className="block text-sm font-semibold">Название задачи</label>
                <input id={titleId} autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} autoComplete="off" className="paper-field mt-1 text-base" />
                <label htmlFor={dateId} className="mt-4 block text-sm font-semibold">Дата</label>
                <input id={dateId} type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="paper-field mt-1 text-base" />
                <Choice id={partId} label="Время дня" value={dayPart} onChange={(value) => setDayPart(value as DayPart)} options={PART_OPTIONS} />
                <Choice id={priorityId} label="Приоритет" value={priority} onChange={(value) => setPriority(value as Priority)} options={PRIORITY_OPTIONS} />
                <Choice id={repeatId} label="Повтор" value={repeatKind} onChange={chooseRepeat} options={REPEAT_OPTIONS} />
                {repeatKind === 'weekly' ? (
                  <WeekdayChoices
                    days={weekdays}
                    onToggle={(day) => setWeekdays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])}
                  />
                ) : null}
                <NoteField id={noteId} open={noteOpen} note={note} onOpen={() => setNoteOpen(true)} onChange={setNote} />
              </div>
              <div className="flex gap-2 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button type="submit" className="paper-submit min-h-11 flex-1">Сохранить</button>
                <button type="button" onClick={closeEditor} className="paper-choice min-h-11 flex-1">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
