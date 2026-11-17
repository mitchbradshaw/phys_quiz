// A smooth roller-coaster track through control points (cosine steps between them), and the equation of motion of
// a bead sliding on it under gravity, with optional friction-like drag along the track.

export const SEG = 25; // m between control points

/** Height, slope dh/dx and curvature d²h/dx² of the track at x. Flat beyond both ends. */
export function trackAt(hs: readonly number[], x: number): [number, number, number] {
  const xEnd = SEG * (hs.length - 1);
  if (x <= 0) return [hs[0], 0, 0];
  if (x >= xEnd) return [hs[hs.length - 1], 0, 0];
  const i = Math.min(hs.length - 2, Math.floor(x / SEG));
  const s = (x - i * SEG) / SEG;
  const d = hs[i + 1] - hs[i];
  return [hs[i] + (d * (1 - Math.cos(Math.PI * s))) / 2, (d * Math.PI * Math.sin(Math.PI * s)) / (2 * SEG), (d * Math.PI * Math.PI * Math.cos(Math.PI * s)) / (2 * SEG * SEG)];
}

/**
 * Horizontal acceleration d²x/dt² of a bead on y = h(x) under gravity g: −(g + h''·u²)·h' / (1 + h'²), where
 * u = dx/dt; k (per second) adds a drag proportional to speed.
 */
export function beadAccel(hs: readonly number[], g: number, k: number, x: number, u: number): number {
  const [, h1, h2] = trackAt(hs, x);
  return (-(g + h2 * u * u) * h1) / (1 + h1 * h1) - k * u;
}

/** One RK4 step of (x, u) over time h. */
export function beadStep(hs: readonly number[], g: number, k: number, x: number, u: number, h: number): [number, number] {
  const a1 = beadAccel(hs, g, k, x, u);
  const a2 = beadAccel(hs, g, k, x + 0.5 * h * u, u + 0.5 * h * a1);
  const a3 = beadAccel(hs, g, k, x + 0.5 * h * (u + 0.5 * h * a1), u + 0.5 * h * a2);
  const a4 = beadAccel(hs, g, k, x + h * (u + 0.5 * h * a2), u + h * a3);
  return [x + (h / 6) * (6 * u + h * (a1 + a2 + a3)), u + (h / 6) * (a1 + 2 * a2 + 2 * a3 + a4)];
}

/** Speed along the track from the horizontal speed u at x. */
export const trackSpeed = (hs: readonly number[], x: number, u: number) => Math.abs(u) * Math.sqrt(1 + trackAt(hs, x)[1] ** 2);
