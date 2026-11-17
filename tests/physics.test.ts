import { isTrue, near, test } from './harness';
import { EARTH, G, MOON } from '../src/physics/constants';
import { displacementAt, displacementRange, sliceSum, speedAtDisplacement, velocityAt } from '../src/physics/kinematics';
import { circularSpeed, escapeSpeed, fieldAt, grazingSpeed, impactAngle, integrateLaunch, oppositeApsis, orbitPeriod } from '../src/physics/gravity';

test('suvat: v = u + at, s = ut + ½at², v² = u² + 2as agree', () => {
  const [u, a, t] = [4, 2, 6];
  near(velocityAt(u, a, t), 16, 1e-12);
  near(displacementAt(u, a, t), 60, 1e-12);
  near(speedAtDisplacement(u, a, displacementAt(u, a, t)), 16, 1e-12);
});

test('thin slices converge to the exact area under v(t)', () => {
  const exact = displacementAt(3, 1.5, 8);
  isTrue(Math.abs(sliceSum(3, 1.5, 8, 4) - exact) > Math.abs(sliceSum(3, 1.5, 8, 40) - exact), 'more slices is closer');
  near(sliceSum(3, 1.5, 8, 4000), exact, 1e-3);
});

test('displacement range includes the turning point', () => {
  const [lo, hi] = displacementRange(15, -3, 10);
  near(hi, 37.5, 1e-12); // stops at t = 5 s, s = 37.5 m
  near(lo, 0, 1e-12);
});

test('Earth surface gravity from g = GM/r² is about 9.8 m/s²', () => {
  near(fieldAt(EARTH.M, EARTH.R), 9.8, 0.01);
});

test('gravity at the ISS (400 km) is about 89 % of the surface value', () => {
  near(fieldAt(EARTH.M, EARTH.R + 4e5) / fieldAt(EARTH.M, EARTH.R), 0.886, 0.005);
});

test('low Earth orbit speed ≈ 7.9 km/s, escape ≈ 11.2 km/s, ratio √2', () => {
  near(circularSpeed(EARTH.M, EARTH.R), 7.9e3, 0.01);
  near(escapeSpeed(EARTH.M, EARTH.R), 11.2e3, 0.01);
  near(escapeSpeed(EARTH.M, 7e6) / circularSpeed(EARTH.M, 7e6), Math.SQRT2, 1e-12);
});

test("Kepler's third law: the Moon's period is about 27.3 days (with Earth + Moon mass)", () => {
  const T = 2 * Math.PI * Math.sqrt(3.844e8 ** 3 / (G * (EARTH.M + MOON.M)));
  near(T / 86400, 27.3, 0.01);
  near(orbitPeriod(EARTH.M, 3.844e8) / 86400, 27.5, 0.01);
});

test('cannon: circular-speed launch closes one lap at the Kepler period', () => {
  const r0 = EARTH.R + 6e5;
  const v = circularSpeed(EARTH.M, r0);
  const tr = integrateLaunch(EARTH.M, EARTH.R, 0, r0, v, 0, 20 * EARTH.R);
  isTrue(tr.outcome === 'orbit', `outcome ${tr.outcome}`);
  near(tr.period ?? 0, orbitPeriod(EARTH.M, r0), 0.002);
  near(tr.rMax, r0, 0.001);
});

test('cannon: numerical landing point matches the orbit equation', () => {
  const r0 = EARTH.R + 8e5;
  for (const frac of [0.3, 0.7, 0.9, 0.95]) {
    const v = frac * circularSpeed(EARTH.M, r0);
    const tr = integrateLaunch(EARTH.M, EARTH.R, 0, r0, v, 0, 20 * EARTH.R);
    isTrue(tr.outcome === 'impact', `outcome ${tr.outcome} at ${frac}`);
    near(tr.angle ?? 0, impactAngle(EARTH.M, EARTH.R, r0, v) ?? NaN, 0.002, `angle at ${frac}`);
  }
});

test('cannon: grazing speed is the boundary between landing and orbiting', () => {
  const r0 = EARTH.R + 8e5;
  const vg = grazingSpeed(EARTH.M, EARTH.R, r0);
  near(oppositeApsis(EARTH.M, r0, vg), EARTH.R, 1e-9);
  isTrue(impactAngle(EARTH.M, EARTH.R, r0, vg * 0.999) !== null, 'just below lands');
  isTrue(impactAngle(EARTH.M, EARTH.R, r0, vg * 1.001) === null, 'just above misses');
  isTrue(integrateLaunch(EARTH.M, EARTH.R, 0, r0, vg * 1.01, 0, 20 * EARTH.R).outcome === 'orbit', 'numerical orbit above grazing');
});

test('cannon: above escape speed it leaves', () => {
  const r0 = EARTH.R + 8e5;
  const tr = integrateLaunch(EARTH.M, EARTH.R, 0, r0, 1.5 * circularSpeed(EARTH.M, r0), 0, 6 * EARTH.R);
  isTrue(tr.outcome === 'escape', `outcome ${tr.outcome}`);
});
