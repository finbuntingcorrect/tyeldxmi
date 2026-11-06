import { useState } from 'react';

type AuthScreenProps = {
  error: string | null;
  onRequest: (email: string) => Promise<boolean>;
};

export function AuthScreen({ error, onRequest }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-10">
      <section className="w-full rounded-[28px] border border-line bg-card p-6 shadow-[0_16px_40px_rgba(46,33,27,0.06)]">
        <h1 className="text-3xl font-extrabold text-ink">Today Cat</h1>
        <p className="mt-3 text-base font-semibold leading-relaxed text-muted">
          Вход по ссылке из письма. Пароля нет: новая ссылка открывает тот же аккаунт на телефоне и компьютере и восстанавливает доступ.
        </p>
        <form
          className="mt-6 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            const ok = await onRequest(email);
            setPending(false);
            setSent(ok);
          }}
        >
          <label htmlFor="email" className="text-sm font-extrabold">Почта</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-12 rounded-2xl border border-line bg-white px-4"
          />
          <button type="submit" disabled={pending} className="min-h-12 rounded-2xl bg-primary px-4 text-base font-extrabold disabled:opacity-60">
            Прислать ссылку для входа
          </button>
        </form>
        {sent ? <p className="mt-4 text-sm font-bold text-ink">Ссылка отправлена. Откройте письмо на этом или другом устройстве.</p> : null}
        {error ? <p role="alert" className="mt-4 text-sm font-bold text-[#8C3F32]">{error}</p> : null}
      </section>
    </main>
  );
}
