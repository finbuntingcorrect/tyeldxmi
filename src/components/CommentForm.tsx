import { useId, useState, type FormEvent } from 'react';

export function CommentForm() {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const errorId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    setError(null);
    setPending(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      if (!response.ok) {
        setError(response.status === 400 ? 'Введите комментарий' : 'Не удалось сохранить комментарий');
        return;
      }
      setComment('');
      setSaved(true);
    } catch {
      setError('Не удалось сохранить комментарий');
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-[28px] border border-line bg-card p-4 shadow-[0_16px_40px_rgba(46,33,27,0.06)] sm:p-6"
    >
      <label htmlFor="comment" className="text-sm font-extrabold text-ink">
        Комментарий
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="comment"
          name="comment"
          type="text"
          value={comment}
          maxLength={1000}
          autoComplete="off"
          placeholder="Напишите комментарий"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            setComment(event.target.value);
            if (error) setError(null);
            if (saved) setSaved(false);
          }}
          className="min-h-12 w-full rounded-2xl border border-line bg-white/80 px-4 text-base text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition placeholder:text-[#b09d8c] focus-visible:border-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-2xl bg-primary px-5 text-base font-extrabold text-ink transition hover:bg-primary-hover disabled:opacity-60"
        >
          Отправить
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-sm font-semibold text-[#8C3F32]">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-2 text-sm font-semibold text-muted">Комментарий сохранён в базе.</p>
      ) : (
        <p className="mt-2 text-xs font-semibold text-muted">Комментарий записывается в базу, не в браузер.</p>
      )}
    </form>
  );
}
