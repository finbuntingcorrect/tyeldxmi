import { createContext, useContext } from 'react';
import type { AppPage } from '../lib/route';

export type RouteValue = {
  page: AppPage;
  go: (path: string, state?: unknown) => void;
};

export const RouteContext = createContext<RouteValue | null>(null);

export function useRoute() {
  const route = useContext(RouteContext);
  if (!route) throw new Error('Маршрут недоступен');
  return route;
}
