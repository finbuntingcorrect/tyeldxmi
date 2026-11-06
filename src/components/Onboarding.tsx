import { useState } from 'react';
import { LOOKS, OCCUPATIONS, PURPOSES, ROLES, purposeExamples, suggestedRole } from '../lib/plannerCopy';
import type { CatLook, CatRole, Occupation, Profile, Purpose } from '../types';

type OnboardingProps = {
  profile: Profile;
  onSave: (patch: Partial<Profile> & { onboardingDone?: boolean }) => Promise<boolean>;
};

export function Onboarding({ profile, onSave }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name);
  const [occupation, setOccupation] = useState<Occupation | null>(profile.occupation);
  const [purpose, setPurpose] = useState<Purpose | null>(profile.purpose);
  const [catName, setCatName] = useState(profile.catName);
  const [catLook, setCatLook] = useState<CatLook>(profile.catLook);
  const [catRole, setCatRole] = useState<CatRole>(profile.catRole);
  const examples = purposeExamples(purpose);
  const roleHint = suggestedRole(purpose);

  async function finish(done: boolean) {
    await onSave({ name, occupation, purpose, catName, catLook, catRole, onboardingDone: done });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-8">
      <section className="w-full rounded-[28px] border border-line bg-card p-5 sm:p-6">
        <p className="text-sm font-extrabold text-muted">Шаг {step + 1} из 3</p>
        {step === 0 ? (
          <>
            <h1 className="mt-2 text-2xl font-extrabold">Как к тебе обращаться и чем ты занимаешься?</h1>
            <label htmlFor="hello-name" className="mt-4 block text-sm font-extrabold">Имя</label>
            <input id="hello-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="mt-2 min-h-12 w-full rounded-2xl border border-line px-4" />
            <div className="mt-4 grid gap-2">
              {OCCUPATIONS.map((item) => (
                <button key={item.id} type="button" aria-pressed={occupation === item.id} onClick={() => setOccupation(item.id)} className={`min-h-11 rounded-2xl px-4 text-left text-sm font-extrabold ${occupation === item.id ? 'bg-primary' : 'bg-cream'}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
        {step === 1 ? (
          <>
            <h1 className="mt-2 text-2xl font-extrabold">Для чего тебе Today Cat?</h1>
            <div className="mt-4 grid gap-2">
              {PURPOSES.map((item) => (
                <button key={item.id} type="button" aria-pressed={purpose === item.id} onClick={() => { setPurpose(item.id); setCatRole(suggestedRole(item.id)); }} className={`min-h-11 rounded-2xl px-4 text-left text-sm font-extrabold ${purpose === item.id ? 'bg-primary' : 'bg-cream'}`}>
                  {item.label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold text-muted">Например: {examples.join(' · ')}. Для этого подойдёт роль «{ROLES.find((item) => item.id === roleHint)?.label}».</p>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <h1 className="mt-2 text-2xl font-extrabold">Выбери своего котёнка</h1>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {LOOKS.map((look) => (
                <button key={look.id} type="button" aria-pressed={catLook === look.id} onClick={() => setCatLook(look.id)} className={`rounded-2xl border p-2 text-sm font-extrabold ${catLook === look.id ? 'border-primary bg-primary/30' : 'border-line bg-cream'}`}>
                  <img src="/mascot/cat-working.png" alt="" style={{ filter: look.filter }} className="mascot-art h-28 w-full object-contain" />
                  {look.label}
                </button>
              ))}
            </div>
            <label htmlFor="cat-name" className="mt-4 block text-sm font-extrabold">Имя котёнка</label>
            <input id="cat-name" value={catName} onChange={(event) => setCatName(event.target.value)} maxLength={40} className="mt-2 min-h-12 w-full rounded-2xl border border-line px-4" />
            <div className="mt-4 grid gap-2">
              {ROLES.map((role) => (
                <button key={role.id} type="button" aria-pressed={catRole === role.id} onClick={() => setCatRole(role.id)} className={`min-h-11 rounded-2xl px-4 text-left ${catRole === role.id ? 'bg-primary' : 'bg-cream'}`}>
                  <span className="block text-sm font-extrabold">{role.label}</span>
                  <span className="block text-xs font-semibold text-muted">{role.text}</span>
                </button>
              ))}
            </div>
          </>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => void onSave({ name, occupation, purpose, catName, catLook, catRole, onboardingDone: true })} className="min-h-11 rounded-xl px-4 text-sm font-extrabold text-muted">
            Пропустить
          </button>
          {step < 2 ? (
            <button type="button" onClick={() => setStep((value) => value + 1)} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-extrabold">
              Дальше
            </button>
          ) : (
            <button type="button" onClick={() => void finish(true)} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-extrabold">
              Готово
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
