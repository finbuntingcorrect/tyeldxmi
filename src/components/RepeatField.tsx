import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { weekday } from '../../server/recurrence';
import { WEEKDAYS } from '../lib/plannerCopy';
import {
  menuChoices,
  presetSchedule,
  scheduleLabel,
  type RepeatSchedule,
} from '../lib/schedule';

type RepeatFieldProps = {
  date: string;
  value: RepeatSchedule;
  onChange: (next: RepeatSchedule) => void;
};

function daysOf(schedule: RepeatSchedule, date: string) {
  if (schedule.repeatKind === 'weekdays') return [1, 2, 3, 4, 5];
  if (schedule.repeatKind === 'weekly' && schedule.weekdays.length > 0) return schedule.weekdays;
  return [weekday(date)];
}

export function RepeatField({ date, value, onChange }: RepeatFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);
  const [custom, setCustom] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const choices = menuChoices();

  useEffect(() => {
    if (!menu && !custom) return;
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (fieldRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      if (custom) setCustom(false);
      else setMenu(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (custom) {
        setCustom(false);
        return;
      }
      setMenu(false);
    }
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [menu, custom]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    function place() {
      const dialog = fieldRef.current?.closest('[role="dialog"]');
      if (!(dialog instanceof HTMLElement) || !panel) return;
      const footer = dialog.querySelector('[data-dialog-footer]');
      const dialogBox = dialog.getBoundingClientRect();
      const footerTop = footer instanceof HTMLElement ? footer.getBoundingClientRect().top : dialogBox.bottom;
      const top = Math.max(dialogBox.top + 8, 8);
      panel.style.position = 'fixed';
      panel.style.left = `${dialogBox.left + 16}px`;
      panel.style.width = `${Math.max(160, dialogBox.width - 32)}px`;
      panel.style.bottom = `${Math.max(8, window.innerHeight - footerTop + 8)}px`;
      panel.style.maxHeight = `${Math.max(120, footerTop - top - 8)}px`;
      panel.style.overflowY = 'auto';
      panel.style.zIndex = '70';
    }
    place();
    panel.scrollIntoView({ block: 'nearest' });
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [menu, custom]);

  function openCustom() {
    setMenu(false);
    setDays(daysOf(value, date));
    setCustom(true);
  }

  function applyDays() {
    const selected = (days.length > 0 ? days : [weekday(date)]).slice().sort((a, b) => a - b);
    const monFri = selected.length === 5 && [1, 2, 3, 4, 5].every((day) => selected.includes(day));
    if (monFri) onChange({ repeatKind: 'weekdays', weekdays: [], interval: 1, until: null, monthDay: null });
    else onChange({ repeatKind: 'weekly', weekdays: selected, interval: 1, until: null, monthDay: null });
    setCustom(false);
  }

  return (
    <div ref={fieldRef} className="relative">
      <span className="block text-sm font-semibold">Повтор</span>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu || custom}
        onClick={() => { setCustom(false); setMenu((open) => !open); }}
        className="paper-field mt-1 text-left text-base"
      >
        {scheduleLabel(value)}
      </button>
      {menu || custom ? (
        <div ref={panelRef} className="border border-line bg-card shadow-sm">
          {menu ? (
            <div role="menu" className="py-1">
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  role="menuitem"
                  onClick={() => { onChange(presetSchedule(choice.id, date)); setMenu(false); }}
                  className="block min-h-11 w-full px-3 text-left text-sm font-semibold"
                >
                  {choice.label}
                </button>
              ))}
              <div className="mt-1 border-t border-line pt-1">
                <button type="button" role="menuitem" onClick={openCustom} className="block min-h-11 w-full px-3 text-left text-sm font-semibold">
                  Настроить
                </button>
              </div>
            </div>
          ) : (
            <div className="px-3 py-3">
              <p className="text-sm font-semibold">Дни недели</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    aria-pressed={days.includes(day.id)}
                    onClick={() => setDays((current) => current.includes(day.id) ? current.filter((item) => item !== day.id) : [...current, day.id])}
                    className="paper-choice min-w-11"
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={applyDays} className="paper-submit min-h-11 flex-1">Готово</button>
                <button type="button" onClick={() => setCustom(false)} className="paper-choice min-h-11 flex-1">Отмена</button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
