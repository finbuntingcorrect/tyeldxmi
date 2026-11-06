import { useState } from 'react';
import { LOOKS, OCCUPATIONS, PURPOSES, ROLES } from '../lib/plannerCopy';
import type { CatLook, CatRole, Occupation, Profile, Purpose } from '../types';

const ZONES = ['Europe/Kaliningrad', 'Europe/Moscow', 'Europe/Samara', 'Asia/Yekaterinburg', 'Asia/Omsk', 'Asia/Novosibirsk', 'Asia/Irkutsk', 'Asia/Vladivostok', 'Asia/Kamchatka', 'Europe/Berlin', 'Asia/Almaty', 'UTC'];

type ProfileScreenProps = {
  profile: Profile;
  onSave: (patch: Partial<Profile>) => Promise<boolean>;
  onLogout: () => void;
  onBack: () => void;
};

export function ProfileScreen({ profile, onSave, onLogout, onBack }: ProfileScreenProps) {
  const [name, setName] = useState(profile.name);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [occupation, setOccupation] = useState<Occupation | null>(profile.occupation);
  const [purpose, setPurpose] = useState<Purpose | null>(profile.purpose);
  const [catName, setCatName] = useState(profile.catName);
  const [catLook, setCatLook] = useState<CatLook>(profile.catLook);
  const [catRole, setCatRole] = useState<CatRole>(profile.catRole);
  const zones = timezone && !ZONES.includes(timezone) ? [timezone, ...ZONES] : ZONES;

  return (
    <section className="rounded-[28px] border border-line bg-card p-4 sm:p-6">
      <button type="button" onClick={onBack} className="min-h-11 text-sm font-extrabold text-muted">К сегодняшнему плану</button>
      <h1 className="mt-2 text-2xl font-extrabold">Профиль</h1>
      <p className="mt-1 text-sm font-semibold text-muted">{profile.email}</p>
      <form
        className="mt-4 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave({ name, timezone, occupation, purpose, catName, catLook, catRole });
        }}
      >
        <label className="grid gap-1 text-sm font-extrabold">Имя
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="min-h-12 rounded-2xl border border-line px-4 font-semibold" />
        </label>
        <label className="grid gap-1 text-sm font-extrabold">Часовой пояс
          <select value={timezone} onChange={(event) => setTimezone(event.target.value)} className="min-h-12 rounded-2xl border border-line bg-white px-4 font-semibold">
            {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </label>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-extrabold">Чем занимаешься</legend>
          {OCCUPATIONS.map((item) => (
            <label key={item.id} className="flex min-h-11 items-center gap-2 text-sm font-bold">
              <input type="radio" name="occupation" checked={occupation === item.id} onChange={() => setOccupation(item.id)} />
              {item.label}
            </label>
          ))}
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-extrabold">Для чего Today Cat</legend>
          {PURPOSES.map((item) => (
            <label key={item.id} className="flex min-h-11 items-center gap-2 text-sm font-bold">
              <input type="radio" name="purpose" checked={purpose === item.id} onChange={() => setPurpose(item.id)} />
              {item.label}
            </label>
          ))}
        </fieldset>
        <label className="grid gap-1 text-sm font-extrabold">Имя котёнка
          <input value={catName} onChange={(event) => setCatName(event.target.value)} maxLength={40} className="min-h-12 rounded-2xl border border-line px-4 font-semibold" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {LOOKS.map((look) => (
            <button key={look.id} type="button" aria-pressed={catLook === look.id} onClick={() => setCatLook(look.id)} className={`rounded-2xl border p-2 text-sm font-extrabold ${catLook === look.id ? 'border-primary bg-primary/30' : 'border-line'}`}>
              <img src="/mascot/cat-working.png" alt="" style={{ filter: look.filter }} className="mascot-art h-24 w-full object-contain" />
              {look.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          {ROLES.map((role) => (
            <button key={role.id} type="button" aria-pressed={catRole === role.id} onClick={() => setCatRole(role.id)} className={`min-h-11 rounded-2xl px-4 text-left ${catRole === role.id ? 'bg-primary' : 'bg-cream'}`}>
              <span className="block text-sm font-extrabold">{role.label}</span>
              <span className="block text-xs font-semibold text-muted">{role.text}</span>
            </button>
          ))}
        </div>
        <button type="submit" className="min-h-12 rounded-2xl bg-primary text-base font-extrabold">Сохранить</button>
      </form>
      <button type="button" onClick={onLogout} className="mt-4 min-h-12 w-full rounded-2xl border border-line text-base font-extrabold">Выйти</button>
    </section>
  );
}
