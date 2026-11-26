import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CatSprite, type CatClip } from './CatSprite';
import { PixelIconButton } from './PixelIconButton';
import { feedingSources, warmImages } from '../lib/uiKit';
import { TreatSprite } from './TreatSprite';
import {
  clampDialDrag,
  clampDialMinutes,
  dialMinutesFromAngle,
  focusTodayLine,
  formatClock,
  minutesLabel,
  remainingMs,
  treatForMinutes,
  unappliedFocusMs,
  type FocusSession,
  type PhaseChoice,
  type TreatKind,
} from '../lib/focusSession';
import type { Notebook } from '../lib/notebook';

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

function angleAt(event: ReactPointerEvent, node: HTMLElement) {
  const rect = node.getBoundingClientRect();
  const x = event.clientX - (rect.left + rect.width / 2);
  const y = event.clientY - (rect.top + rect.height / 2);
  const angle = Math.atan2(x, -y);
  return angle < 0 ? angle + Math.PI * 2 : angle;
}

export function FocusScreen(props: FocusScreenProps) {
  const { book, session, now, reduced } = props;
  const cat = book.cat;
  const dialRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; last: number } | null>(null);
  const rewardSeen = useRef(session?.rewarded ? session.signalId : '');
  const cleared = useRef(false);
  const feedRef = useRef(props.onFeed);
  const [chosen, setChosen] = useState(() => clampDialMinutes(cat.pomodoroMinutes));
  const chosenRef = useRef(chosen);
  const [editing, setEditing] = useState(false);
  const [entry, setEntry] = useState('');
  const [feeding, setFeeding] = useState<TreatKind | null>(null);
  const [frameNow, setFrameNow] = useState(now);
  const active = Boolean(session && !session.settled);
  const running = Boolean(active && session && !session.paused);
  const paused = Boolean(active && session?.paused);
  const finished = Boolean(session?.settled && session.phase === 'focus' && session.full);
  const adjustable = !active;
  const displayNow = running && !reduced ? frameNow : now;
  const left = active && session ? remainingMs(session, displayNow) : finished ? 0 : chosen * 60_000;
  const phaseMs = session?.phase === 'break' ? 5 * 60_000 : Math.max(60_000, (session?.focusMinutes || chosen) * 60_000);
  const progress = active && session ? Math.max(0, Math.min(1, remainingMs(session, displayNow) / phaseMs)) : finished ? 0 : chosen / 60;
  const primary = running ? 'Пауза' : paused ? 'Продолжить' : finished ? 'Начать снова' : 'Начать';
  const status = paused ? 'На паузе' : running && session?.phase === 'break' ? 'Перерыв' : '';
  const bankedToday = cat.focusDate === props.today ? cat.focusMsToday : 0;
  const todayLine = focusTodayLine(bankedToday + (session ? unappliedFocusMs(session, displayNow) : 0));

  useEffect(() => {
    warmImages(feedingSources());
  }, []);

  useEffect(() => {
    feedRef.current = props.onFeed;
  });

  useEffect(() => {
    cleared.current = false;
  }, [session?.signalId]);

  useEffect(() => {
    if (drag.current) return;
    const next = clampDialMinutes(cat.pomodoroMinutes);
    chosenRef.current = next;
    setChosen(next);
  }, [cat.pomodoroMinutes]);

  useEffect(() => {
    if (!running || reduced) return;
    let frame = 0;
    const loop = () => {
      setFrameNow(Date.now());
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [reduced, running]);

  useEffect(() => {
    if (!session?.rewarded || session.phase !== 'focus' || !session.full) return;
    if (rewardSeen.current === session.signalId) return;
    rewardSeen.current = session.signalId;
    const kind = treatForMinutes(session.focusMinutes);
    setFeeding(kind);
    void feedRef.current(kind);
  }, [session]);

  function remember(minutes: number, persist: boolean) {
    const next = clampDialMinutes(minutes);
    chosenRef.current = next;
    setChosen(next);
    if (session?.settled && !cleared.current) {
      cleared.current = true;
      props.onReset();
    }
    if (persist) props.onMinutes(next);
  }

  function readMinutes(event: ReactPointerEvent) {
    const node = dialRef.current;
    if (!node) return chosenRef.current;
    return dialMinutesFromAngle(angleAt(event, node));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!adjustable) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* A pointer that is already gone still updates the value below. */
    }
    const next = readMinutes(event);
    drag.current = { id: event.pointerId, last: next };
    remember(next, false);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || event.pointerId !== current.id) return;
    const next = clampDialDrag(current.last, readMinutes(event));
    current.last = next;
    remember(next, false);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current || event.pointerId !== drag.current.id) return;
    drag.current = null;
    props.onMinutes(chosenRef.current);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!adjustable) return;
    const key = event.key;
    if (key === 'ArrowRight' || key === 'ArrowUp') {
      event.preventDefault();
      remember(Math.min(60, chosenRef.current + 1), true);
    } else if (key === 'ArrowLeft' || key === 'ArrowDown') {
      event.preventDefault();
      remember(Math.max(1, chosenRef.current - 1), true);
    } else if (key === 'Home') {
      event.preventDefault();
      remember(1, true);
    } else if (key === 'End') {
      event.preventDefault();
      remember(60, true);
    }
  }

  function commitEntry() {
    const value = Number(entry.trim());
    setEditing(false);
    if (!Number.isInteger(value) || value < 1 || value > 60) return;
    remember(value, true);
  }

  function onPrimary() {
    if (running) props.onPause();
    else if (paused) props.onResume();
    else if (finished) props.onAgain();
    else {
      props.onMinutes(chosenRef.current);
      props.onStartPhase('focus', '', chosenRef.current);
    }
  }

  const radius = 34;
  const turn = 2 * Math.PI * radius;
  const shown = progress <= 0 ? 0 : Math.min(progress, 0.985);
  const knobTurn = (adjustable && !finished ? chosen / 60 : 0) * Math.PI * 2 - Math.PI / 2;
  const knobX = 50 + radius * Math.cos(knobTurn);
  const knobY = 50 + radius * Math.sin(knobTurn);
  const clip: CatClip = running ? 'blink' : paused ? 'sleep' : 'think';

  return (
    <section className="focus-stage">
      <div className="focus-dial-wrap">
        <PixelIconButton
          kind={cat.sound ? 'sound-on' : 'sound-off'}
          label={cat.sound ? 'Выключить звук' : 'Включить звук'}
          aria-pressed={cat.sound}
          onClick={props.onToggleSound}
          className="focus-sound"
        />
        <div
          ref={dialRef}
          className="focus-dial"
          role="slider"
          aria-label="Длительность фокуса"
          aria-valuemin={1}
          aria-valuemax={60}
          aria-valuenow={adjustable ? chosen : Math.max(1, Math.round(left / 60_000))}
          aria-valuetext={adjustable ? minutesLabel(chosen) : formatClock(left)}
          aria-disabled={adjustable ? undefined : true}
          tabIndex={adjustable ? 0 : -1}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <svg viewBox="0 0 100 100" className="focus-ring" aria-hidden="true">
            <circle cx="50" cy="50" r={radius} className="focus-track" />
            {Array.from({ length: 60 }, (_, index) => {
              const turnAngle = (index / 60) * Math.PI * 2 - Math.PI / 2;
              const major = index % 5 === 0;
              const inner = major ? 29 : 31.5;
              const outer = 33.2;
              return (
                <line
                  key={index}
                  x1={50 + inner * Math.cos(turnAngle)}
                  y1={50 + inner * Math.sin(turnAngle)}
                  x2={50 + outer * Math.cos(turnAngle)}
                  y2={50 + outer * Math.sin(turnAngle)}
                  className={major ? 'focus-tick is-major' : 'focus-tick'}
                />
              );
            })}
            {shown > 0 ? (
              <circle
                cx="50"
                cy="50"
                r={radius}
                className="focus-arc"
                transform="rotate(-90 50 50)"
                strokeDasharray={`${turn * shown} ${turn}`}
              />
            ) : null}
          </svg>
          {adjustable && !finished ? (
            <span
              className="focus-knob"
              style={{ left: `calc(22px + (100% - 44px) * ${knobX / 100})`, top: `calc(22px + (100% - 44px) * ${knobY / 100})` }}
            />
          ) : null}
        </div>
        <div className={status ? 'focus-face has-status' : 'focus-face'}>
          {editing ? (
            <input
              className="focus-entry"
              inputMode="numeric"
              autoFocus
              aria-label="Минуты"
              value={entry}
              onChange={(event) => setEntry(event.target.value)}
              onBlur={commitEntry}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitEntry();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  setEditing(false);
                }
              }}
            />
          ) : adjustable ? (
            <button
              type="button"
              className="focus-readout"
              onClick={() => { setEntry(String(chosen)); setEditing(true); }}
            >
              {finished ? '00:00' : formatClock(chosen * 60_000)}
            </button>
          ) : (
            <p className="focus-readout" aria-hidden="true">{formatClock(left)}</p>
          )}
          {status ? <p className="focus-status">{status}</p> : null}
        </div>
      </div>
      <div className="focus-controls">
        <PixelIconButton kind={running ? 'pause' : 'play'} label={primary} className="focus-go" onClick={onPrimary} />
        {active ? <button type="button" className="focus-reset" onClick={props.onReset}>Сбросить</button> : null}
        {finished ? <button type="button" className="focus-break" onClick={props.onBreak}>Перерыв 5 минут</button> : null}
        <p className="focus-today">{todayLine}</p>
        {props.notice ? <p role="status" className="focus-note">{props.notice}</p> : null}
      </div>
      <div className="focus-cat">
        {feeding ? (
          <TreatSprite kind={feeding} reduced={reduced} onDone={() => setFeeding(null)} />
        ) : (
          <CatSprite clip={clip} face={1} reduced={reduced} />
        )}
      </div>
    </section>
  );
}
