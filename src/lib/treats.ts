import type { TreatKind } from './focusSession';

export type TreatMirror = {
  date: string;
  whiskas: boolean;
  sheba: boolean;
};

export function treatMirrorKey(login: string) {
  return `today-cat.treats.${login}`;
}

export function readTreatMirror(login: string): TreatMirror | null {
  if (!login) return null;
  try {
    const raw = JSON.parse(localStorage.getItem(treatMirrorKey(login)) || 'null') as TreatMirror | null;
    if (!raw || typeof raw.date !== 'string') return null;
    return { date: raw.date, whiskas: raw.whiskas === true, sheba: raw.sheba === true };
  } catch {
    return null;
  }
}

function writeClaim(login: string, date: string, kind: TreatKind) {
  const current = readTreatMirror(login);
  const day: TreatMirror = current?.date === date ? { ...current } : { date, whiskas: false, sheba: false };
  if (day[kind]) return false;
  day[kind] = true;
  localStorage.setItem(treatMirrorKey(login), JSON.stringify(day));
  return readTreatMirror(login)?.[kind] === true;
}

/** One claim per user and date. A second tab sees the same local record and does not win. */
export async function claimTreat(login: string, date: string, kind: TreatKind): Promise<boolean> {
  if (!login || !date) return false;
  const take = () => {
    try {
      return writeClaim(login, date, kind);
    } catch {
      return true;
    }
  };
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(`today-cat-treat-${login}-${date}-${kind}`, { ifAvailable: true }, async (lock) => {
      if (!lock) return false;
      return take();
    });
  }
  return take();
}
