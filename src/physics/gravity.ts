// Newtonian gravity around one big body (planet or star) that stays put. SI units throughout.
import { G } from './constants';

/** Gravitational field strength g = GM/r² (m s⁻²). */
export const fieldAt = (M: number, r: number) => (G * M) / (r * r);

/** Speed for a circular orbit at radius r: v = √(GM/r). */
export const circularSpeed = (M: number, r: number) => Math.sqrt((G * M) / r);

/** Escape speed from radius r: v = √(2GM/r). */
export const escapeSpeed = (M: number, r: number) => Math.sqrt((2 * G * M) / r);

/** Period of an orbit with semi-major axis a (Kepler's third law): T = 2π√(a³/GM). */
export const orbitPeriod = (M: number, a: number) => 2 * Math.PI * Math.sqrt((a * a * a) / (G * M));

/** Launched horizontally at radius r0 with speed v: the radius of the opposite end of the orbit (∞ if it escapes). */
export function oppositeApsis(M: number, r0: number, v: number): number {
  const d = (2 * G * M) / (r0 * v * v) - 1;
  return d <= 0 ? Infinity : r0 / d;
}

/** The slowest horizontal launch from r0 that misses a planet of radius R (it just skims the far side). */
export const grazingSpeed = (M: number, R: number, r0: number) => Math.sqrt((2 * G * M * R) / (r0 * (r0 + R)));

/**
 * Launched horizontally at radius r0 with speed v (below circular speed, so r0 is the high point of the orbit):
 * the angle travelled round the planet before hitting the surface at radius R, in radians, or null if it misses.
 * From the orbit equation r(θ) = p / (1 − e cos θ), with p = (r0 v)²/GM and e = 1 − p/r0.
 */
export function impactAngle(M: number, R: number, r0: number, v: number): number | null {
  const mu = G * M;
  const p = (r0 * v) ** 2 / mu;
  if (p >= r0) return null; // at or above circular speed: never comes lower than r0
  const e = 1 - p / r0;
  if (p / (1 + e) >= R) return null; // the low point clears the ground
  const cos = (1 - p / R) / e;
  return Math.acos(Math.max(-1, Math.min(1, cos)));
}

export interface Trajectory {
  /** Positions (m), velocities (m s⁻¹) and times (s), one entry per step. */
  x: Float64Array;
  y: Float64Array;
  vx: Float64Array;
  vy: Float64Array;
  t: Float64Array;
  n: number;
  outcome: 'impact' | 'orbit' | 'escape';
  /** For 'orbit': the time for one lap (s). */
  period?: number;
  /** For 'impact': angle travelled round the planet (rad). */
  angle?: number;
  /** Largest distance from the centre reached (m). */
  rMax: number;
  /** Total energy per kilogram is negative: it would come back eventually, even if it left the region. */
  bound: boolean;
}

/**
 * Integrates a launch from (x0, y0) with velocity (vx0, vy0) around a fixed body of mass M and radius R
 * (velocity Verlet; each step is a fixed fraction of the local orbital time, so close passes get small steps).
 * Stops at the surface ('impact'), after one full lap ('orbit'), or beyond rStop ('escape': check `bound` to tell
 * a true escape from a long loop that leaves the region).
 */
export function integrateLaunch(M: number, R: number, x0: number, y0: number, vx0: number, vy0: number, rStop: number, maxSteps = 200000): Trajectory {
  const mu = G * M;
  const r0 = Math.hypot(x0, y0);
  const eta = (2 * Math.PI) / 4000; // 4000 steps per circular lap
  const bound = 0.5 * (vx0 * vx0 + vy0 * vy0) - mu / r0 < 0;
  const xs: number[] = [x0];
  const ys: number[] = [y0];
  const vxs: number[] = [vx0];
  const vys: number[] = [vy0];
  const ts: number[] = [0];
  let x = x0;
  let y = y0;
  let vx = vx0;
  let vy = vy0;
  let t = 0;
  const acc = (px: number, py: number) => {
    const r2 = px * px + py * py;
    const k = -mu / (r2 * Math.sqrt(r2));
    return [k * px, k * py];
  };
  let [ax, ay] = acc(x, y);
  const theta0 = Math.atan2(y0, x0);
  let swept = 0;
  let prevTheta = theta0;
  let outcome: Trajectory['outcome'] = 'escape';
  let period: number | undefined;
  let rMax = r0;
  for (let i = 0; i < maxSteps; i++) {
    const rNow = Math.hypot(x, y);
    const dt = eta * Math.sqrt((rNow * rNow * rNow) / mu);
    vx += 0.5 * dt * ax;
    vy += 0.5 * dt * ay;
    const nx = x + dt * vx;
    const ny = y + dt * vy;
    [ax, ay] = acc(nx, ny);
    vx += 0.5 * dt * ax;
    vy += 0.5 * dt * ay;
    const r = Math.hypot(nx, ny);
    if (r <= R) {
      // Interpolate to the surface so the landing point is exact.
      const rPrev = Math.hypot(x, y);
      const f = (rPrev - R) / (rPrev - r);
      x += (nx - x) * f;
      y += (ny - y) * f;
      t += dt * f;
      xs.push(x);
      ys.push(y);
      vxs.push(vx);
      vys.push(vy);
      ts.push(t);
      outcome = 'impact';
      break;
    }
    x = nx;
    y = ny;
    t += dt;
    rMax = Math.max(rMax, r);
    const th = Math.atan2(y, x);
    let d = th - prevTheta;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    swept += d;
    prevTheta = th;
    xs.push(x);
    ys.push(y);
    vxs.push(vx);
    vys.push(vy);
    ts.push(t);
    if (Math.abs(swept) >= 2 * Math.PI) {
      outcome = 'orbit';
      period = t;
      break;
    }
    if (r > rStop) {
      outcome = 'escape';
      break;
    }
  }
  const n = xs.length;
  const angle = outcome === 'impact' ? Math.abs(swept) : undefined;
  return {
    x: Float64Array.from(xs),
    y: Float64Array.from(ys),
    vx: Float64Array.from(vxs),
    vy: Float64Array.from(vys),
    t: Float64Array.from(ts),
    n,
    outcome,
    period,
    angle,
    rMax,
    bound,
  };
}

/** Index of the last sample with time ≤ t (binary search), for playing a trajectory back at any speed. */
export function sampleIndexAt(ts: Float64Array, t: number): number {
  let lo = 0;
  let hi = ts.length - 1;
  if (t >= ts[hi]) return hi;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ts[mid] <= t) lo = mid;
    else hi = mid;
  }
  return lo;
}
