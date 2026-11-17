// The only thing the site remembers: dark or light theme (dark by default). Stored per browser; if storage is
// blocked the choice simply lasts until the page is closed.
import { useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'apples.theme';
const subs = new Set<() => void>();

function read(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

let theme: Theme = read();

export function setTheme(t: Theme) {
  theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* storage blocked: keep it for this visit only */
  }
  if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  subs.forEach((f) => f());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => theme
  );
}
