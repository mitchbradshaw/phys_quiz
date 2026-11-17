import { isTrue, near, test } from './harness';
import { B_CRIT, meanDensity, MSUN, schwarzschild, traceRay } from '../src/physics/blackhole';

test('black hole: r_s of the Sun is about 2.95 km', () => {
  near(schwarzschild(MSUN), 2950, 5e-3, 'r_s');
});

test('black hole: rays inside the critical impact parameter fall in, outside escape', () => {
  isTrue(traceRay(B_CRIT - 0.02).fate === 'in', 'just inside falls in');
  isTrue(traceRay(B_CRIT + 0.02).fate === 'out', 'just outside escapes');
  isTrue(traceRay(1.5).fate === 'in', 'b = 1.5 falls in');
});

test('black hole: weak deflection matches 2 r_s / b far away', () => {
  const b = 400;
  const r = traceRay(b, 20000, 30000, 0.0005, 4);
  // a straight line between these finite distances sweeps a little less than π
  const straight = Math.PI - Math.asin(b / 20000) - Math.asin(b / 30000);
  const deflection = r.sweep - straight;
  near(deflection, 2 / b, 0.05, 'deflection');
});

test('black hole: mean density of a Sun-mass hole ≈ 1.8e19 kg/m³', () => {
  near(meanDensity(MSUN), 1.84e19, 0.02, 'density');
});
