import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { weekday } from '../../server/recurrence';
import { WEEKDAYS } from '../lib/plannerCopy';
import {
  menuChoices,
  monthEndHint,
  presetSchedule,
  scheduleLabel,
  type RepeatSchedule,
} from '../lib/schedule';

type RepeatFieldProps = {
  date: string;
  value: RepeatSchedule;
  onChange: (next: RepeatSchedule) => void;
};

type Unit = 'day' | 'week' | 'month';

function unitNoun(count: number, one: string, few: string, many: string) {
  const value = Number.isInteger(count) && count > 0 ? count : 1;
  const abs = value % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function unitOf(schedule: RepeatSchedule): Unit {
  if (schedule.repeatKind === 'monthly') return 'month';
  if (schedule.repeatKind === 'weekly' || schedule.repeatKind === 'weekdays') return 'week';
  return 'day';
}

function daysOf(schedule: RepeatSchedule, date: string) {
  if (schedule.repeatKind === 'weekdays') return [1, 2, 3, 4, 5];
  if (schedule.repeatKind === 'weekly' && schedule.weekdays.length > 0) return schedule.weekdays;
  return [weekday(date)];
}

export function RepeatField({ date, value, onChange }: RepeatFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const intervalId = useId();
  const unitId = useId();
  const untilId = useId();
  const [menu, setMenu] = useState(false);
  const [custom, setCustom] = useState(false);
  const [interval, setInterval] = useState(1);
  const [unit, setUnit] = useState<Unit>('day');
  const [days, setDays] = useState<number[]>([]);
  const [until, setUntil] = useState<string | null>(null);
  const choices = menuChoices(date);
  const customDay = value.repeatKind === 'monthly' && value.monthDay ? value.monthDay : Number(date.slice(8, 10));
  const hint = unit === 'month' ? monthEndHint(customDay) : null;

  useEffect(() => {
    if (!menu && !custom) return;
    function onPointer(event: PointerEvent) {
      const target = event.target as Node;
      if (fieldRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setMenu(false);
      setCustom(false);
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
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
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [menu, custom]);

  function openCustom() {
    setMenu(false);
    setInterval(value.interval || 1);
    setUnit(unitOf(value));
    setDays(daysOf(value, date));
    setUntil(value.until);
    setCustom(true);
  }

  function applyCustom() {
    const count = Number.isInteger(interval) && interval >= 1 && interval <= 99 ? interval : 1;
    const end = until;
    if (unit === 'day') {
      onChange({ repeatKind: 'daily', weekdays: [], interval: count, until: end, monthDay: null });
    } else if (unit === 'month') {
      onChange({ repeatKind: 'monthly', weekdays: [], interval: count, until: end, monthDay: customDay });
    } else {
      const selected = days.length > 0 ? [...days].sort((a, b) => a - b) : [weekday(date)];
      const monFri = [1, 2, 3, 4, 5].every((day) => selected.includes(day)) && selected.length === 5;
      if (monFri && count === 1) onChange({ repeatKind: 'weekdays', weekdays: [], interval: 1, until: end, monthDay: null });
      else onChange({ repeatKind: 'weekly', weekdays: selected, interval: count, until: end, monthDay: null });
    }
    setCustom(false);
  }

  return (
    <div ref={fieldRef} className="relative mt-4">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menu || custom}
        onClick={() => { setCustom(false); setMenu((open) => !open); }}
        className="paper-field text-left text-base"
      >
        Повтор: {scheduleLabel(value)}
      </button>
      {menu || custom ? (
        <div ref={panelRef} className="border border-line bg-card shadow-sm">
          {menu ? <RepeatMenu choices={choices} date={date} onChange={onChange} onClose={() => setMenu(false)} onCustom={openCustom} /> : null}
          {custom ? (
            <CustomPanel
              intervalId={intervalId}
              unitId={unitId}
              untilId={untilId}
              interval={interval}
              unit={unit}
              days={days}
              until={until}
              date={date}
              hint={hint}
              onInterval={setInterval}
              onUnit={setUnit}
              onDays={setDays}
              onUntil={setUntil}
              onApply={applyCustom}
              onCancel={() => setCustom(false)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RepeatMenu({ choices, date, onChange, onClose, onCustom }: {
  choices: ReturnType<typeof menuChoices>;
  date: string;
  onChange: (next: RepeatSchedule) => void;
  onClose: () => void;
  onCustom: () => void;
}) {
  return (
    <div role="menu" className="py-1">
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          role="menuitem"
          onClick={() => { onChange(presetSchedule(choice.id, date)); onClose(); }}
          className="block min-h-11 w-full px-3 py-2 text-left text-sm"
        >
          <span className="block font-semibold">{choice.label}</span>
          {choice.hint ? <span className="mt-0.5 block text-xs text-muted">{choice.hint}</span> : null}
        </button>
      ))}
      <div className="mt-1 border-t border-line pt-1">
        <button type="button" role="menuitem" onClick={onCustom} className="block min-h-11 w-full px-3 text-left text-sm font-semibold">
          Другое…
        </button>
      </div>
    </div>
  );
}

function CustomPanel(props: {
  intervalId: string;
  unitId: string;
  untilId: string;
  interval: number;
  unit: Unit;
  days: number[];
  until: string | null;
  date: string;
  hint: string | null;
  onInterval: (value: number) => void;
  onUnit: (value: Unit) => void;
  onDays: (value: number[] | ((current: number[]) => number[])) => void;
  onUntil: (value: string | null) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const { interval, unit, days, until, date, hint } = props;
  return (
    <div className="px-3 py-3">
      <p className="text-sm font-semibold">Повторять каждые</p>
      <div className="mt-2 flex gap-2">
        <input
          id={props.intervalId}
          aria-label="Интервал"
          type="number"
          min={1}
          max={99}
          inputMode="numeric"
          value={interval}
          onChange={(event) => props.onInterval(Number(event.target.value))}
          className="paper-field w-16 text-base"
        />
        <select id={props.unitId} aria-label="Единица повтора" value={unit} onChange={(event) => props.onUnit(event.target.value as Unit)} className="paper-field text-base">
          <option value="day">{unitNoun(interval, 'день', 'дня', 'дней')}</option>
          <option value="week">{unitNoun(interval, 'неделю', 'недели', 'недель')}</option>
          <option value="month">{unitNoun(interval, 'месяц', 'месяца', 'месяцев')}</option>
        </select>
      </div>
      {unit === 'week' ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {WEEKDAYS.map((day) => (
            <button
              key={day.id}
              type="button"
              aria-pressed={days.includes(day.id)}
              onClick={() => props.onDays((current) => current.includes(day.id) ? current.filter((item) => item !== day.id) : [...current, day.id])}
              className="paper-choice min-w-11"
            >
              {day.label}
            </button>
          ))}
        </div>
      ) : null}
      <p className="mt-3 text-sm font-semibold">Окончание</p>
      <div className="mt-1 flex flex-wrap gap-1">
        <button type="button" aria-pressed={!until} onClick={() => props.onUntil(null)} className="paper-choice">Без даты</button>
        <button type="button" aria-pressed={Boolean(until)} onClick={() => props.onUntil(until || date)} className="paper-choice">До даты</button>
      </div>
      {until ? (
        <input id={props.untilId} aria-label="Дата окончания" type="date" value={until} onChange={(event) => props.onUntil(event.target.value || date)} className="paper-field mt-1 text-base" />
      ) : null}
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={props.onApply} className="paper-submit min-h-11 flex-1">Готово</button>
        <button type="button" onClick={props.onCancel} className="paper-choice min-h-11 flex-1">Отмена</button>
      </div>
    </div>
  );
}
