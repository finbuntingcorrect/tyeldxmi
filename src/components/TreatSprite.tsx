import { useEffect, useRef, useState } from 'react';
import { TREAT_FRAMES, type TreatKind } from '../lib/focusSession';

type TreatSpriteProps = {
  kind: TreatKind;
  reduced: boolean;
  onDone: () => void;
};

const SHEETS: Record<TreatKind, string> = {
  whiskas: '/mascot/treat-whiskas.png',
  sheba: '/mascot/treat-sheba.png',
};

export function TreatSprite({ kind, reduced, onDone }: TreatSpriteProps) {
  const [frame, setFrame] = useState(reduced ? 5 : 0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    if (reduced) {
      const id = window.setTimeout(() => done.current(), 1200);
      return () => window.clearTimeout(id);
    }
    let index = 0;
    let timer = 0;
    const step = () => {
      const item = TREAT_FRAMES[index];
      setFrame(item.frame);
      index += 1;
      if (index >= TREAT_FRAMES.length) {
        timer = window.setTimeout(() => done.current(), item.ms);
        return;
      }
      timer = window.setTimeout(step, item.ms);
    };
    timer = window.setTimeout(step, 0);
    return () => window.clearTimeout(timer);
  }, [kind, reduced]);

  const column = frame % 3;
  const row = Math.floor(frame / 3);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `url(${SHEETS[kind]})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '300% 200%',
        backgroundPosition: `${column * 50}% ${row * 100}%`,
      }}
    />
  );
}
