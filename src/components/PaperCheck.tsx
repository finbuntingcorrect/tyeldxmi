import { Check } from 'lucide-react';

type PaperCheckProps = {
  checked: boolean;
  label: string;
  onClick: () => void;
};

export function PaperCheck({ checked, label, onClick }: PaperCheckProps) {
  return (
    <button type="button" aria-pressed={checked} aria-label={label} onClick={onClick} className="grid h-11 w-11 shrink-0 place-items-center">
      <span aria-hidden="true" className={`grid h-4 w-4 place-items-center border ${checked ? 'border-success text-success' : 'border-ink'}`}>
        {checked ? <Check size={12} strokeWidth={2.5} /> : null}
      </span>
    </button>
  );
}
