// Constant-acceleration motion in a straight line (the "suvat" equations on the formula sheet).
// u = initial velocity, a = acceleration, t = time, v = velocity at time t, s = displacement at time t.

/** v = u + at */
export const velocityAt = (u: number, a: number, t: number) => u + a * t;

/** s = ut + ½at² */
export const displacementAt = (u: number, a: number, t: number) => u * t + 0.5 * a * t * t;

/** v² = u² + 2as, returned as the speed |v| (NaN if the motion never reaches s). */
export const speedAtDisplacement = (u: number, a: number, s: number) => {
  const v2 = u * u + 2 * a * s;
  return v2 < 0 ? NaN : Math.sqrt(v2);
};

/** Left-endpoint "thin slices" estimate of the area under v(t) = u + at from 0 to t, using n slices. */
export function sliceSum(u: number, a: number, t: number, n: number): number {
  const dt = t / n;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += velocityAt(u, a, i * dt) * dt;
  return sum;
}

/** Smallest and largest displacement over [0, T] (for fixing a plot's range). */
export function displacementRange(u: number, a: number, T: number): [number, number] {
  const cands = [0, displacementAt(u, a, T)];
  if (a !== 0) {
    const tTurn = -u / a; // where v = 0
    if (tTurn > 0 && tTurn < T) cands.push(displacementAt(u, a, tTurn));
  }
  return [Math.min(...cands), Math.max(...cands)];
}
