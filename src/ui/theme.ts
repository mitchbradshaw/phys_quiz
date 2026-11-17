// Theme colours for canvas and three.js, which cannot use CSS variables directly. Values are re-read when the
// theme changes. Pass an element to read the variables in force there (e.g. inside a .space panel, which keeps
// the dark palette in both themes).
import { useEffect, useMemo, useState, type RefObject } from 'react';
import { useTheme } from '../app/settings';

/** Resolved value of a CSS custom property, e.g. readVar('--m1') -> '#5aa2ff'. */
export function readVar(name: string, el?: Element | null): string {
  if (typeof document === 'undefined') return '#888';
  return getComputedStyle(el ?? document.documentElement).getPropertyValue(name).trim() || '#888';
}

/**
 * Resolved colours for the given CSS variables, e.g.
 *   const c = useThemeColors(['--m1', '--text-3']);  c['--m1'] -> '#5aa2ff'
 */
export function useThemeColors<K extends string>(names: readonly K[], scope?: RefObject<Element>): Record<K, string> {
  const theme = useTheme();
  const key = names.join('|');
  // Recompute after the theme attribute has been applied and the scope element has mounted (next tick).
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setTick((t) => t + 1), 0);
    return () => window.clearTimeout(id);
  }, [theme]);
  return useMemo(
    () => Object.fromEntries(names.map((n) => [n, readVar(n, scope?.current)])) as Record<K, string>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, theme, tick]
  );
}

/** Parse '#rrggbb' / '#rgb' / 'rgb(r, g, b)' to [r, g, b] (0-255). */
export function rgbOf(color: string): [number, number, number] {
  const c = color.trim();
  if (c.startsWith('#')) {
    const h = c.length === 4 ? c.slice(1).split('').map((x) => x + x).join('') : c.slice(1, 7);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseFloat(x));
    return [r, g, b];
  }
  return [128, 128, 128];
}
