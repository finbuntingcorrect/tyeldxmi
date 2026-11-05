import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { MascotMode } from '../types';
import { SuccessAnimation } from './SuccessAnimation';
import { ThoughtBubble } from './ThoughtBubble';

const ART: Record<MascotMode, { src: string; label: string }> = {
  working: {
    src: '/mascot/cat-working.png',
    label: 'Котёнок в кепке работает за ноутбуком',
  },
  sleeping: {
    src: '/mascot/cat-sleeping.png',
    label: 'Котёнок спит на зелёной подушке',
  },
  success: {
    src: '/mascot/cat-success.png',
    label: 'Котёнок радуется выполненной задаче',
  },
};

const CAPTION: Record<MascotMode, string> = {
  working: 'Есть незакрытые дела',
  sleeping: 'Можно отдохнуть!',
  success: 'Задача выполнена!',
};

type MascotPanelProps = {
  mode: MascotMode;
  burstKey: number;
  total: number;
};

function detailLine(mode: MascotMode, total: number): string {
  if (mode === 'success') return 'Котёнок это уже отметил';
  if (mode === 'working') return 'Котёнок думает рядом';
  if (total === 0) return 'На сегодня тихо';
  return 'Все задачи на сегодня закрыты';
}

function SleepMarks() {
  const reduce = useReducedMotion();
  const letters = [
    { char: 'z', size: 'text-[11px]' },
    { char: 'z', size: 'text-[13px]' },
    { char: 'Z', size: 'text-[15px]' },
  ];

  return (
    <div className="flex items-end gap-1" aria-hidden="true">
      {letters.map((letter, index) => (
        <motion.span
          key={`${letter.char}-${index}`}
          className={`font-pixel leading-none text-ink/80 ${letter.size}`}
          animate={
            reduce
              ? { opacity: 0.8, y: 0 }
              : { y: [0, -4, 0], opacity: [0.45, 0.82, 0.5] }
          }
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 4.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.45 }
          }
        >
          {letter.char}
        </motion.span>
      ))}
    </div>
  );
}

function imageTransition(mode: MascotMode, reduce: boolean | null) {
  if (reduce) return { duration: 0 };
  if (mode === 'sleeping') return { duration: 0.8, ease: 'easeInOut' as const };
  if (mode === 'success') return { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };
  return { duration: 0.45, ease: 'easeOut' as const };
}

export function MascotPanel({ mode, burstKey, total }: MascotPanelProps) {
  const reduce = useReducedMotion();
  const art = ART[mode];

  return (
    <section
      aria-labelledby="mascot-caption"
      className="rounded-[28px] border border-line bg-card p-4 shadow-[0_16px_40px_rgba(46,33,27,0.06)] sm:p-5"
    >
      <div className="relative">
        <div className="rounded-[24px] bg-[#FDF1E3]">
          {reduce ? (
            <img
              src={art.src}
              alt={art.label}
              width={1254}
              height={1254}
              draggable={false}
              className="mascot-art block h-auto w-full"
            />
          ) : (
            <div className="relative">
              <img src={art.src} alt="" aria-hidden="true" className="invisible block h-auto w-full" />
              <AnimatePresence initial={false}>
                <motion.img
                  key={mode}
                  src={art.src}
                  alt={art.label}
                  width={1254}
                  height={1254}
                  draggable={false}
                  className="mascot-art absolute inset-0 h-full w-full object-contain"
                  initial={
                    reduce
                      ? false
                      : { opacity: 0, scale: mode === 'success' ? 0.965 : 1 }
                  }
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={imageTransition(mode, reduce)}
                />
              </AnimatePresence>
            </div>
          )}
        </div>

        {mode === 'working' ? (
          <div className="pointer-events-none absolute top-[1.5%] left-[2%] z-20">
            <ThoughtBubble />
          </div>
        ) : null}
        {mode === 'sleeping' ? (
          <div className="pointer-events-none absolute top-[8%] right-[9%] z-20">
            <SleepMarks />
          </div>
        ) : null}
        {mode === 'success' ? (
          <div className="pointer-events-none absolute top-[12%] right-[8%] z-20">
            <SuccessAnimation key={burstKey} />
          </div>
        ) : null}
      </div>

      <div id="mascot-caption" className="px-2 pb-1 pt-4 text-center" aria-live="polite">
        <p className="text-lg font-extrabold text-ink">{CAPTION[mode]}</p>
        <p className="mt-1 text-sm font-semibold text-muted">{detailLine(mode, total)}</p>
      </div>
    </section>
  );
}
