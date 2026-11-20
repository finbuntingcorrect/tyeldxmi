import { useEffect, useId, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
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
import { tasksForDate, type Notebook } from '../lib/notebook';

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
  const [menu, setMenu] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [groom, setGroom] = useState(false);
  const [hello, setHello] = useState(false);
  const [step, setStep] = useState(false);
  const [face, setFace] = useState<1 | -1>(1);
  const [feeding, setFeeding] = useState<TreatKind | null>(null);
  const seen = useRef<string | null>(null);
  const feedLock = useRef(false);
  const tasks = tasksForDate(book, props.today);
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
  const rounds = cat.rounds;
  const marks = cycleMarks(cat.focusCycle, rounds, Boolean(session?.phase === 'focus' && !session.full));
  const todayMinutes = Math.floor(cat.focusMsToday / 60_000);
  const offer = treatOffer(focusWorkedMs(cat, session, now, props.today), treatDay(cat, props.today));

  useEffect(() => {
    if (reduced || session) return;
    const id = window.setInterval(() => setGroom(true), 14_000);
    return () => window.clearInterval(id);
  }, [reduced, session]);

  useEffect(() => {
    if (!session || session.settled || session.paused || session.phase !== 'focus') return;
    if (seen.current === session.signalId) return;
    seen.current = session.signalId;
    const start = window.setTimeout(() => setHello(true), 0);
    const stop = window.setTimeout(() => setHello(false), 2000);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [session]);

  useEffect(() => {
    if (reduced || session?.phase !== 'break' || session.settled || session.paused) return;
    const id = window.setInterval(() => {
      setStep((value) => !value);
      setFace((value) => (value === 1 ? -1 : 1));
    }, 7000);
    return () => window.clearInterval(id);
  }, [reduced, session?.phase, session?.settled, session?.paused, session?.signalId]);

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

  const clip: CatClip = !session && groom && !reduced
    ? 'groom'
    : !session
      ? (tasks.some((task) => !task.completed) ? 'blink' : 'sleep')
      : hello && session.phase === 'focus'
        ? 'stretch'
        : doneFocus
          ? 'stretch'
          : paused || early
            ? 'sleep'
            : session.phase === 'break'
              ? (!reduced && step ? 'walk' : 'stretch')
              : running && session.phase === 'focus'
                ? 'think'
                : 'blink';

  const primaryLabel = running
    ? 'Пауза'
    : paused
      ? 'Продолжить'
      : doneFocus
        ? 'Начать перерыв'
      : doneBreak
        ? 'Начать следующий подход'
        : phase === 'focus'
          ? (cat.focusCycle > 0 ? 'Начать следующий подход' : 'Начать фокус')
          : 'Начать перерыв';

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
    else if (doneFocus) props.onBreak();
    else if (doneBreak) props.onAgain();
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
              <div
                className="absolute inset-0"
                style={reduced ? undefined : { transform: session?.phase === 'break' && step ? 'translateX(8px)' : 'translateX(0)', transition: 'transform 1.6s ease' }}
              >
                <CatSprite clip={clip} face={face} reduced={reduced} onFinished={() => setGroom(false)} />
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
        {doneFocus ? <p className="mt-3 text-center text-sm text-ink">Отличный подход. Время отдохнуть</p> : null}
        {early ? <p className="mt-3 text-center text-sm text-muted">Время сохранено</p> : null}
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
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onPrimary}
            className="paper-submit min-w-44"
            style={{ background: doneFocus || tone === 'break' && !doneBreak ? 'var(--color-break)' : 'var(--color-focus)', color: doneFocus || tone === 'break' && !doneBreak ? '#fffaf3' : 'var(--color-on-focus)' }}
          >
            {primaryLabel}
          </button>
          {locked ? <button type="button" onClick={props.onFinish} className="paper-choice">Завершить</button> : null}
          {doneFocus ? <button type="button" onClick={props.onSkipBreak} className="paper-choice">Пропустить перерыв</button> : null}
          {doneFocus && linked && !linked.completed ? <button type="button" onClick={props.onCompleteTask} className="paper-choice">Завершить задачу</button> : null}
          {doneBreak && linked && !linked.completed ? <button type="button" onClick={props.onCompleteTask} className="paper-choice">Завершить задачу</button> : null}
          <button type="button" aria-expanded={menu} onClick={() => { setMenu((value) => !value); setConfirmReset(false); }} className="paper-choice">Ещё</button>
        </div>
        {menu ? (
          <div className="mx-auto mt-2 max-w-sm text-center">
            {confirmReset ? (
              <div>
                <p className="text-sm text-ink">Сбросить таймер? Уже отработанное время останется.</p>
                <button type="button" onClick={() => { props.onReset(); setMenu(false); setConfirmReset(false); }} className="paper-choice">Сбросить</button>
                <button type="button" onClick={() => setConfirmReset(false)} className="paper-choice">Отмена</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmReset(true)} className="paper-choice">Сброс</button>
            )}
          </div>
        ) : null}
        {!locked && phase === 'focus' ? (
          <div className="mt-3 flex flex-wrap justify-center">
            {FOCUS_PRESETS.map((preset) => (
              <button key={preset} type="button" aria-pressed={focusMinutes === preset} onClick={() => props.onMinutes(preset)} className="paper-choice">{preset}</button>
            ))}
          </div>
        ) : null}
        <p className="mt-4 text-center text-sm text-ink">{marks.label}</p>
        <div className="mt-1 flex justify-center gap-2" aria-hidden="true">
          {Array.from({ length: rounds }, (_, index) => {
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
          <form className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(event) => { event.preventDefault(); addTask(); }}>
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
          {tasks.map((task) => (
            <div key={task.id} className={`flex items-start ${task.id === linked?.id ? 'bg-field' : ''}`}>
              <PaperCheck checked={task.completed} label={task.completed ? `Вернуть «${task.title}»` : `Выполнить «${task.title}»`} onClick={() => props.onToggle(task.id)} />
              <button type="button" onClick={() => props.onSelectTask(task.id)} className="min-h-11 min-w-0 flex-1 py-2 text-left">
                <span className={`block break-words text-base ${task.completed ? 'text-muted line-through' : 'text-ink'}`}>{task.title}</span>
              </button>
            </div>
          ))}
        </div>
      </aside>
    </section>
  );
}
