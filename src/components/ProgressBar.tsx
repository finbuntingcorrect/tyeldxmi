import { motion, useReducedMotion } from 'motion/react';

type ProgressBarProps = {
  completed: number;
  total: number;
};

export function ProgressBar({ completed, total }: ProgressBarProps) {
  const reduce = useReducedMotion();
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const label = total === 0 ? 'Пока нет задач' : `${completed} из ${total} выполнено`;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-extrabold text-ink">Прогресс</span>
        <span className="font-semibold text-muted">{label}</span>
      </div>
      {total > 0 ? (
        <div
          className="h-3 overflow-hidden rounded-full bg-[#F0E4D4]"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={completed}
          aria-valuetext={`${label}, ${percent}%`}
          aria-label="Прогресс задач на сегодня"
        >
          <motion.div
            className="h-full rounded-full bg-success"
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={reduce ? { duration: 0 } : { type: 'spring', bounce: 0.18, duration: 0.55 }}
          />
        </div>
      ) : (
        <div className="h-3 rounded-full bg-[#F0E4D4]" aria-hidden="true" />
      )}
    </div>
  );
}
