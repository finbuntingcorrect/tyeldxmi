import { useEffect, useState, type ReactNode } from 'react';
import { pagePath, parseRoute } from '../lib/route';
import { RouteContext } from './routeContext';

function readPage() {
  const canonical = pagePath(parseRoute(window.location.pathname));
  if (typeof window !== 'undefined' && window.location.pathname !== canonical) {
    window.history.replaceState(window.history.state, '', canonical);
  }
  return parseRoute(canonical);
}

export function RouteProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState(readPage);

  useEffect(() => {
    const onPop = () => setPage(readPage());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function go(path: string, state?: unknown) {
    const next = pagePath(parseRoute(path));
    if (window.location.pathname === next) {
      if (state !== undefined) window.history.replaceState(state, '', next);
      setPage(parseRoute(next));
      return;
    }
    window.history.pushState(state ?? {}, '', next);
    setPage(parseRoute(next));
  }

  return <RouteContext.Provider value={{ page, go }}>{children}</RouteContext.Provider>;
}
