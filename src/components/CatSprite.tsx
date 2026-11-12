import { useEffect, useRef, useState } from 'react';

export type CatClip = 'walk' | 'blink' | 'groom' | 'stretch' | 'sleep';

const ROWS: Record<CatClip, number> = {
  walk: 0,
  blink: 1,
  groom: 2,
  stretch: 3,
  sleep: 4,
};

const BLINK_MS = [1300, 500, 90, 100, 100, 90, 250, 700];

type CatSpriteProps = {
  clip: CatClip;
  face: 1 | -1;
  reduced: boolean;
  blinkPause?: number;
  onFinished?: () => void;
};

function frameDelay(clip: CatClip, frame: number) {
  if (clip === 'blink') return BLINK_MS[frame] ?? 400;
  if (clip === 'walk') return 125;
  if (clip === 'sleep') return 500;
  return 200;
}

function loops(clip: CatClip) {
  return clip === 'walk' || clip === 'sleep';
}

export function CatSprite({ clip, face, reduced, blinkPause = 3600, onFinished }: CatSpriteProps) {
  const [frame, setFrame] = useState(0);
  const done = useRef(onFinished);

  useEffect(() => {
    done.current = onFinished;
  });

  useEffect(() => {
    if (reduced) return;
    let index = 0;
    let timer = 0;
    const tick = () => {
      setFrame(index);
      const delay = frameDelay(clip, index);
      index += 1;
      if (index >= 8) {
        if (clip === 'blink') {
          index = 0;
          timer = window.setTimeout(tick, blinkPause);
          return;
        }
        if (!loops(clip)) {
          done.current?.();
          return;
        }
        index = 0;
      }
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [blinkPause, clip, reduced]);

  const shown = reduced ? 0 : frame;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: 'url(/mascot/cat-atlas.png)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '800% 500%',
        backgroundPosition: `${(shown / 7) * 100}% ${(ROWS[clip] / 4) * 100}%`,
        transform: clip === 'walk' && face === -1 ? 'scaleX(-1)' : undefined,
      }}
    />
  );
}
