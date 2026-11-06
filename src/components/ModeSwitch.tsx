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
    <nav aria-label="Режим" className="grid grid-cols-3 gap-2">
      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={mode === item.id}
          onClick={() => onChange(item.id)}
          className={`min-h-11 rounded-xl px-2 text-sm font-extrabold ${mode === item.id ? 'bg-primary' : 'bg-card text-ink'}`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
