import { isTrue, near, test } from './harness';
import { beadStep, trackAt, trackSpeed } from '../src/physics/track';

const HS = [30, 0, 20, 0, 26, 50];
const g = 9.8;

test('energy track: no friction, energy is conserved for 30 s', () => {
  let x = 3;
  let u = 0;
  const e = () => 0.5 * trackSpeed(HS, x, u) ** 2 + g * trackAt(HS, x)[0];
  const e0 = e();
  let worst = 0;
  for (let i = 0; i < 30 / 0.004; i++) {
    [x, u] = beadStep(HS, g, 0, x, u, 0.004);
    worst = Math.max(worst, Math.abs(e() - e0) / e0);
  }
  isTrue(worst < 1e-4, `energy drift ${worst}`);
});

test('energy track: speed in the first valley is √(2g × drop)', () => {
  let x = 3;
  let u = 0;
  const h0 = trackAt(HS, 3)[0];
  while (x < 25) [x, u] = beadStep(HS, g, 0, x, u, 0.001);
  near(trackSpeed(HS, x, u), Math.sqrt(2 * g * (h0 - trackAt(HS, x)[0])), 1e-3, 'valley speed');
});

test('energy track: with friction, energy only ever drains', () => {
  let x = 3;
  let u = 0;
  const e = () => 0.5 * trackSpeed(HS, x, u) ** 2 + g * trackAt(HS, x)[0];
  let prev = e();
  let rises = 0;
  for (let i = 0; i < 20 / 0.004; i++) {
    [x, u] = beadStep(HS, g, 0.08, x, u, 0.004);
    const now = e();
    if (now > prev + 1e-9) rises++;
    prev = now;
  }
  isTrue(rises === 0, `energy rose ${rises} times`);
});
