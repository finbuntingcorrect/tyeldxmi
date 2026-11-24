import { formatClock, type FocusSession } from '../lib/focusSession';

type FocusBarProps = {
  session: FocusSession;
  remaining: number;
  onOpen: () => void;
  onPause: () => void;
  onResume: () => void;
};

export function FocusBar({ session, remaining, onOpen, onPause, onResume }: FocusBarProps) {
  const running = !session.paused && !session.settled;
  const phase = session.phase === 'break' ? 'Перерыв' : 'Фокус';

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <section aria-label="Фокус" className="mx-auto flex max-w-3xl items-center justify-between gap-3 border border-line bg-card px-3 py-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">{phase}</p>
        </div>
        <p aria-hidden="true" className="font-sans text-2xl tabular-nums text-ink">{formatClock(remaining)}</p>
        <div className="flex shrink-0 items-center">
          {running ? <button type="button" onClick={onPause} className="paper-choice">Пауза</button> : null}
          {session.paused && !session.settled ? <button type="button" onClick={onResume} className="paper-choice">Продолжить</button> : null}
          <button type="button" onClick={onOpen} className="paper-submit">К фокусу</button>
        </div>
      </section>
    </div>
  );
}
