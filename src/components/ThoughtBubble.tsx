import { motion, useReducedMotion } from 'motion/react';

function PixelBulb() {
  const reduce = useReducedMotion();

  return (
    <div className="relative grid place-items-center">
      <motion.span
        className="absolute h-11 w-11 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255, 226, 150, 0.95) 0%, rgba(230, 160, 75, 0.42) 46%, rgba(230, 160, 75, 0) 72%)',
        }}
        aria-hidden="true"
        initial={false}
        animate={
          reduce
            ? { opacity: 0.75, scale: 1 }
            : { opacity: [0.45, 0.82, 0.55, 0.78], scale: [0.94, 1.06, 0.97, 1.03] }
        }
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }
        }
      />
      <svg
        width="26"
        height="26"
        viewBox="0 0 14 14"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <rect x="5" y="1" width="4" height="1" fill="#E6A04B" />
        <rect x="4" y="2" width="6" height="1" fill="#E6A04B" />
        <rect x="3" y="3" width="8" height="4" fill="#E6A04B" />
        <rect x="4" y="3" width="2" height="2" fill="#FFE7B8" />
        <rect x="4" y="7" width="6" height="1" fill="#C97A2B" />
        <rect x="5" y="8" width="4" height="1" fill="#2E211B" />
        <rect x="5" y="10" width="4" height="1" fill="#2E211B" />
        <rect x="6" y="9" width="2" height="1" fill="#7A6A5C" />
        <rect x="6" y="11" width="2" height="1" fill="#2E211B" />
      </svg>
    </div>
  );
}

export function ThoughtBubble() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="pointer-events-none relative origin-[28%_88%]"
      aria-hidden="true"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={
        reduce
          ? { opacity: 1, y: 0, rotate: 0 }
          : { opacity: 1, y: [0, -3, 0], rotate: [-1.05, 1.05, -1.05] }
      }
      transition={
        reduce
          ? { duration: 0 }
          : {
              opacity: { duration: 0.6, ease: 'easeOut' },
              y: { duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 },
              rotate: { duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 },
            }
      }
    >
      <div className="relative h-[68px] w-[96px]">
        <svg
          className="absolute inset-0"
          viewBox="0 0 54 40"
          width="96"
          height="68"
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          <rect x="8" y="4" width="36" height="22" fill="#2E211B" />
          <rect x="6" y="6" width="40" height="18" fill="#2E211B" />
          <rect x="10" y="6" width="32" height="18" fill="#FFF8EF" />
          <rect x="8" y="8" width="36" height="14" fill="#FFF8EF" />
          <rect x="16" y="26" width="6" height="4" fill="#2E211B" />
          <rect x="18" y="28" width="4" height="4" fill="#FFF8EF" />
          <rect x="12" y="32" width="4" height="4" fill="#2E211B" />
          <rect x="13" y="33" width="2" height="2" fill="#FFF8EF" />
        </svg>
        <div className="absolute top-[7px] left-1/2 -translate-x-1/2">
          <PixelBulb />
        </div>
      </div>
    </motion.div>
  );
}
