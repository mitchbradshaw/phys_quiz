// Black-hole physics in units of the Schwarzschild radius r_s = 2GM/c² (so r_s = 1).
import { c, G } from './constants';

export const MSUN = 1.99e30;
export const schwarzschild = (M: number) => (2 * G * M) / (c * c);
/** Critical impact parameter: rays aimed closer than this fall in (the shadow's radius), in r_s. */
export const B_CRIT = (3 * Math.sqrt(3)) / 2;

export interface Ray {
  pts: [number, number][];
  fate: 'in' | 'out';
  /** Angle swept around the hole, radians (a straight line sweeps π). */
  sweep: number;
}

/**
 * Light ray from far to the left, heading right at height b (in r_s). Integrates the exact orbit equation for light
 * in Schwarzschild space-time, u'' + u = (3/2) u² with u = r_s / r, by RK4 in the swept angle.
 */
export function traceRay(b: number, rStart = 30, rStop = 45, h = 0.004, maxSweep = 10 * Math.PI): Ray {
  const sgn = b < 0 ? -1 : 1;
  const B = Math.max(1e-6, Math.abs(b));
  const r0 = Math.max(rStart, B * 1.05);
  const phi0 = Math.atan2(B, -Math.sqrt(r0 * r0 - B * B));
  let u = 1 / r0;
  let w = Math.sqrt(Math.max(0, 1 / (B * B) - u * u + u * u * u)); // du/ds, from the exact first integral
  let s = 0;
  const f = (uu: number) => -uu + 1.5 * uu * uu;
  const pts: [number, number][] = [];
  const push = () => {
    const phi = phi0 - s;
    pts.push([Math.cos(phi) / u, (sgn * Math.sin(phi)) / u]);
  };
  push();
  let fate: 'in' | 'out' = 'out';
  let n = 0;
  while (s < maxSweep) {
    const k1u = w;
    const k1w = f(u);
    const k2u = w + 0.5 * h * k1w;
    const k2w = f(u + 0.5 * h * k1u);
    const k3u = w + 0.5 * h * k2w;
    const k3w = f(u + 0.5 * h * k2u);
    const k4u = w + h * k3w;
    const k4w = f(u + h * k3u);
    u += (h / 6) * (k1u + 2 * k2u + 2 * k3u + k4u);
    w += (h / 6) * (k1w + 2 * k2w + 2 * k3w + k4w);
    s += h;
    if (++n % 3 === 0) push();
    if (u >= 1) {
      fate = 'in';
      u = 1;
      push();
      break;
    }
    if (u <= 1 / rStop && w < 0) {
      push();
      break;
    }
  }
  return { pts, fate, sweep: s };
}

/** Average density inside the horizon (kg/m³): falls as 1/M². */
export const meanDensity = (M: number) => M / ((4 / 3) * Math.PI * schwarzschild(M) ** 3);
