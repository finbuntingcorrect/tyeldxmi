import { AppLink } from './AppLink';
import type { AppPage } from '../lib/route';
import { uiKit } from '../lib/uiKit';

const LINKS: { id: 'calendar' | 'habits' | 'focus'; href: string; label: string; art: string }[] = [
  { id: 'calendar', href: '/app', label: 'Дневник', art: uiKit.tab.diary },
  { id: 'habits', href: '/app/habits', label: 'Привычки', art: uiKit.tab.habits },
  { id: 'focus', href: '/app/focus', label: 'Фокус', art: uiKit.tab.focus },
];

function currentLink(page: AppPage) {
  if (page.name === 'habits') return 'habits';
  if (page.name === 'focus') return 'focus';
  if (page.name === 'calendar' || page.name === 'day') return 'calendar';
  return null;
}

export function ModeSwitch({ page }: { page: AppPage }) {
  const current = currentLink(page);
  return (
    <nav aria-label="Страницы" className="mode-tabs">
      {LINKS.map((item) => (
        <AppLink
          key={item.id}
          href={item.href}
          aria-current={current === item.id ? 'page' : undefined}
          className="mode-tab"
          style={{ backgroundImage: `url(${item.art})` }}
        >
          <span className="mode-tab-label">{item.label}</span>
        </AppLink>
      ))}
    </nav>
  );
}
