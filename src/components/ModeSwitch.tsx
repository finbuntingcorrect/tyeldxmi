import type { AppMode } from '../lib/notebook';

const MODES: { id: AppMode; label: string }[] = [
  { id: 'habits', label: 'Привычки' },
  { id: 'planner', label: 'Планер' },
  { id: 'focus', label: 'Фокус' },
];

type ModeSwitchProps = {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
};

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <nav aria-label="Режим" className="grid grid-cols-3 border-y border-line">
      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={mode === item.id}
          onClick={() => onChange(item.id)}
          className={`min-h-11 text-sm font-semibold ${mode === item.id ? 'text-ink shadow-[inset_0_-2px_0_var(--color-primary)]' : 'text-muted'}`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
