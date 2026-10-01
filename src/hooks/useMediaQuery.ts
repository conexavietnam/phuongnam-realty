import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return !useMediaQuery('(min-width: 768px)');
}

export function useIsTablet(): boolean {
  const isMinMd = useMediaQuery('(min-width: 768px)');
  const isMinLg = useMediaQuery('(min-width: 1024px)');
  return isMinMd && !isMinLg;
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
