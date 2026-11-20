import { useEffect, useState, type ReactNode } from 'react';
import { pagePath, parseRoute, withSearch } from '../lib/route';
import { RouteContext } from './routeContext';

function readPage() {
  const canonical = pagePath(parseRoute(window.location.pathname));
  if (typeof window !== 'undefined' && window.location.pathname !== canonical) {
    window.history.replaceState(window.history.state, '', canonical + window.location.search);
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
    const next = withSearch(path);
    const here = window.location.pathname + window.location.search;
    if (here === next) {
      if (state !== undefined) window.history.replaceState(state, '', next);
      setPage(parseRoute(window.location.pathname));
      return;
    }
    window.history.pushState(state ?? {}, '', next);
    setPage(parseRoute(new URL(next, window.location.origin).pathname));
  }

  function replace(path: string) {
    const next = withSearch(path);
    const here = window.location.pathname + window.location.search;
    if (here === next) return;
    window.history.replaceState(window.history.state, '', next);
    setPage(parseRoute(new URL(next, window.location.origin).pathname));
  }

  return <RouteContext.Provider value={{ page, go, replace }}>{children}</RouteContext.Provider>;
}
