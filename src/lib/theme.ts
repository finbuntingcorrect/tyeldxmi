import type { AppTheme } from './notebook';

export const THEME_OPTIONS: { id: AppTheme; label: string; page: string; accent: string; meta: string }[] = [
  { id: 'blue', label: 'Голубой', page: '#e3f2fb', accent: '#2176c7', meta: '#e3f2fb' },
  { id: 'pink', label: 'Розовый', page: '#fde7f1', accent: '#c73b6f', meta: '#fde7f1' },
  { id: 'yellow', label: 'Жёлтый', page: '#f7f1e7', accent: '#e6a04b', meta: '#f7f1e7' },
  { id: 'dark', label: 'Тёмный', page: '#1c1b19', accent: '#e6a04b', meta: '#1c1b19' },
];

export function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  const option = THEME_OPTIONS.find((item) => item.id === theme);
  if (meta && option) meta.setAttribute('content', option.meta);
}
