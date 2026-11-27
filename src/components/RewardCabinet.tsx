import { useEffect, useId, useState } from 'react';
import {
  rewardCounts,
  rewardItem,
  rewardSlot,
  rewardSrc,
  REWARD_CABINET,
  REWARD_ITEMS,
  CABINET_RATIO,
  type FocusReward,
  type RewardId,
} from '../lib/rewards';

type RewardCabinetProps = {
  rewards: FocusReward[];
  arrivalId: RewardId | null;
  arrivalToken: number;
  motion: boolean;
  caption: string | null;
};

export function RewardCabinet({ rewards, arrivalId, arrivalToken, motion, caption }: RewardCabinetProps) {
  const [open, setOpen] = useState<RewardId | null>(null);
  const counts = rewardCounts(rewards);
  const labelId = useId();
  const openItem = open ? rewardItem(open) : null;
  const openCount = open ? counts.get(open) ?? 0 : 0;

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  return (
    <div className="reward-cabinet">
      <div className="reward-shelf" style={{ aspectRatio: String(CABINET_RATIO) }}>
        <img src={REWARD_CABINET} alt="" width={1315} height={1196} draggable={false} />
        {REWARD_ITEMS.map((item) => {
          const count = counts.get(item.id) ?? 0;
          if (count < 1) return null;
          const slot = rewardSlot(item.id);
          const arriving = arrivalId === item.id;
          const motionClass = !motion || !arriving ? '' : count > 1 ? ' is-bump' : ' is-new';
          return (
            <button
              key={arriving ? `${item.id}-${arrivalToken}` : item.id}
              type="button"
              className={`reward-item${motionClass}${open === item.id ? ' is-open' : ''}`}
              style={{ left: `${slot.left * 100}%`, top: `${slot.top * 100}%`, width: `${slot.width * 100}%`, height: `${slot.height * 100}%` }}
              aria-pressed={open === item.id}
              aria-label={`${item.name}, ${count}`}
              onClick={() => setOpen((current) => current === item.id ? null : item.id)}
            >
              <img src={rewardSrc(item.id)} alt="" draggable={false} />
              {count > 1 ? <span className="reward-count">×{count}</span> : null}
            </button>
          );
        })}
      </div>
      {caption ? <p id={labelId} className="reward-caption" role="status">{caption}</p> : null}
      {openItem ? <p className="reward-detail">{openItem.name} ×{openCount}</p> : <p className="reward-detail" aria-hidden="true" />}
    </div>
  );
}
