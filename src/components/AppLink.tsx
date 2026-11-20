import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { useRoute } from '../hooks/routeContext';

type AppLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  state?: unknown;
};

export function AppLink({ href, state, onClick, ...props }: AppLinkProps) {
  const { go } = useRoute();

  function click(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    go(href, state);
  }

  return <a href={href} onClick={click} {...props} />;
}
