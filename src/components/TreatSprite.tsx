import { useEffect, useMemo, useRef, useState } from 'react';
import type { TreatKind } from '../lib/focusSession';
import { FEED_FRAME_MS, feedFrames, type FeedKind, warmImages } from '../lib/uiKit';

type TreatSpriteProps = {
  kind: TreatKind;
  reduced: boolean;
  onDone: () => void;
};

function framesFor(kind: TreatKind): string[] {
  const sequence: FeedKind = kind === 'sheba' || kind === 'whiskas' ? kind : 'basic';
  return feedFrames(sequence);
}

export function TreatSprite({ kind, reduced, onDone }: TreatSpriteProps) {
  const frames = useMemo(() => framesFor(kind), [kind]);
  const [index, setIndex] = useState(reduced ? frames.length - 1 : 0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    warmImages(frames);
    let cancelled = false;
    let started = false;
    let timer = 0;
    const last = frames.length - 1;

    const play = () => {
      if (started || cancelled) return;
      started = true;
      if (reduced) {
        setIndex(last);
        timer = window.setTimeout(() => done.current(), 1200);
        return;
      }
      let step = 0;
      const advance = () => {
        if (cancelled) return;
        setIndex(step);
        const ms = FEED_FRAME_MS[step] ?? FEED_FRAME_MS[FEED_FRAME_MS.length - 1];
        step += 1;
        if (step >= frames.length) {
          timer = window.setTimeout(() => done.current(), ms);
          return;
        }
        timer = window.setTimeout(advance, ms);
      };
      advance();
    };

    const ready = Promise.all(frames.map((src) => {
      const image = new Image();
      image.src = src;
      return image.decode?.().catch(() => undefined) ?? Promise.resolve();
    }));
    const fallback = window.setTimeout(play, 400);
    void ready.then(() => {
      window.clearTimeout(fallback);
      play();
    });
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      window.clearTimeout(timer);
    };
  }, [frames, reduced]);

  return (
    <div className="treat-play" aria-hidden="true">
      <img src={frames[index]} alt="" draggable={false} />
    </div>
  );
}
