import { formatClock, minutesLabel, type FocusSession } from '../lib/focusSession';

type FocusBarProps = {
  session: FocusSession;
  title: string;
  remaining: number;
  minutes: number;
  notice: string | null;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onBreak: () => void;
  onAgain: () => void;
  onComplete: () => void;
  onClose: () => void;
  onDismissNotice: () => void;
};

export function FocusBar(props: FocusBarProps) {
  const { session } = props;
  const running = !session.paused && !session.settled;
  const endedFocus = session.settled && session.phase === 'focus';
  const endedBreak = session.settled && session.phase === 'break';
  const state = session.phase === 'break'
    ? (session.settled ? 'Перерыв закончился' : session.paused ? 'Перерыв на паузе' : 'Перерыв')
    : (session.settled ? 'Фокус закончился' : session.paused ? 'Пауза' : 'Фокус');

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-3">
      <section aria-label="Сессия фокуса" className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-3 border border-line bg-card px-4 py-3 shadow-[0_8px_24px_rgba(90,58,36,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{props.title}</p>
          <p className="mt-1 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{state}</p>
          {running || session.paused ? <p className="mt-1 font-sans text-3xl tabular-nums text-ink">{formatClock(props.remaining)}</p> : null}
          {props.notice ? (
            <p role="status" className="mt-2 text-sm text-ink">
              {props.notice}{' '}
              <button type="button" onClick={props.onDismissNotice} className="paper-choice px-1">Скрыть</button>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {running ? <button type="button" onClick={props.onPause} className="paper-submit">Пауза</button> : null}
          {session.paused && !session.settled ? <button type="button" onClick={props.onResume} className="paper-submit">Продолжить</button> : null}
          {!session.settled ? <button type="button" onClick={props.onFinish} className="paper-choice">Завершить сессию</button> : null}
          {endedFocus ? <button type="button" onClick={props.onBreak} className="paper-submit">Перерыв 5 минут</button> : null}
          {endedFocus || endedBreak ? <button type="button" onClick={props.onAgain} className="paper-choice">Ещё {minutesLabel(props.minutes)}</button> : null}
          {endedFocus || endedBreak ? <button type="button" onClick={props.onComplete} className="paper-choice">Завершить задачу</button> : null}
          {endedBreak ? <button type="button" onClick={props.onClose} className="paper-choice">Закрыть</button> : null}
        </div>
      </section>
    </div>
  );
}
