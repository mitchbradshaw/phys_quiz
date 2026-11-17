// Hash routes: #/ (home), #/<level>, #/<level>/<block>.
import { useEffect, useState } from 'react';

export interface Route {
  level: string | null;
  block: string | null;
}

export function parseHash(h: string): Route {
  const parts = h.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { level: parts[0] ?? null, block: parts[1] ?? null };
}

export function useRoute(): Route {
  const [r, setR] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setR(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

export const href = (...parts: string[]) => `#/${parts.map(encodeURIComponent).join('/')}`;
