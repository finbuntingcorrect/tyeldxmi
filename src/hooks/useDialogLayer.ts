import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusable(node: HTMLElement) {
  return [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((item) => !item.hasAttribute('disabled') && item.tabIndex !== -1);
}

export function useDialogLayer(
  active: boolean,
  onClose: () => void,
  opener?: { current: HTMLElement | null },
) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!active) return;
    const returnTo = opener?.current ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const node = panelRef.current;
    const preferred = node?.querySelector<HTMLElement>('[autofocus]') ?? (node ? focusable(node)[0] : undefined);
    preferred?.focus();

    function onKey(event: KeyboardEvent) {
      if (!node) return;
      const dialogs = [...document.querySelectorAll('[role="dialog"]')];
      if (dialogs.at(-1) !== node) return;
      if (event.key === 'Escape') {
        if (event.defaultPrevented) return;
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable(node);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (!(current instanceof Node) || !node.contains(current)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (returnTo?.isConnected) returnTo.focus();
    };
  }, [active, opener]);

  return panelRef;
}
