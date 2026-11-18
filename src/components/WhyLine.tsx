import { useState } from 'react';

type WhyLineProps = {
  text: string | null;
  onSave: (text: string) => void;
};

export function WhyLine({ text, onSave }: WhyLineProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text ?? '');
  if (!editing) {
    return (
      <button type="button" onClick={() => { setValue(text ?? ''); setEditing(true); }} className="block max-w-full py-1 text-left text-xs break-words text-muted">
        {text?.trim() ? text : 'зачем'}
      </button>
    );
  }
  return (
    <input
      autoFocus
      maxLength={120}
      aria-label="зачем"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => { onSave(value); setEditing(false); }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onSave(value);
          setEditing(false);
        }
      }}
      className="paper-field my-1 w-full"
    />
  );
}
