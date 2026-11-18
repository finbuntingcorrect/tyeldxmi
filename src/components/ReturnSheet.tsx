import { useState } from 'react';
import { dateFromKey } from '../lib/date';
import type { ReturnRow } from '../lib/notebook';

type ReturnSheetProps = {
  rows: ReturnRow[];
  onBring: (key: string) => void;
  onLater: () => void;
};

function quietDate(date: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(dateFromKey(date));
}

export function ReturnSheet({ rows, onBring, onLater }: ReturnSheetProps) {
  const [left, setLeft] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const visible = rows.filter((row) => !left.includes(row.key));
  const shown = expanded ? visible : visible.slice(0, 12);
  const hidden = visible.length - shown.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-card">
      <div className="mx-auto w-full min-w-0 max-w-xl px-4 py-6">
        <h2 className="text-3xl">Страница лежала закрытой.</h2>
        <ul className="mt-6 border-t border-line">
          {shown.map((row) => (
            <li key={row.key} className="border-b border-line py-3">
              <p className="text-base break-words text-ink">{row.title}</p>
              <p className="mt-1 text-sm text-muted">{row.tasks.map((task) => quietDate(task.date)).join(', ')}</p>
              <div className="flex flex-wrap">
                <button type="button" onClick={() => onBring(row.key)} className="paper-choice px-2">на сегодня</button>
                <button type="button" onClick={() => setLeft((current) => [...current, row.key])} className="paper-choice px-2">оставить</button>
              </div>
            </li>
          ))}
        </ul>
        {hidden > 0 ? (
          <button type="button" onClick={() => setExpanded(true)} className="mt-3 min-h-11 text-sm text-muted">ещё {hidden}</button>
        ) : null}
        <button type="button" onClick={onLater} className="mt-6 min-h-11 text-sm font-semibold text-muted">Позже</button>
      </div>
    </div>
  );
}
