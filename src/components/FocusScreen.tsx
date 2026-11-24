import { useId, useRef, useState } from 'react';
import { Minus, Volume2, VolumeX } from 'lucide-react';
import { CatSprite, type CatClip } from './CatSprite';
import { PaperCheck } from './PaperCheck';
import { TreatSprite } from './TreatSprite';
import {
  FOCUS_PRESETS,
  countWord,
  cycleMarks,
  focusWorkedMs,
  formatClock,
  minutesLabel,
  remainingMs,
  treatDay,
  treatOffer,
  type FocusSession,
  type PhaseChoice,
  type TreatKind,
} from '../lib/focusSession';
import { tasksForDate, type Notebook, type NotebookTask } from '../lib/notebook';

type FocusScreenProps = {
  book: Notebook;
  today: string;
  session: FocusSession | null;
  now: number;
  reduced: boolean;
  notice: string | null;
  remind: boolean;
  onStartPhase: (phase: PhaseChoice, taskId: string, minutes: number) => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onBreak: () => void;
  onSkipBreak: () => void;
  onAgain: () => void;
  onReset: () => void;
  onCompleteTask: () => void;
  onToggle: (id: string) => void;
  onSelectTask: (id: string | null) => void;
  onCreate: (title: string) => void;
  onMinutes: (minutes: number) => void;
  onToggleSound: () => void;
  onDismissNotice: () => void;
  onDismissRemind: () => void;
  onFeed: (kind: TreatKind) => Promise<boolean>;
};


function FocusTaskRow({ task, selected, onToggle, onSelect }: {
  task: NotebookTask;
  selected: boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={`flex items-start ${selected ? 'bg-field' : ''}`}>
      <PaperCheck checked={task.completed} label={task.completed ? `Вернуть «${task.title}»` : `Выполнить «${task.title}»`} onClick={() => onToggle(task.id)} />
      <button type="button" onClick={() => onSelect(task.id)} className="min-h-11 min-w-0 flex-1 py-2 text-left">
        {task.priority === 'high' && !task.completed ? (
          <span className="task-title-important"><span aria-hidden="true">! </span>{task.title}</span>
        ) : (
          <span className={`block break-words text-base ${task.completed ? 'text-muted line-through' : task.priority === 'low' ? 'text-low' : 'text-ink'}`}>
            {task.priority === 'high' ? <span aria-hidden="true">! </span> : null}
            {task.title}
          </span>
        )}
        {task.priority === 'high' ? <span className="sr-only"> Важный.</span> : null}
      </button>
      {task.priority === 'low' ? (
        <span role="img" aria-label="Низкий" className="grid h-11 w-7 shrink-0 place-items-center text-low">
          <Minus aria-hidden="true" size={15} />
        </span>
      ) : null}
    </div>
  );
}

function Ring({ progress, tone }: { progress: number; tone: 'focus' | 'break' }) {
  const radius = 46;
  const turn = 2 * Math.PI * radius;
  const left = Math.max(0, Math.min(1, progress));
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--color-line)" strokeWidth="2.5" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke={tone === 'break' ? 'var(--color-break)' : 'var(--color-focus)'}
        strokeWidth="2.5"
        strokeDasharray={`${turn * left} ${turn}`}
        style={{ transition: 'stroke-dasharray 1s linear' }}
      />
    </svg>
  );
}

export function FocusScreen(props: FocusScreenProps) {
  const { book, session, now, reduced } = props;
  const cat = book.cat;
  const titleId = useId();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [feeding, setFeeding] = useState<TreatKind | null>(null);
  const [doneChoice, setDoneChoice] = useState(false);
  const feedLock = useRef(false);
  const tasks = tasksForDate(book, props.today);
  const openTasks = tasks.filter((task) => !task.completed);
  const doneTasks = tasks.filter((task) => task.completed);
  const doneVisible = doneChoice;
  const running = Boolean(session && !session.paused && !session.settled);
  const paused = Boolean(session && session.paused && !session.settled);
  const doneFocus = Boolean(session?.settled && session.phase === 'focus' && session.full);
  const early = Boolean(session?.settled && session.phase === 'focus' && !session.full);
  const doneBreak = Boolean(session?.settled && session.phase === 'break');
  const locked = running || paused;
  const phase: PhaseChoice = !session || session.phase === 'focus' ? 'focus' : session.plannedBreak;
  const tone = phase === 'focus' ? 'focus' : 'break';
  const focusMinutes = cat.pomodoroMinutes;
  const phaseMinutes = phase === 'focus' ? focusMinutes : phase === 'long' ? cat.longMinutes : cat.shortMinutes;
  const duration = session ? session.durationMs : phaseMinutes * 60_000;
  const left = session ? remainingMs(session, now) : duration;
  const progress = duration > 0 ? left / duration : 0;
  const linkedId = session?.taskId || book.focusId || '';
  const linked = book.tasks.find((task) => task.id === linkedId && !task.deleted) ?? null;
  const marks = cycleMarks(Math.min(4, cat.focusCycle), 4, Boolean(session?.phase === 'focus' && !session.settled));
  const todayMinutes = Math.floor(cat.focusMsToday / 60_000);
  const offer = treatOffer(focusWorkedMs(cat, session, now, props.today), treatDay(cat, props.today));

  const live = !session
    ? ''
    : running && session.phase === 'focus'
      ? 'Фокус начался'
      : running && session.phase === 'break'
        ? 'Перерыв начался'
        : paused
          ? 'Пауза'
          : doneFocus
            ? 'Подход завершён. Время отдохнуть'
            : doneBreak
              ? 'Перерыв закончился'
              : early
                ? 'Сессия завершена раньше. Время сохранено'
                : '';

  function begin() {
    props.onStartPhase(phase, book.focusId ?? '', phase === 'focus' ? focusMinutes : phaseMinutes);
  }

  function addTask() {
    const title = draft.trim();
    if (!title) return;
    props.onCreate(title);
    setDraft('');
    setAdding(false);
  }

  const clip: CatClip = !session
    ? 'think'
    : doneFocus
      ? 'stretch'
      : paused || early || session.phase === 'break'
        ? 'sleep'
        : 'blink';

  const primaryLabel = running ? 'Пауза' : paused ? 'Продолжить' : 'Начать';
  const secondary = locked
    ? { label: 'Завершить', run: props.onFinish }
    : session
      ? { label: 'Сброс', run: props.onReset }
      : null;

  async function feed(kind: TreatKind) {
    if (feedLock.current || feeding) return;
    feedLock.current = true;
    const won = await props.onFeed(kind);
    if (!won) {
      feedLock.current = false;
      return;
    }
    setFeeding(kind);
  }

  function onPrimary() {
    if (running) props.onPause();
    else if (paused) props.onResume();
    else if (doneFocus || doneBreak) props.onAgain();
    else begin();
  }

  return (
    <section className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
      <div className="mx-auto w-full max-w-[760px] px-4 py-4 sm:px-6">
        <p className="sr-only" aria-live="polite">{live}</p>
        <div className="flex items-center justify-between gap-3">
          <h2 className="border-b-2 text-sm leading-tight font-semibold" style={{ color: 'var(--color-focus)', borderColor: 'currentColor' }}>Фокус</h2>
          <button
            type="button"
            aria-pressed={cat.sound}
            aria-label={cat.sound ? 'Выключить звук' : 'Включить звук'}
            onClick={props.onToggleSound}
            className="grid h-11 w-11 shrink-0 place-items-center text-ink"
          >
            {cat.sound ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
          </button>
        </div>
        {cat.autoStart ? <p className="mt-2 text-sm font-semibold text-ink">Автозапуск включён</p> : null}
        <div className="mx-auto mt-3 grid w-full max-w-xl grid-cols-[minmax(0,1fr)_7.5rem] items-start gap-x-2 sm:grid-cols-[minmax(0,1fr)_13rem] sm:gap-x-4">
          <div className="@container relative mx-auto aspect-square w-full max-w-72">
            <Ring progress={progress} tone={tone} />
            <p aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-sans text-[26cqw] leading-none font-semibold tabular-nums text-ink">{formatClock(left)}</p>
          </div>
          <div className="relative mx-auto aspect-square w-full" aria-hidden={feeding ? undefined : true}>
            {feeding ? (
              <TreatSprite
                kind={feeding}
                reduced={reduced}
                onDone={() => {
                  feedLock.current = false;
                  setFeeding(null);
                }}
              />
            ) : (
              <div className="absolute inset-0 overflow-hidden">
                <CatSprite clip={clip} face={1} reduced={reduced} />
              </div>
            )}
          </div>
          <p className="mt-2 min-h-5 text-center text-sm text-ink">{offer.line}</p>
          <div className="mt-2 flex flex-col items-stretch gap-1">
            {offer.available.map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={Boolean(feeding)}
                onClick={() => void feed(kind)}
                className="treat-button"
              >
                {kind === 'whiskas' ? 'Угостить Whiskas' : 'Угостить Sheba'}
              </button>
            ))}
          </div>
        </div>
        <p className={`mt-3 text-center text-base break-words ${linked ? '' : 'text-muted'}`}>
          {!linked ? 'Без задачи' : linked.priority === 'high' && !linked.completed ? (
            <span className="task-title-important"><span aria-hidden="true">! </span>{linked.title}<span className="sr-only"> Важный.</span></span>
          ) : (
            <span className={linked.completed ? 'text-muted line-through' : linked.priority === 'low' ? 'text-low' : 'text-ink'}>
              {linked.priority === 'high' ? <span aria-hidden="true">! </span> : null}
              {linked.title}
              {linked.priority === 'low' ? <span className="sr-only"> Низкий приоритет.</span> : null}
            </span>
          )}
        </p>
        {linked && !linked.completed && session?.settled ? (
          <p className="text-center">
            <button type="button" onClick={props.onCompleteTask} className="paper-choice">Завершить задачу</button>
          </p>
        ) : null}
        {doneFocus ? <p className="mt-2 text-center text-sm text-ink">Подход завершён. Можно отдохнуть.</p> : null}
        {early ? <p className="mt-2 text-center text-sm text-muted">Время сохранено. Подход не засчитан.</p> : null}
        {props.remind && running ? (
          <p className="mt-2 text-center text-sm text-muted">
            Середина подхода
            <button type="button" onClick={props.onDismissRemind} className="paper-choice">Работаю</button>
          </p>
        ) : null}
        {props.notice ? (
          <p role="status" className="mt-2 text-center text-sm text-ink">
            {props.notice}
            <button type="button" onClick={props.onDismissNotice} className="paper-choice">Скрыть</button>
          </p>
        ) : null}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button type="button" onClick={onPrimary} className="paper-submit min-w-44">
            {primaryLabel}
          </button>
          {secondary ? <button type="button" onClick={secondary.run} className="paper-choice">{secondary.label}</button> : null}
        </div>
        {doneFocus ? (
          <p className="mt-2 text-center">
            <button type="button" onClick={props.onBreak} className="paper-choice">{session?.plannedBreak === 'long' ? 'Начать длинный перерыв' : 'Начать перерыв'}</button>
          </p>
        ) : null}
        {!locked ? (
          <div className="mt-3 flex flex-wrap justify-center" role="group" aria-label="Длительность фокуса">
            {FOCUS_PRESETS.map((preset) => (
              <button key={preset} type="button" aria-pressed={focusMinutes === preset} onClick={() => props.onMinutes(preset)} className="paper-choice">{preset} мин</button>
            ))}
          </div>
        ) : null}
        <p className="mt-4 text-center text-sm text-ink">{marks.label}</p>
        <div className="mt-1 flex justify-center gap-2" role="img" aria-label={`${marks.filled} из 4 подходов завершено`}>
          {Array.from({ length: 4 }, (_, index) => {
            const filled = index < marks.filled;
            return (
              <span
                key={index}
                className="h-2.5 w-2.5 rounded-full border"
                style={{ background: filled ? 'var(--color-ink)' : 'transparent', borderColor: 'var(--color-ink)' }}
              />
            );
          })}
        </div>
        <p className="mt-2 text-center text-sm text-muted">
          Сегодня {cat.focusCompleted} {countWord(cat.focusCompleted, 'подход', 'подхода', 'подходов')} · {minutesLabel(todayMinutes)}
        </p>
      </div>
      <aside className="px-4 pb-6 sm:px-6 lg:px-3 lg:py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">Задачи</p>
          <button type="button" aria-expanded={adding} onClick={() => setAdding((value) => !value)} className="min-h-11 px-2 text-sm font-semibold text-ink">+ Задача</button>
        </div>
        {adding ? (
          <form
            className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(event) => { event.preventDefault(); addTask(); }}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return;
              event.preventDefault();
              setDraft('');
              setAdding(false);
            }}
          >
            <input
              autoFocus
              aria-label="Новая задача"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center' })}
              maxLength={160}
              className="paper-field"
              id={titleId}
            />
            <button type="submit" className="paper-choice sm:shrink-0">Ок</button>
            <button type="button" onClick={() => { setDraft(''); setAdding(false); }} className="paper-choice sm:shrink-0">Отмена</button>
          </form>
        ) : null}
        <button
          type="button"
          aria-pressed={!linked}
          onClick={() => props.onSelectTask(null)}
          className="mt-2 min-h-11 w-full px-1 text-left text-sm font-semibold text-ink"
        >
          Без задачи
        </button>
        <div className="lg:max-h-[32rem] lg:overflow-y-auto">
          {openTasks.map((task) => (
            <FocusTaskRow key={task.id} task={task} selected={task.id === linked?.id} onToggle={props.onToggle} onSelect={props.onSelectTask} />
          ))}
          {doneTasks.length > 0 ? (
            <div className="mt-2">
              <button type="button" aria-expanded={doneVisible} onClick={() => setDoneChoice(!doneVisible)} className="min-h-11 px-1 text-sm font-semibold text-muted">
                Выполненные · {doneTasks.length}
              </button>
              {doneVisible ? doneTasks.map((task) => (
                <FocusTaskRow key={task.id} task={task} selected={task.id === linked?.id} onToggle={props.onToggle} onSelect={props.onSelectTask} />
              )) : null}
            </div>
          ) : null}
        </div>
      </aside>
    </section>
  );
}
