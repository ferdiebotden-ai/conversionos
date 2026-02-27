'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * SSR-safe media query hook.
 * Returns false during SSR (server snapshot), then syncs with the actual
 * viewport via window.matchMedia. Uses useSyncExternalStore for correct
 * concurrent-mode behaviour.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = useCallback(() => {
    return false;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
