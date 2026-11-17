// One colour per kind of quantity, everywhere on the site, matching the TeX macros in Rich.tsx:
//   velocity and speed          blue    \qv   Q.v
//   force and acceleration      orange  \qa   Q.F, Q.a
//   mass                        green   \qm   Q.m
//   time                        purple  \qt   Q.t
//   distance, position, size    gold    \qs   Q.s
//   energy, momentum, the rest  pink    \qe   Q.E
// Constants (G, c, π) and angles stay in the normal text colour. Paths and trails are a neutral near-white so they
// never read as a quantity.
export const Q = {
  v: 'var(--m1)',
  F: 'var(--m2)',
  a: 'var(--m2)',
  m: 'var(--m3)',
  t: 'var(--m4)',
  s: 'var(--m5)',
  E: 'var(--m6)',
} as const;

export const TRAIL = '#dfe6f0';
