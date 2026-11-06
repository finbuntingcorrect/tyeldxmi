import { Plus } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';

type TaskInputProps = {
  onAdd: (title: string) => Promise<boolean>;
};

export function TaskInput({ onAdd }: TaskInputProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const added = await onAdd(value);
    if (!added) {
      setError('Введите название задачи');
      return;
    }
    setValue('');
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <div className="min-w-0 flex-1">
        <label htmlFor="new-task" className="sr-only">
          Новая задача
        </label>
        <input
          id="new-task"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          maxLength={160}
          autoComplete="off"
          enterKeyHint="done"
          placeholder="Например, полить цветы"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-h-12 w-full rounded-2xl border border-line bg-white/80 px-4 text-base text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition placeholder:text-[#b09d8c] focus-visible:border-primary"
        />
        {error ? (
          <p id={errorId} className="mt-2 text-sm font-semibold text-[#8C3F32]" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-extrabold text-ink transition hover:bg-primary-hover"
      >
        <Plus aria-hidden="true" size={18} strokeWidth={2.75} />
        Добавить
      </button>
    </form>
  );
}
