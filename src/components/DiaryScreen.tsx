import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { PageFlip } from 'page-flip';
import { addDays } from '../../server/recurrence';
import { dateFromKey } from '../lib/date';
import { tasksForDate, weekDates, type Notebook, type TaskDraft, type TaskMark } from '../lib/notebook';
import { isPageDate, weekMonday } from '../lib/route';
import { PlanTask } from './PlanTask';
import { PixelArrow } from './PixelArrow';
import { PixelIconButton } from './PixelIconButton';

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
  ensureWeek: (monday: string) => void;
  composeDay?: string | null;
  onDismissCompose?: () => void;
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

type Turn = { to: string; direction: 'next' | 'prev'; half: 'lift' | 'lay' };

function withoutPageDrag(run: () => void) {
  const proto = EventTarget.prototype;
  const original = proto.addEventListener;
  proto.addEventListener = function (this: EventTarget, ...args: Parameters<typeof original>) {
    const type = args[0];
    const block = this instanceof Element && this.classList.contains('stf__block') && (type === 'mousedown' || type === 'touchstart');
    const windowMouse = this === window && (type === 'mousemove' || type === 'mouseup' || type === 'touchmove' || type === 'touchend');
    if (!block && !windowMouse) original.apply(this, args);
  } as typeof original;
  try {
    run();
  } finally {
    proto.addEventListener = original;
  }
}

function bindPageEdges(host: HTMLElement, book: PageFlip, editing: { current: number }, onGrab: () => void) {
  let dragging = false;
  let startX = 0;
  let fromRight = false;
  function point(event: PointerEvent) {
    const rect = book.getUI().getDistElement().getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function onOuterEdge(event: PointerEvent) {
    if (!(event.target instanceof Element)) return false;
    if (event.target.closest('[data-flip-edge]')) return true;
    if (event.target.closest('button, a, input, textarea, select, label, [role="menu"], [data-stamp-control]')) return false;
    const pos = point(event);
    const bounds = book.getBoundsRect();
    const left = bounds.left;
    const right = bounds.left + bounds.width;
    return pos.x >= left && pos.x <= right && (pos.x - left <= 64 || right - pos.x <= 64);
  }
  function onDown(event: PointerEvent) {
    if (event.button !== 0 || editing.current > 0 || book.getState() !== 'read') return;
    if (!onOuterEdge(event)) return;
    const pos = point(event);
    const bounds = book.getBoundsRect();
    dragging = true;
    startX = pos.x;
    fromRight = pos.x > bounds.left + bounds.width / 2;
    onGrab();
    book.startUserTouch(pos);
    try {
      host.setPointerCapture(event.pointerId);
    } catch {
      // The drag still follows the pointer if capture is unavailable.
    }
    event.preventDefault();
  }
  function onMove(event: PointerEvent) {
    const pos = point(event);
    if (dragging) {
      book.userMove(pos, false);
      return;
    }
    const onEdge = event.target instanceof Element && Boolean(event.target.closest('[data-flip-edge]'));
    if (onEdge || book.getState() === 'fold_corner') book.userMove(pos, false);
  }
  function finish(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    const pos = point(event);
    const towardSpine = fromRight ? pos.x < startX - 72 : pos.x > startX + 72;
    if (towardSpine) {
      const bounds = book.getBoundsRect();
      const dest = fromRight
        ? { x: bounds.left + 12, y: pos.y }
        : { x: bounds.left + bounds.width - 12, y: pos.y };
      book.userMove(dest, false);
      book.userStop(dest);
      return;
    }
    book.userStop(pos);
  }
  function onLeave() {
    if (dragging || book.getState() !== 'fold_corner') return;
    const bounds = book.getBoundsRect();
    book.userMove({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }, false);
  }
  host.addEventListener('pointerdown', onDown);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerup', finish);
  host.addEventListener('pointercancel', finish);
  host.addEventListener('pointerleave', onLeave);
  return () => {
    host.removeEventListener('pointerdown', onDown);
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('pointerup', finish);
    host.removeEventListener('pointercancel', finish);
    host.removeEventListener('pointerleave', onLeave);
  };
}

export function DiaryScreen(props: DiaryScreenProps) {
  const target = weekMonday(props.week && isPageDate(props.week) ? props.week : props.today);
  const [shown, setShown] = useState(target);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [settle, setSettle] = useState(false);
  const [hold, setHold] = useState<number | null>(null);
  const [release, setRelease] = useState(false);
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 900px)').matches);
  const [editing, setEditing] = useState(0);
  const [fresh, setFresh] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const [seenCompose, setSeenCompose] = useState<string | null>(null);
  if (props.composeDay && props.composeDay !== seenCompose) {
    setSeenCompose(props.composeDay);
    setOpenDays((current) => current[props.composeDay!] ? current : { ...current, [props.composeDay!]: true });
  }
  const [importantDays, setImportantDays] = useState<Record<string, boolean>>({});
  const adding = useRef(new Set<string>());
  const ensureRef = useRef(props.ensureWeek);
  const spreadRef = useRef<HTMLDivElement>(null);
  const underlayRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<PageFlip | null>(null);
  const sheetsRef = useRef<HTMLDivElement[] | null>(null);
  const bookToken = useRef(0);
  const shownRef = useRef(shown);
  const editingRef = useRef(editing);
  const openWeekRef = useRef(props.onOpenWeek);
  const flipLock = useRef(false);
  const recenter = useRef(false);
  const turningLock = useRef(false);
  const wideRef = useRef(wide);
  const releaseTicket = useRef(0);
  const [sheets, setSheets] = useState<HTMLDivElement[] | null>(null);
  const [busyFlip, setBusyFlip] = useState(false);
  const pickerId = useId();
  const curl = wide && !props.reduced;
  const label = weekLabel(shown);

  useEffect(() => {
    ensureRef.current = props.ensureWeek;
    shownRef.current = shown;
    editingRef.current = editing;
    openWeekRef.current = props.onOpenWeek;
  });
  useEffect(() => {
    ensureRef.current(shown);
    ensureRef.current(addDays(shown, -7));
    ensureRef.current(addDays(shown, 7));
    if (turn) ensureRef.current(turn.to);
  }, [shown, turn]);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 900px)');
    function onChange() {
      wideRef.current = media.matches;
      setWide(media.matches);
    }
    wideRef.current = media.matches;
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  if (!curl && target !== shown && !turn) {
    if (props.reduced) setShown(target);
    else if (editing === 0) {
      setFresh(null);
      if (release) setRelease(false);
      setTurn({ to: target, direction: target > shown ? 'next' : 'prev', half: 'lift' });
    }
  }
  if (curl && editing === 0 && target !== shown && !busyFlip) {
    const adjacent = target === addDays(shown, 7) || target === addDays(shown, -7);
    if (!adjacent) {
      setShown(target);
      if (fresh) setFresh(null);
    } else {
      setBusyFlip(true);
      if (fresh) setFresh(null);
    }
  }

  function endTurn(destination: string, fadeIn: boolean) {
    turningLock.current = false;
    const node = spreadRef.current;
    let natural = 0;
    let locked = 0;
    if (node && wideRef.current && node.style.minHeight) {
      locked = Math.ceil(node.getBoundingClientRect().height);
      node.style.minHeight = '0px';
      natural = Math.ceil(node.getBoundingClientRect().height);
      node.style.minHeight = `${locked}px`;
    }
    const ticket = releaseTicket.current + 1;
    releaseTicket.current = ticket;
    const shrink = natural > 0 && locked - natural > 1;
    setShown(destination);
    setTurn(null);
    setRelease(shrink);
    setHold(shrink ? locked : null);
    if (fadeIn) setSettle(true);
    if (shrink) {
      window.requestAnimationFrame(() => {
        if (releaseTicket.current !== ticket) return;
        setHold(natural);
      });
      window.setTimeout(() => {
        if (releaseTicket.current !== ticket) return;
        setHold(null);
        setRelease(false);
      }, 320);
    }
  }

  function finishTurn(event: React.AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const name = event.animationName;
    if (name === 'diary-in') {
      setSettle(false);
      return;
    }
    if (!turn) return;
    if (name === 'diary-lift-next' || name === 'diary-lift-prev') {
      setShown(turn.to);
      setTurn({ ...turn, half: 'lay' });
      return;
    }
    if (name !== 'diary-lay-next' && name !== 'diary-lay-prev' && name !== 'diary-out') return;
    endTurn(turn.to, name === 'diary-out');
  }

  useEffect(() => {
    if (!turn) return;
    releaseTicket.current += 1;
    const destination = turn.to;
    const frame = window.requestAnimationFrame(() => {
      const live = spreadRef.current?.offsetHeight ?? 0;
      const next = underlayRef.current?.offsetHeight ?? 0;
      const needed = Math.ceil(Math.max(live, next));
      if (needed > 0) setHold((current) => needed > (current ?? 0) + 1 ? needed : current);
    });
    const timer = window.setTimeout(() => endTurn(destination, !wideRef.current), 900);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [turn]);

  useEffect(() => {
    if (!curl) return;
    const host = hostRef.current;
    if (!host) return;
    const block = document.createElement('div');
    block.className = 'diary-flip-root';
    host.appendChild(block);
    const pages = Array.from({ length: 6 }, (_, index) => {
      const page = document.createElement('div');
      page.className = 'diary-sheet';
      page.dataset.density = 'soft';
      page.dataset.side = index % 2 === 0 ? 'left' : 'right';
      if (index < 2 || index > 3) {
        page.setAttribute('aria-hidden', 'true');
        page.inert = true;
      }
      return page;
    });
    const book = new PageFlip(block, {
      width: 400,
      height: 560,
      size: 'fixed',
      usePortrait: false,
      showCover: false,
      drawShadow: true,
      maxShadowOpacity: 0.45,
      flippingTime: 1050,
      startPage: 2,
      autoSize: true,
      useMouseEvents: true,
      showPageCorners: true,
      disableFlipByClick: true,
      clickEventForward: true,
      mobileScrollSupport: true,
      swipeDistance: 1000,
      startZIndex: 2,
    });
    withoutPageDrag(() => book.loadFromHTML(pages));
    let ignoreFlip = true;
    book.on('flip', (event) => {
      const page = Number(event.data);
      if (ignoreFlip || page === 2) return;
      const base = shownRef.current;
      const next = page > 3 ? addDays(base, 7) : addDays(base, -7);
      recenter.current = true;
      openWeekRef.current(next);
      setShown(next);
      window.requestAnimationFrame(() => {
        flipLock.current = false;
        setBusyFlip(false);
      });
    });
    book.on('changeState', (event) => {
      if (event.data !== 'read' || recenter.current || ignoreFlip) return;
      flipLock.current = false;
      setBusyFlip(false);
    });
    const fit = () => {
      const dist = book.getUI().getDistElement();
      const width = Math.floor(dist.clientWidth / 2);
      const height = Math.floor(dist.clientHeight);
      if (width < 120 || height < 120) return;
      const settings = book.getSettings();
      const changed = Math.abs(settings.width - width) > 1 || Math.abs(settings.height - height) > 1;
      settings.width = width;
      settings.height = height;
      settings.minWidth = width;
      settings.maxWidth = width;
      settings.minHeight = height;
      settings.maxHeight = height;
      const wrapper = block.querySelector('.stf__wrapper');
      if (wrapper instanceof HTMLElement) {
        wrapper.style.height = '100%';
        wrapper.style.paddingBottom = '0px';
      }
      if (changed) book.update();
      if (wrapper instanceof HTMLElement) {
        wrapper.style.height = '100%';
        wrapper.style.paddingBottom = '0px';
      }
    };
    fit();
    ignoreFlip = false;
    bookRef.current = book;
    const unbind = bindPageEdges(host, book, editingRef, () => setBusyFlip(true));
    const observer = new ResizeObserver(() => {
      if (book.getState() !== 'read') return;
      fit();
    });
    observer.observe(host);
    const token = bookToken.current + 1;
    bookToken.current = token;
    sheetsRef.current = pages;
    queueMicrotask(() => {
      if (bookToken.current !== token) return;
      setSheets(pages);
    });
    return () => {
      bookToken.current += 1;
      observer.disconnect();
      unbind();
      book.off('flip');
      book.off('changeState');
      bookRef.current = null;
      sheetsRef.current = null;
      flipLock.current = false;
      recenter.current = false;
      book.destroy();
      setSheets(null);
    };
  }, [curl]);

  useEffect(() => {
    if (!curl || !sheets || !busyFlip || target === shown || flipLock.current) return;
    const book = bookRef.current;
    if (!book || book.getState() !== 'read') return;
    const forward = target === addDays(shown, 7);
    const backward = target === addDays(shown, -7);
    if (!forward && !backward) return;
    flipLock.current = true;
    if (forward) book.flipNext('bottom');
    else book.flipPrev('bottom');
    if (book.getState() === 'read') {
      flipLock.current = false;
      window.requestAnimationFrame(() => setBusyFlip(false));
    }
  }, [curl, sheets, busyFlip, target, shown]);

  useLayoutEffect(() => {
    if (!recenter.current) return;
    bookRef.current?.turnToPage(2);
    recenter.current = false;
  }, [shown, sheets]);

  function goWeek(monday: string) {
    if (editing > 0 || turn || busyFlip || turningLock.current || flipLock.current) return;
    if (bookRef.current && bookRef.current.getState() !== 'read') return;
    const next = weekMonday(monday);
    if (next === shown) {
      setPicking(false);
      return;
    }
    if (!props.reduced && !curl) turningLock.current = true;
    props.ensureWeek(next);
    setPicking(false);
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
    if (props.composeDay === date) props.onDismissCompose?.();
  }

  function renderDay(date: string, index: number, quiet: boolean) {
    const open = openDays[date] === true;
    const important = importantDays[date] === true;
    return (
      <section
        key={date}
        className={`diary-day band-${BANDS[index]} ${date === props.today ? 'is-today' : ''} ${date === props.highlight ? 'is-selected' : ''}`}
        aria-labelledby={quiet ? undefined : `day-${date}`}
      >
        <header className="diary-day-head">
          <h3 id={quiet ? undefined : `day-${date}`}>{DAY_NAMES[index]}, {dayLabel(date)}</h3>
          {date === props.today ? <span className="diary-today">Сегодня</span> : null}
        </header>
        <div className="diary-lines">
          {tasksForDate(props.book, date).map((task) => (
            <PlanTask
              key={task.id}
              diary
              stampFresh={!quiet && fresh === task.id}
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
              onMark={quiet ? () => undefined : (id, mark) => { void choose(id, mark); }}
              onEditing={quiet ? undefined : (value) => setEditing((count) => value ? count + 1 : Math.max(0, count - 1))}
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
                id={quiet ? undefined : `add-${date}`}
                autoFocus={!quiet}
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
            <PixelIconButton kind="add" label="Добавить задачу" className="diary-plus" onClick={() => { adding.current.delete(date); setOpenDays((current) => ({ ...current, [date]: true })); }} />
          )}
        </div>
      </section>
    );
  }

  function renderPage(side: 'left' | 'right', monday: string, quiet: boolean) {
    const days = weekDates(monday);
    if (side === 'left') {
      return (
        <div className="diary-page diary-page-left">
          {renderDay(days[0], 0, quiet)}
          {renderDay(days[1], 1, quiet)}
          {renderDay(days[2], 2, quiet)}
        </div>
      );
    }
    return (
      <div className="diary-page diary-page-right">
        {renderDay(days[3], 3, quiet)}
        {renderDay(days[4], 4, quiet)}
        <div className="diary-weekend">
          {renderDay(days[5], 5, quiet)}
          {renderDay(days[6], 6, quiet)}
        </div>
      </div>
    );
  }

  function renderWeek(monday: string, quiet: boolean) {
    return (
      <>
        {renderPage('left', monday, quiet)}
        {renderPage('right', monday, quiet)}
      </>
    );
  }

  const busy = turn !== null || busyFlip;
  const weeks = [addDays(shown, -7), shown, addDays(shown, 7)];

  return (
    <section className="diary" aria-busy={busy}>
      <div className="diary-nav">
        <PixelArrow direction="previous" label="Предыдущая неделя" disabled={editing > 0 || busy} onClick={() => goWeek(addDays(shown, -7))} />
        <div className="diary-range">
          <button type="button" className="diary-range-button" aria-expanded={picking} aria-controls={pickerId} disabled={busy} onClick={() => setPicking((value) => !value)}>
            {label}
          </button>
          <p className="sr-only" aria-live="polite">{busy ? '' : `Неделя ${label}`}</p>
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
                  if (!isPageDate(value) || busy || turningLock.current) return;
                  props.ensureWeek(weekMonday(value));
                  setPicking(false);
                  props.onOpenDay(value);
                }}
              />
            </div>
          ) : null}
        </div>
        <PixelArrow direction="next" label="Следующая неделя" disabled={editing > 0 || busy} onClick={() => goWeek(addDays(shown, 7))} />
        <button type="button" className="diary-today-button" disabled={editing > 0 || busy} onClick={() => goWeek(props.today)}><span>Эта неделя</span></button>
      </div>
      <div className={`diary-stage ${curl ? 'is-book' : ''}`}>
      {curl ? <div ref={hostRef} className={`diary-book ${busyFlip ? 'is-turning' : ''}`} /> : (
      <div
        ref={spreadRef}
        className={`diary-spread ${turn ? `is-turning turn-${turn.direction}` : ''} ${settle ? 'is-settling' : ''} ${release ? 'is-releasing' : ''}`}
        style={hold ? { minHeight: hold } : undefined}
      >
        <div className="diary-live" onAnimationEnd={wide ? undefined : finishTurn}>
          {renderWeek(shown, false)}
        </div>
        {turn && wide ? (
          <div ref={underlayRef} className="diary-underlay" aria-hidden="true" inert>
            {turn.direction === 'next' ? renderPage('right', turn.to, true) : renderPage('left', turn.to, true)}
          </div>
        ) : null}
        {turn && wide ? (
          <div key={turn.half} className={`diary-leaf is-${turn.direction} is-${turn.half}`} aria-hidden="true" inert onAnimationEnd={finishTurn}>
            <div className="diary-leaf-sheet">
              {turn.half === 'lift'
                ? turn.direction === 'next' ? renderPage('right', shown, true) : renderPage('left', shown, true)
                : turn.direction === 'next' ? renderPage('left', turn.to, true) : renderPage('right', turn.to, true)}
              <div className="diary-fold" />
            </div>
          </div>
        ) : null}
        {turn && wide ? <div className="diary-cast" /> : null}
      </div>
      )}
      </div>
      {curl && sheets ? weeks.flatMap((monday, slot) => (['left', 'right'] as const).map((side, sideIndex) => {
        const quiet = slot !== 1;
        const page = sheets[slot * 2 + sideIndex];
        return createPortal(
          <>
            <div className="diary-sheet-scroll" inert={quiet ? true : undefined} aria-hidden={quiet ? true : undefined}>
              {renderPage(side, monday, quiet)}
            </div>
            <div className="diary-edge" data-flip-edge="" />
          </>,
          page,
          `${monday}-${side}`,
        );
      })) : null}
    </section>
  );
}
