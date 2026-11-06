import { Check } from 'lucide-react';
import type { AppTheme } from '../lib/notebook';
import { THEME_OPTIONS } from '../lib/theme';

type ThemePickerProps = {
  theme: AppTheme | null;
  onChange: (theme: AppTheme) => void;
};

export function ThemePicker({ theme, onChange }: ThemePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3" role="listbox" aria-label="Цвет приложения">
      {THEME_OPTIONS.map((option) => {
        const selected = theme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onChange(option.id)}
            className={`relative min-h-24 rounded-3xl border px-3 py-3 text-left ${selected ? 'border-primary bg-card ring-2 ring-primary' : 'border-line bg-cream'}`}
          >
            <span className="flex h-10 overflow-hidden rounded-xl border border-line" aria-hidden="true">
              <span className="w-2/3" style={{ backgroundColor: option.page }} />
              <span className="w-1/3" style={{ backgroundColor: option.accent }} />
            </span>
            <span className="mt-2 block text-sm font-extrabold text-ink">{option.label}</span>
            {selected ? (
              <span className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-primary" aria-hidden="true">
                <Check size={16} strokeWidth={3} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
