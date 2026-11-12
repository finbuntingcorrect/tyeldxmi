import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { clampCatPosition, type CatPose } from '../lib/focusSession';
import { CatSprite, type CatClip } from './CatSprite';

type Point = { x: number; y: number };

type CatCompanionProps = {
  pose: CatPose;
  hidden: boolean;
  pinned: boolean;
  walks: boolean;
  sound: boolean;
  reduced: boolean;
  position: { x: number | null; y: number | null };
  remind: boolean;
  greeting: boolean;
  onMove: (point: Point) => void;
  onToggleSound: () => void;
  onToggleWalks: () => void;
  onTogglePin: () => void;
  onHide: () => void;
  onWorking: () => void;
  onPause: () => void;
};

type Frame = { width: number; height: number; size: number; top: number; lane: number; minX: number; tight: boolean };

function readViewport() {
  const viewport = window.visualViewport;
  return {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
}

function frameFor(width: number, height: number, bottom: number): Frame {
  const tight = width < 700 || height < 520;
  const top = 76;
  const available = Math.max(48, height - top - bottom - 12);
  const widthRoom = Math.max(48, width - (tight ? 232 : 336) - 20);
  const target = tight ? 95 : 176;
  const size = Math.min(target, available, widthRoom);
  const lane = size + (tight ? 12 : 16);
  return { width, height, size, top, lane, minX: Math.max(8, width - lane + 4), tight };
}

export function CatCompanion(props: CatCompanionProps) {
  const [viewport, setViewport] = useState(() => (typeof window === 'undefined' ? { width: 1280, height: 800 } : readViewport()));
  const [dragPoint, setDragPoint] = useState<Point | null>(null);
  const [menu, setMenu] = useState(false);
  const [occupiedBottom, setOccupiedBottom] = useState(24);
  const [face, setFace] = useState<1 | -1>(1);
  const [traveling, setTraveling] = useState(false);
  const [grooming, setGrooming] = useState(false);
  const [gliding, setGliding] = useState(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const dragPointRef = useRef<Point | null>(null);
  const suppressClick = useRef(false);
  const moveRef = useRef(props.onMove);
  const placedX = useRef<number | null>(null);
  const bottom = Math.max(24, occupiedBottom);
  const frame = frameFor(viewport.width, viewport.height, bottom);
  const resting = clampCatPosition(
    props.position.x ?? frame.minX,
    props.position.y ?? frame.height - frame.size - bottom - 12,
    frame.width,
    frame.height,
    frame.size,
    frame.top,
    bottom,
    frame.minX,
  );
  const point = dragPoint ?? resting;

  useEffect(() => {
    moveRef.current = props.onMove;
  });

  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--cat-lane', props.hidden ? '0px' : `${frame.lane}px`);
    return () => {
      document.documentElement.style.removeProperty('--cat-lane');
    };
  }, [frame.lane, props.hidden]);

  useEffect(() => {
    const previous = placedX.current;
    placedX.current = point.x;
    if (previous == null || dragPoint) return;
    const delta = point.x - previous;
    if (Math.abs(delta) < 2) return;
    const nextFace: 1 | -1 = delta < 0 ? -1 : 1;
    const start = window.setTimeout(() => {
      setFace(nextFace);
      if (!props.reduced) setTraveling(true);
    }, 0);
    const stop = window.setTimeout(() => setTraveling(false), 1800);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [point.x, dragPoint, props.reduced]);

  useEffect(() => {
    if (props.reduced || props.pose !== 'idle' || traveling) return;
    const id = window.setInterval(() => {
      if (Math.random() < 0.35) setGrooming(true);
    }, 18000);
    return () => window.clearInterval(id);
  }, [props.pose, props.reduced, traveling]);

  useEffect(() => {
    const measure = () => {
      const bar = document.querySelector('section[aria-label="Сессия фокуса"]');
      const next = bar ? Math.ceil(bar.getBoundingClientRect().height) + 16 : 24;
      setOccupiedBottom((current) => (current === next ? current : next));
    };
    const frameId = window.requestAnimationFrame(measure);
    const timer = window.setInterval(measure, 1000);
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearInterval(timer);
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    const update = () => {
      const nextFrame = frameFor(readViewport().width, readViewport().height, bottom);
      setViewport((current) => (current.width === nextFrame.width && current.height === nextFrame.height ? current : { width: nextFrame.width, height: nextFrame.height }));
      if (props.position.x == null || props.position.y == null || drag.current) return;
      const next = clampCatPosition(props.position.x, props.position.y, nextFrame.width, nextFrame.height, nextFrame.size, nextFrame.top, bottom, nextFrame.minX);
      if (next.x !== props.position.x || next.y !== props.position.y) moveRef.current(next);
    };
    const id = window.requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, [props.position.x, props.position.y, bottom]);

  useEffect(() => {
    if (props.hidden || props.pinned || !props.walks || props.reduced || frame.tight || menu) return;
    if (props.pose !== 'idle' && props.pose !== 'sleep') return;
    const id = window.setInterval(() => {
      if (Math.random() > 0.35 || drag.current) return;
      setGliding(true);
      const spot = clampCatPosition(
        frame.minX + Math.random() * Math.max(1, frame.width - frame.size - 8 - frame.minX),
        frame.top + Math.random() * Math.max(1, frame.height - frame.size - bottom - frame.top),
        frame.width,
        frame.height,
        frame.size,
        frame.top,
        bottom,
        frame.minX,
      );
      window.requestAnimationFrame(() => moveRef.current(spot));
      window.setTimeout(() => setGliding(false), 1800);
    }, 32000);
    return () => window.clearInterval(id);
  }, [props.hidden, props.pinned, props.walks, props.reduced, props.pose, frame, bottom, menu]);

  useEffect(() => {
    if (!menu) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenu(false);
    }
    function onPointer(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && !(target as HTMLElement).closest?.('[data-cat-root]')) setMenu(false);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [menu]);

  if (props.hidden) return null;

  const clip = chooseClip(props.pose, props.greeting, traveling, grooming, frame.tight, props.reduced);
  const side = point.x > frame.width / 2;
  const lineAbove = point.y > 150;

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, left: point?.x ?? 0, top: point?.y ?? 0, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const origin = drag.current;
    if (!origin) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (Math.hypot(dx, dy) > 6) origin.moved = true;
    const next = clampCatPosition(origin.left + dx, origin.top + dy, frame.width, frame.height, frame.size, frame.top, bottom, frame.minX);
    dragPointRef.current = next;
    setDragPoint(next);
  }

  function onPointerUp() {
    const origin = drag.current;
    const latest = dragPointRef.current;
    drag.current = null;
    dragPointRef.current = null;
    setDragPoint(null);
    if (origin?.moved && latest) {
      suppressClick.current = true;
      props.onMove(latest);
    }
  }

  function onCatClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setMenu((open) => !open);
  }

  return (
    <div data-cat-root className={`fixed z-40 ${props.greeting && !props.reduced && !frame.tight ? 'cat-arrive' : ''}`} style={{ left: point.x, top: point.y, width: frame.size, height: frame.size, pointerEvents: 'none', transition: props.reduced || dragPoint || !gliding ? undefined : 'left 1.8s ease, top 1.8s ease' }}>
      <CatSprite clip={clip} face={face} reduced={props.reduced} blinkPause={props.pose === 'focus' ? 8000 : 3600} onFinished={() => setGrooming(false)} />
      <button
        type="button"
        aria-label="Котёнок, открыть меню"
        aria-expanded={menu}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onCatClick}
        className="absolute"
        style={{ pointerEvents: 'auto', left: '22%', top: '30%', width: '56%', height: '52%', touchAction: 'none', background: 'transparent' }}
      />
      {props.greeting && props.pose === 'greet' ? (
        <p className={`pointer-events-none absolute w-max max-w-40 border border-line bg-card px-3 py-2 text-sm text-ink ${lineAbove ? 'bottom-full mb-2' : 'top-full mt-2'} ${side ? 'right-0' : 'left-0'}`}>Привет!</p>
      ) : null}
      {props.remind ? (
        <div className={`absolute w-52 border border-line bg-card p-3 text-sm text-ink ${lineAbove ? 'bottom-full mb-2' : 'top-full mt-2'} ${side ? 'right-0' : 'left-0'}`} style={{ pointerEvents: 'auto' }}>
          <p>Как идёт задача?</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={props.onWorking} className="paper-choice px-2">Работаю</button>
            <button type="button" onClick={props.onPause} className="paper-submit">Пауза</button>
          </div>
        </div>
      ) : null}
      {menu ? (
        <div role="menu" className={`absolute z-10 w-52 border border-line bg-card p-1 ${lineAbove ? 'bottom-full mb-2' : 'top-full mt-2'} ${side ? 'right-0' : 'left-0'}`} style={{ pointerEvents: 'auto' }}>
          <button type="button" role="menuitem" onClick={props.onToggleSound} className="paper-choice w-full text-left">{props.sound ? 'Выключить звук' : 'Включить звук'}</button>
          <button type="button" role="menuitem" onClick={props.onToggleWalks} className="paper-choice w-full text-left">{props.walks ? 'Остановить прогулки' : 'Разрешить прогулки'}</button>
          <button type="button" role="menuitem" onClick={props.onTogglePin} className="paper-choice w-full text-left">{props.pinned ? 'Открепить' : 'Закрепить'}</button>
          <button type="button" role="menuitem" onClick={props.onHide} className="paper-choice w-full text-left">Скрыть котёнка</button>
        </div>
      ) : null}
    </div>
  );
}

function chooseClip(pose: CatPose, greeting: boolean, traveling: boolean, grooming: boolean, tight: boolean, reduced: boolean): CatClip {
  if (!reduced && !tight && (greeting || traveling) && (pose === 'greet' || pose === 'idle' || pose === 'sleep')) return 'walk';
  if (pose === 'sleep' || pose === 'pause') return 'sleep';
  if (pose === 'break' || pose === 'success') return 'stretch';
  if (pose === 'remind' || (!reduced && grooming && pose === 'idle')) return 'groom';
  return 'blink';
}
