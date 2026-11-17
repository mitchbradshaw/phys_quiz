// Medium 5: Gravity assists. A flyby, computed exactly as a hyperbola in the planet's frame (speed in = speed out,
// only the direction turns), then seen from the Sun by adding the planet's own velocity. Passing behind the planet
// gains speed; in front loses it. The velocity diagram shows why: all possible exits lie on one circle.
// Colours: velocities blue (the planet's dashed), distances gold.
import { useMemo, useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { Challenge, Formula, Formulas, num, WhatIfs } from '../../ui/blockkit';
import { Q, TRAIL } from '../../ui/colors';
import { Button, Readout, Readouts, Segmented, SimLayout, Slider } from '../../ui/kit';
import { SpacePanel, Vec } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const PLANETS = [
  { id: 'jupiter', name: 'Jupiter', U: 13.1, mu: 1.267e17, R: 7.149e7, col: '#d9a066' },
  { id: 'saturn', name: 'Saturn', U: 9.7, mu: 3.793e16, R: 6.027e7, col: '#e3cf8f' },
  { id: 'venus', name: 'Venus', U: 35.0, mu: 3.249e14, R: 6.052e6, col: '#e8c27a' },
] as const;
type PlanetId = (typeof PLANETS)[number]['id'];
type Side = 'behind' | 'front';
const W = 560;
const H = 360;
const VD = { x: 400, y: 262 }; // velocity diagram origin

interface Fly {
  ts: number[];
  px: number[]; // planet-frame positions (m)
  py: number[];
  vin: [number, number]; // planet frame, km/s
  vout: [number, number];
  delta: number;
}

/** Hyperbolic flyby in the planet frame. dirDeg: direction of the incoming relative velocity; turn: ±1. */
function flyby(mu: number, vinf: number, rp: number, dirDeg: number, turn: 1 | -1): Fly {
  const v = vinf * 1000;
  const a = mu / (v * v);
  const e = 1 + rp / a;
  const delta = 2 * Math.asin(1 / e);
  const n = Math.sqrt(mu / a ** 3);
  const sq = Math.sqrt(e * e - 1);
  const alphaIn = Math.atan2(sq, 1); // incoming direction in the perifocal frame
  const rot = (dirDeg * Math.PI) / 180 - turn * alphaIn;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const ts: number[] = [];
  const px: number[] = [];
  const py: number[] = [];
  const Hmax = Math.acosh(((60 * rp) / a + 1) / e); // out to 60 closest-approach distances
  for (let i = 0; i <= 300; i++) {
    const Hh = -Hmax + (2 * Hmax * i) / 300;
    const x = a * (e - Math.cosh(Hh));
    const y = turn * a * sq * Math.sinh(Hh);
    ts.push((e * Math.sinh(Hh) - Hh) / n);
    px.push(x * c - y * s);
    py.push(x * s + y * c);
  }
  const ang = (dirDeg * Math.PI) / 180;
  const out = ang + turn * delta;
  return { ts, px, py, vin: [vinf * Math.cos(ang), vinf * Math.sin(ang)], vout: [vinf * Math.cos(out), vinf * Math.sin(out)], delta };
}

function AssistSim() {
  const [pid, setPid] = useState<PlanetId>('jupiter');
  const [vinf, setVinf] = useState(8);
  const [dir, setDir] = useState(90);
  const [rpR, setRpR] = useState(4); // closest approach, planet radii
  const [side, setSide] = useState<Side>('behind');
  const [f, setF] = useState(0); // animation progress 0..1
  const [playing, setPlaying] = useState(true);
  const visRef = useRef<HTMLDivElement>(null);
  const pl = PLANETS.find((p) => p.id === pid) ?? PLANETS[0];
  useRaf(
    (dt) =>
      setF((c) => {
        const nf = c + dt / 6;
        if (nf >= 1) {
          setPlaying(false);
          return 1;
        }
        return nf;
      }),
    playing,
    visRef
  );

  // which turning sense is "behind" (gains speed) depends on the geometry: pick the one that gains
  const fly = useMemo(() => {
    const a = flyby(pl.mu, vinf, rpR * pl.R, dir, 1);
    const b = flyby(pl.mu, vinf, rpR * pl.R, dir, -1);
    const sp = (fl: Fly) => Math.hypot(fl.vout[0] + pl.U, fl.vout[1]);
    const gainer = sp(a) >= sp(b) ? a : b;
    const loser = gainer === a ? b : a;
    return side === 'behind' ? gainer : loser;
  }, [pl, vinf, rpR, dir, side]);

  const vIn: [number, number] = [fly.vin[0] + pl.U, fly.vin[1]];
  const vOut: [number, number] = [fly.vout[0] + pl.U, fly.vout[1]];
  const sIn = Math.hypot(...vIn);
  const sOut = Math.hypot(...vOut);
  const gain = sOut - sIn;

  // Sun-frame path: planet-frame position + planet motion
  const t0 = fly.ts[0];
  const t1 = fly.ts[fly.ts.length - 1];
  const U = pl.U * 1000;
  const xs = fly.px.map((x, i) => x + U * (fly.ts[i] - t0));
  const ys = fly.py;
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, U * (t1 - t0));
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const k = Math.min(520 / (maxX - minX), 105 / Math.max(maxY - minY, 1));
  const ox = 20 - minX * k;
  const oy = 42 + maxY * k;
  const S = (x: number, y: number) => ({ x: ox + x * k, y: oy - y * k });
  const tNow = t0 + f * (t1 - t0);
  let idx = 0;
  while (idx < fly.ts.length - 1 && fly.ts[idx + 1] < tNow) idx++;
  const planetNow = S(U * (tNow - t0), 0);
  const craftNow = S(fly.px[idx] + U * (fly.ts[idx] - t0), fly.py[idx]);
  let path = '';
  for (let i = 0; i <= idx; i++) {
    const p = S(xs[i], ys[i]);
    path += `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }
  let fullPath = '';
  xs.forEach((x, i) => {
    const p = S(x, ys[i]);
    fullPath += `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  });
  const days = (t1 - t0) / 86400;
  const big = gain >= 10 && pid === 'jupiter';

  const vk = 88 / (pl.U + vinf); // px per km/s in the velocity diagram
  const vd = (v: [number, number]) => ({ x: VD.x + v[0] * vk, y: VD.y - v[1] * vk });
  const uTip = vd([pl.U, 0]);

  const visual = (
    <div ref={visRef}>
      <SpacePanel w={W} h={H} ariaLabel={`Flyby of ${pl.name}: speed ${sIn.toFixed(1)} km/s in, ${sOut.toFixed(1)} km/s out.`} tags={[`Seen from the Sun · ${num(days, 0)} days`, 'Planet not to scale']} tagsAt="tl" stars={80}>
        <path d={fullPath} fill="none" stroke={TRAIL} strokeOpacity={0.18} strokeDasharray="3 4" />
        <path d={path} fill="none" stroke={TRAIL} strokeWidth={2} />
        <line x1={S(0, 0).x} x2={S(U * (t1 - t0), 0).x} y1={S(0, 0).y} y2={S(0, 0).y} stroke={pl.col} strokeOpacity={0.35} strokeDasharray="6 5" />
        <circle cx={planetNow.x} cy={planetNow.y} r={9} fill={pl.col} />
        <text x={planetNow.x} y={planetNow.y + 22} textAnchor="middle" className="plot-note" fill="var(--text-2)">
          {pl.name} →
        </text>
        <circle cx={craftNow.x} cy={craftNow.y} r={4.5} fill="#7fd4ff" stroke="#fff" />
        {/* velocity diagram */}
        <rect x={VD.x - 150} y={162} width={300} height={194} rx={8} fill="rgba(5,7,11,0.7)" stroke="rgba(255,255,255,0.12)" />
        <text x={VD.x - 140} y={180} className="plot-note" fill="var(--text-2)" fontWeight={700}>
          Velocities (relative to the Sun)
        </text>
        <circle cx={uTip.x} cy={uTip.y} r={vinf * vk} fill="none" stroke={Q.v} strokeOpacity={0.3} strokeDasharray="2 3" />
        <Vec x1={VD.x} y1={VD.y} x2={uTip.x} y2={uTip.y} color={pl.col} width={2} head={7} dash="5 3" />
        <Vec x1={uTip.x} y1={uTip.y} x2={vd(vIn).x} y2={vd(vIn).y} color={Q.v} width={1.6} head={6} opacity={0.6} />
        <Vec x1={uTip.x} y1={uTip.y} x2={vd(vOut).x} y2={vd(vOut).y} color={Q.v} width={1.6} head={6} opacity={0.6} />
        <Vec x1={VD.x} y1={VD.y} x2={vd(vIn).x} y2={vd(vIn).y} color={Q.v} width={2.4} head={8} label="in" />
        <Vec x1={VD.x} y1={VD.y} x2={vd(vOut).x} y2={vd(vOut).y} color={Q.v} width={3.4} head={10} label="out" />
        <text x={VD.x - 140} y={340} className="plot-note" fill="var(--text-3)">
          dashed: {pl.name}'s velocity · circle: every exit the flyby allows
        </text>
      </SpacePanel>
    </div>
  );

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setF(0);
    setPlaying(true);
  };

  const controls = (
    <>
      <div className="ctl-group">
        <Segmented<PlanetId> size="sm" label="Planet" value={pid} onChange={reset(setPid)} options={PLANETS.map((p) => ({ value: p.id, label: p.name, title: `${p.U} km/s around the Sun` }))} />
        <Slider label="arrival speed, relative to the planet" tex="\qv{v_\infty}" tip="your speed as seen by the planet, long before you get close" value={vinf} min={2} max={20} step={0.1} unit="km/s" onChange={reset(setVinf)} />
        <Slider label="arrival direction" tip={`direction of your approach as seen by the planet: 0° = the way ${pl.name} moves, 180° = head-on`} value={dir} min={0} max={360} step={1} unit="°" onChange={reset(setDir)} />
        <Slider label="closest approach" tex="\qs{r_p}" tip="in planet radii, from the planet's centre" value={rpR} min={1.1} max={30} step={0.1} format={(v) => `${v.toFixed(1)} radii`} onChange={reset(setRpR)} />
        <Segmented<Side>
          size="sm"
          label="Pass on which side"
          value={side}
          onChange={reset(setSide)}
          options={[
            { value: 'behind', label: 'behind the planet' },
            { value: 'front', label: 'in front of it' },
          ]}
        />
        <Button size="sm" variant="primary" onClick={() => { setF(0); setPlaying(true); }}>
          Fly by again
        </Button>
      </div>
      <div className="ctl-group">
        <Readouts>
          <Readout label="speed before" tip="relative to the Sun" value={sIn} unit="km/s" sig={3} />
          <Readout label="speed after" tip="relative to the Sun" value={sOut} unit="km/s" sig={3} />
          <Readout label="gained" value={gain} unit="km/s" sig={3} tone={gain > 0 ? 'ok' : 'bad'} />
          <Readout label="turned by" tip="deflection, seen by the planet" value={(fly.delta * 180) / Math.PI} unit="°" sig={3} />
        </Readouts>
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="Seen by the planet: nothing gained"
          tex="|\qv{\vec v'_{\text{out}}}| = |\qv{\vec v'_{\text{in}}}| \qquad \qv{\vec v} = \qv{\vec U} + \qv{\vec v'}"
          say="In the planet's own frame, the spacecraft falls in and climbs back out: the same speed leaving as arriving, only the direction is turned. Seen from the Sun, add the planet's velocity $\vec U$ to both. Turning an arrow, then adding $\vec U$, can make it longer or shorter."
          where={[
            ["\\qv{\\vec v'}", 'velocity relative to the planet (the primes mean "as the planet sees it")'],
            ['\\qv{\\vec U}', "the planet's velocity around the Sun"],
            ['\\qv{\\vec v}', 'velocity relative to the Sun'],
          ]}
          live={`|\\qv{\\vec v'}| = \\qv{${num(vinf, 1)}}\\ \\text{km/s both ways;}\\quad |\\qv{\\vec v}|: \\qv{${num(sIn, 1)}} \\to \\qv{${num(sOut, 1)}}\\ \\text{km/s}`}
        />
        <Formula
          title="How sharply it turns"
          tex="\sin\frac{\delta}{2} = \frac{1}{1 + \qs{r_p}\,\qv{v_\infty}^{2}/(G\qm{M})}"
          say="Closer passes and heavier planets turn the path more; faster arrivals get turned less. The turn can never quite reach 180°."
          where={[
            ['\\delta', 'the angle the path is turned through'],
            ['\\qs{r_p}', 'closest distance to the planet’s centre'],
            ['\\qv{v_\\infty}', 'arrival speed relative to the planet'],
            ['G\\qm{M}', "the planet's mass times G"],
          ]}
          live={`\\delta = \\qs{${num((fly.delta * 180) / Math.PI, 1)}}^{\\circ}`}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="ga-side"
          question="You pass **in front** of the planet instead of behind it. What happens to your speed relative to the Sun?"
          options={['It drops: the planet slows you down', 'It still rises, just less', 'It stays the same', 'You get captured into orbit']}
          answer={0}
          explain="Passing in front, the planet's pull turns you against its own direction of motion, and you lose speed. That's useful too: missions to Mercury (MESSENGER, BepiColombo) used repeated flybys of Earth, Venus and Mercury to *brake*, falling deeper towards the Sun without the fuel it would otherwise take."
          tryIt="arrival direction 90°, then switch to 'in front of it'."
          onApply={() => {
            setDir(90);
            setSide('front');
            setF(0);
            setPlaying(true);
          }}
        />
        <WhatIf
          id="ga-pays"
          question="The spacecraft leaves Jupiter several km/s faster. Where did that energy come from?"
          options={["Jupiter: it slows down, by an amount far too small to ever measure", 'Nowhere: energy is created by the flyby', "The spacecraft's engines", 'The Sun']}
          answer={0}
          explain="Momentum is shared: whatever the spacecraft gains, Jupiter loses. But Jupiter is about $10^{24}$ times heavier than a spacecraft, so its speed changes by about $10^{-24}$ of the spacecraft's gain. Voyager's flyby nudged Jupiter's orbit by far less than the width of an atom per year."
        />
        <WhatIf
          id="ga-close"
          question="Fly much closer to the planet (same arrival). What happens to the turn?"
          options={['It gets sharper, so the gain can get bigger', 'It gets gentler', 'No change: only the speed matters', 'You always crash']}
          answer={0}
          explain="Closer in, gravity is stronger and acts for longer, so the path bends more. The best possible gain is about twice the planet's speed, if the path could be turned right round. Real flybys skim within a few planet radii, which is why mission planners care about Jupiter's radiation belts."
          tryIt="slide the closest approach down towards 1.5 radii."
          onApply={() => {
            setRpR(1.5);
            setF(0);
            setPlaying(true);
          }}
        />
        <Challenge
          goal="Using **Jupiter**, leave with at least **10 km/s more** speed (relative to the Sun) than you arrived with."
          done={big}
          hint="Pass behind it, fairly close. Then try different arrival directions: on the velocity diagram, you want the 'out' arrow to end up as long as possible."
          success={`+${num(gain, 1)} km/s for no fuel at all. Voyager 2 used Jupiter, Saturn, Uranus and Neptune in turn: a "Grand Tour" made possible by a planetary line-up that happens about once every 175 years.`}
        />
      </WhatIfs>
    </>
  );
}

export const gravityAssist: BlockDef = {
  id: 'gravity-assist',
  title: 'Gravity assists',
  hook: 'How does a spacecraft steal speed from a planet, and who pays for it?',
  explain: `Seen from the planet, a flyby gains nothing. The spacecraft falls in, speeding up, swings round, and climbs back out, slowing down: it leaves exactly as fast as it arrived, just pointing somewhere else. Like a ball bouncing off a wall.

But the planet is moving around the Sun, and from the Sun's point of view that changes everything. Bounce a ball off the front of an oncoming train and it comes back faster. Pass **behind** a planet and its gravity drags you along with it: you leave faster, relative to the Sun. Pass **in front** and you leave slower. The planet pays, or gains, the difference, but it is so heavy that the change can never be measured.`,
  Sim: AssistSim,
  maths: [
    {
      title: 'Reading the velocity diagram',
      body: `Start at the dashed arrow, the planet's velocity. Your velocity *relative to the planet* is an arrow from its tip, and the flyby can only turn that arrow, never stretch it, so its tip stays on the circle. Your velocity relative to the Sun runs from the origin to wherever on the circle you end up. The furthest point on the circle from the origin is the biggest possible exit speed: the planet's speed plus your arrival speed.`,
    },
  ],
  deeper: `**Why it took a while to see.** The idea was worked out in the early 1960s by Michael Minovitch, then a student, who calculated that gravity assists could reach the outer planets with modest rockets. Mariner 10 used Venus to reach Mercury in 1974, the first assist between planets.

**Voyager's Grand Tour.** In the late 1970s the outer planets lined up so that one spacecraft could visit them all, each flyby aiming it at the next. Voyager 2 is still the only spacecraft to have visited Uranus and Neptune.

**Braking works too.** The Parker Solar Probe uses seven Venus flybys to *lose* speed, falling ever closer to the Sun; at its closest it becomes the fastest object ever built, about 190 km/s.`,
  next: 'Gravity can also pull unevenly across a body. That uneven pull raises the tides and can tear moons apart.',
};
