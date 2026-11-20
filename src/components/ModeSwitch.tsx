import { AppLink } from './AppLink';
import type { AppPage } from '../lib/route';

const LINKS: { id: 'calendar' | 'habits' | 'focus'; href: string; label: string }[] = [
  { id: 'calendar', href: '/', label: 'Календарь' },
  { id: 'habits', href: '/habits', label: 'Привычки' },
  { id: 'focus', href: '/focus', label: 'Фокус' },
];

function currentLink(page: AppPage) {
  if (page.name === 'habits') return 'habits';
  if (page.name === 'focus') return 'focus';
  if (page.name === 'settings') return null;
  return 'calendar';
}

export function ModeSwitch({ page }: { page: AppPage }) {
  const current = currentLink(page);
  return (
    <nav aria-label="Страницы" className="grid grid-cols-3 border-y border-line">
      {LINKS.map((item) => (
        <AppLink
          key={item.id}
          href={item.href}
          aria-current={current === item.id ? 'page' : undefined}
          className={`grid min-h-11 place-items-center text-sm font-semibold ${current === item.id ? 'text-ink shadow-[inset_0_-2px_0_var(--color-primary)]' : 'text-muted'}`}
        >
          {item.label}
        </AppLink>
      ))}
    </nav>
  );
}
