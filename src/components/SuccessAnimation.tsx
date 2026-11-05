import { motion, useReducedMotion } from 'motion/react';

const SPARKS = [
  { x: -22, y: -14, delay: 0.05, color: '#E6A04B' },
  { x: 24, y: -16, delay: 0.12, color: '#C97A2B' },
  { x: -26, y: 12, delay: 0.08, color: '#8A9B6E' },
  { x: 22, y: 16, delay: 0.16, color: '#6FAE4A' },
  { x: 4, y: -24, delay: 0.02, color: '#E6A04B' },
  { x: -8, y: 22, delay: 0.18, color: '#C97A2B' },
];

function PixelCheck() {
  const reduce = useReducedMotion();

  return (
    <svg
      width="68"
      height="68"
      viewBox="0 0 18 18"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="2" y="0" width="14" height="18" fill="#2E211B" />
      <rect x="0" y="2" width="18" height="14" fill="#2E211B" />
      <rect x="3" y="1" width="12" height="16" fill="#6FAE4A" />
      <rect x="1" y="3" width="16" height="12" fill="#6FAE4A" />
      <motion.path
        d="M4.6 9.2 L7.5 12.1 L13.4 5.3"
        fill="none"
        stroke="#FFF8EF"
        strokeWidth="1.7"
        strokeLinecap="square"
        strokeLinejoin="miter"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.65, ease: 'easeInOut', delay: 0.12 }}
      />
    </svg>
  );
}

export function SuccessAnimation() {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none relative h-[68px] w-[68px]" aria-hidden="true">
      {SPARKS.map((spark) => (
        <motion.span
          key={`${spark.x}-${spark.y}`}
          className="absolute top-1/2 left-1/2 h-2 w-2 border border-ink"
          style={{ marginLeft: -4, marginTop: -4, backgroundColor: spark.color }}
          initial={reduce ? false : { x: 0, y: 0, opacity: 0, scale: 0.6 }}
          animate={
            reduce
              ? { opacity: 0 }
              : { x: spark.x, y: spark.y, opacity: [0, 0.9, 0], scale: [0.7, 1, 0.85] }
          }
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 1.05, delay: spark.delay, ease: 'easeOut' }
          }
        />
      ))}
      <motion.div
        className="relative"
        initial={reduce ? false : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={reduce ? { duration: 0 } : { duration: 0.45, ease: 'easeOut' }}
      >
        <PixelCheck />
      </motion.div>
    </div>
  );
}
