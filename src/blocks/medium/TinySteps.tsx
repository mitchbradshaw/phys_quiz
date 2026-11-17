// Medium 1: How computers predict orbits. The Earth's orbit, computed the way a computer does: freeze the pull for a
// time step, move in a straight line, update the velocity, repeat. Big steps make the simple method spiral outwards;
// "leapfrog" (same two updates, cleverer order) stays closed. Shrinking the steps to nothing is calculus: d/dt and ∫.
// Colours: velocity blue, acceleration orange, time purple, distance gold.
import { useMemo, useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { Challenge, Formula, Formulas, num, WhatIfs } from '../../ui/blockkit';
import { Q, TRAIL } from '../../ui/colors';
import { Button, Readout, Readouts, Segmented, SimLayout, Slider } from '../../ui/kit';
import { SpacePanel, Vec } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

type Method = 'simple' | 'leapfrog';
const LAPS = 5;
const W = 560;
const H = 380;
const CX = 280;
const CY = 190;
const R = 110; // px of 1 AU
const V_KMS = 29.8;
const LAP_SECONDS = 4; // real seconds per lap of animation

interface Run {
  xs: Float64Array;
  ys: Float64Array;
  vx: Float64Array;
  vy: Float64Array;
  len: Float64Array;
  d: string;
  maxDev: number;
  endR: number;
  dE: number;
}

/** Units: GM = 1, start radius 1, circular speed 1, one lap = 2π. */
function integrate(N: number, method: Method): Run {
  const n = LAPS * N;
  const dt = (2 * Math.PI) / N;
  const xs = new Float64Array(n + 1);
  const ys = new Float64Array(n + 1);
  const vx = new Float64Array(n + 1);
  const vy = new Float64Array(n + 1);
  let x = 1;
  let y = 0;
  let u = 0;
  let w = 1;
  const acc = (px: number, py: number): [number, number] => {
    const r3 = Math.pow(px * px + py * py, 1.5);
    return [-px / r3, -py / r3];
  };
  let maxDev = 0;
  for (let i = 0; ; i++) {
    xs[i] = x;
    ys[i] = y;
    vx[i] = u;
    vy[i] = w;
    maxDev = Math.max(maxDev, Math.abs(Math.hypot(x, y) - 1));
    if (i === n) break;
    if (method === 'simple') {
      const [ax, ay] = acc(x, y);
      x += u * dt;
      y += w * dt;
      u += ax * dt;
      w += ay * dt;
    } else {
      let [ax, ay] = acc(x, y);
      u += (ax * dt) / 2;
      w += (ay * dt) / 2;
      x += u * dt;
      y += w * dt;
      [ax, ay] = acc(x, y);
      u += (ax * dt) / 2;
      w += (ay * dt) / 2;
    }
  }
  const len = new Float64Array(n + 1);
  let d = '';
  let L = 0;
  for (let i = 0; i <= n; i++) {
    const px = CX + xs[i] * R;
    const py = CY - ys[i] * R;
    if (i) L += Math.hypot(px - (CX + xs[i - 1] * R), py - (CY - ys[i - 1] * R));
    len[i] = L;
    d += `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`;
  }
  const endR = Math.hypot(xs[n], ys[n]);
  const E = (i: number) => 0.5 * (vx[i] ** 2 + vy[i] ** 2) - 1 / Math.hypot(xs[i], ys[i]);
  return { xs, ys, vx, vy, len, d, maxDev, endR, dE: (E(n) - E(0)) / Math.abs(E(0)) };
}

function TinyStepsSim() {
  const [N, setN] = useState(12);
  const [method, setMethod] = useState<Method>('simple');
  const [k, setK] = useState(0); // steps shown (fractional while playing)
  const [playing, setPlaying] = useState(true);
  const visRef = useRef<HTMLDivElement>(null);
  const run = useMemo(() => integrate(N, method), [N, method]);
  const total = LAPS * N;

  useRaf(
    (dt) =>
      setK((c) => {
        const nk = Math.min(total, c + (dt * N) / LAP_SECONDS);
        if (nk >= total) setPlaying(false);
        return nk;
      }),
    playing,
    visRef
  );

  const i = Math.min(total, Math.floor(k));
  const px = CX + run.xs[i] * R;
  const py = CY - run.ys[i] * R;
  const dtDays = 365.25 / N;
  const stepKm = V_KMS * dtDays * 86400; // km per step at orbital speed
  const ok = method === 'leapfrog' && N <= 60 && run.maxDev < 0.01;
  const ax = -run.xs[i] / Math.pow(run.xs[i] ** 2 + run.ys[i] ** 2, 1.5);
  const ay = -run.ys[i] / Math.pow(run.xs[i] ** 2 + run.ys[i] ** 2, 1.5);
  const hStep = (2 * Math.PI) / N;
  const restart = () => {
    setK(0);
    setPlaying(true);
  };

  const visual = (
    <div ref={visRef}>
      <SpacePanel w={W} h={H} ariaLabel={`${method} method, ${N} steps per orbit: after ${LAPS} laps the orbit is ${(run.endR * 100).toFixed(0)} % of its true size.`} tags={[`${N} steps per year`, `${LAPS} laps`]} tagsAt="tl" stars={80}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={Q.s} strokeOpacity={0.5} strokeDasharray="4 5" />
        <circle cx={CX} cy={CY} r={9} fill="#f2b84b" />
        <path d={run.d} fill="none" stroke={TRAIL} strokeWidth={1.6} strokeDasharray={`${run.len[i].toFixed(1)} 1000000`} />
        {N <= 40 &&
          Array.from({ length: i + 1 }, (_, q) => q).map((q) => <circle key={q} cx={CX + run.xs[q] * R} cy={CY - run.ys[q] * R} r={2.2} fill={TRAIL} opacity={0.8} />)}
        {i < total && (
          <>
            <Vec x1={px} y1={py} x2={CX + run.xs[i + 1] * R} y2={CY - run.ys[i + 1] * R} color={Q.v} width={2.6} head={9} label={N <= 24 ? 'step' : undefined} labelOffset={14} />
            <Vec x1={px} y1={py} x2={px + ax * hStep * R * 1.0} y2={py - ay * hStep * R * 1.0} color={Q.a} width={2.6} head={9} />
          </>
        )}
        <circle cx={px} cy={py} r={6} fill="#2f6fa3" stroke="#9cc3e6" />
      </SpacePanel>
    </div>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Segmented<Method>
          size="sm"
          label="Method"
          value={method}
          onChange={(m) => {
            setMethod(m);
            restart();
          }}
          options={[
            { value: 'simple', label: 'simple steps' },
            { value: 'leapfrog', label: 'leapfrog' },
          ]}
        />
        <Slider
          label="steps per orbit"
          tex="N"
          tip="how many straight-line steps make up one year; the time step is a year divided by this"
          value={N}
          min={4}
          max={2000}
          log
          step={1}
          sig={4}
          format={(v) => `${Math.round(v)}`}
          onChange={(v) => {
            setN(Math.round(v));
            restart();
          }}
        />
        <div className="row gap-s wrap">
          <Button size="sm" variant="primary" onClick={restart}>
            Run again
          </Button>
          <Button size="sm" onClick={() => setK(total)}>
            Jump to the end
          </Button>
        </div>
      </div>
      <div className="ctl-group">
        <Readouts>
          <Readout tex="\qt{\Delta t}" tip="time step: how long the pull is treated as fixed" value={dtDays} unit="days" sig={3} />
          <Readout label="worst error" tip={`largest distance from the true orbit over ${LAPS} laps, as a % of its radius`} value={run.maxDev * 100} unit="%" sig={3} tone={run.maxDev < 0.01 ? 'ok' : run.maxDev > 0.2 ? 'bad' : undefined} />
          <Readout label="size after 5 laps" tip="final distance from the Sun ÷ true distance" value={run.endR} sig={3} />
          <Readout label="energy change" tip="should be zero: real orbits neither gain nor lose energy" value={run.dE * 100} unit="%" sig={3} />
        </Readouts>
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="One step"
          tex="\Delta\qs{\vec x} = \qv{\vec v}\,\Delta\qt{t} \qquad \Delta\qv{\vec v} = \qa{\vec a}\,\Delta\qt{t}"
          say="In a short time step, the position changes by velocity × time, and the velocity changes by acceleration × time. The acceleration comes from gravity, $a = GM/r^2$ towards the Sun, recalculated at every step."
          where={[
            ['\\Delta', '"change in", over one step'],
            ['\\qs{\\vec x}', 'position'],
            ['\\qv{\\vec v}', 'velocity'],
            ['\\qa{\\vec a}', "acceleration, from the Sun's pull"],
            ['\\Delta\\qt{t}', 'the time step'],
          ]}
          live={`\\Delta\\qt{t} = \\qt{${num(dtDays, dtDays < 1 ? 2 : 1)}}\\ \\text{days} \\quad\\Rightarrow\\quad |\\Delta\\qs{\\vec x}| \\approx ${num(V_KMS, 1)}\\ \\text{km/s} \\times \\qt{${num(dtDays, dtDays < 1 ? 2 : 1)}}\\ \\text{days} \\approx \\qs{${num(stepKm / 1e6, 1)}}\\ \\text{million km}`}
          liveNote="Each step is a straight line that long, while the true orbit curves."
        />
        <Formula
          title="Shrink the steps to nothing"
          tex="\qv{v} = \frac{d\qs{x}}{d\qt{t}} \qquad \qs{x} = \qs{x_0} + \int \qv{v}\,d\qt{t}"
          say="Make $\Delta t$ smaller and smaller. The ratio $\Delta x / \Delta t$ settles down to the **derivative** $dx/dt$, the slope from 'Speed is a slope'. Adding up all the little $v\,\Delta t$ steps becomes the **integral** $\int v\,dt$, the area. Calculus is this step method with infinitely many, infinitely small steps."
          where={[
            ['d', 'an infinitely small $\\Delta$: "the change, in the limit of tiny steps"'],
            ['\\int', 'a stretched S, for "sum": add up all the tiny pieces'],
            ['\\qs{x_0}', 'the starting position'],
          ]}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="ts-spiral"
          question="Simple steps, 12 per year. Over five laps, what happens to the computed Earth?"
          options={['It spirals outwards, gaining energy from nowhere', 'It spirals into the Sun', 'It stays on the true circle', 'It wobbles but stays the same size on average']}
          answer={0}
          explain="Each step goes in a straight line along the current direction of motion, and a straight line touching a circle always ends up slightly **outside** it. Every step ratchets the planet a little further out, and the method quietly adds energy: at 12 steps a year it gains enough to escape the Sun altogether. A real planet can't do that: this is an error in the method, not physics."
          tryIt="simple steps, 12 per orbit, and run."
          onApply={() => {
            setMethod('simple');
            setN(12);
            restart();
          }}
        />
        <WhatIf
          id="ts-halve"
          question="Simple steps again. Double the number of steps per year. What happens to the error?"
          options={['It roughly halves', 'It disappears', 'It drops to a quarter', 'It stays the same']}
          answer={0}
          explain="For the simple method, the error shrinks in proportion to the step size: half the step, about half the error, so a thousand steps per year still drift noticeably over five laps. To make this method a thousand times more accurate you need a thousand times more steps. That's why nobody uses it for real orbits."
          tryIt="compare 100 and 200 steps per orbit."
          onApply={() => {
            setMethod('simple');
            setN(200);
            restart();
          }}
        />
        <WhatIf
          id="ts-leapfrog"
          question="Leapfrog does the same two updates, but splits the velocity update into two halves around the move. With only 12 steps per year, what does its orbit do?"
          options={['Stays closed: a slightly wobbly loop that never drifts away', 'Spirals outwards like the simple method', 'Spirals inwards', 'Flies off into space']}
          answer={0}
          explain="Leapfrog's errors don't pile up in one direction: what it gets wrong on one side of the orbit, it undoes on the other, and the energy wobbles but never drifts. Methods with this property (*symplectic* ones) are how astronomers run the solar system forwards for billions of years."
          tryIt="switch to leapfrog at 12 steps per orbit."
          onApply={() => {
            setMethod('leapfrog');
            setN(12);
            restart();
          }}
        />
        <Challenge
          goal="Using **leapfrog**, keep the orbit within **1 %** of its true size for all 5 laps, with **no more than 60** steps per year."
          done={ok}
          hint="Watch 'worst error' as you change the number of steps. Leapfrog's error falls like the square of the step size."
          success={`${N} steps per year, worst error ${num(run.maxDev * 100, 2)} %. To do as well, the simple method needs tens of thousands of steps per year. A cleverer method beats a bigger computer.`}
        />
      </WhatIfs>
    </>
  );
}

export const tinySteps: BlockDef = {
  id: 'tiny-steps',
  title: 'How computers predict orbits',
  hook: 'If gravity changes at every point of an orbit, how can anyone predict where a planet will be in a hundred years?',
  explain: `Gravity's pull changes as a planet moves: different strength, different direction. None of the steady-acceleration formulas from Beginner cope with that. So computers break time into short **steps**. For each step they treat the pull as fixed, move the planet a little in a straight line, update its velocity, recalculate the pull, and repeat. Thousands of tiny straight steps make a smooth curve.

How small is small enough? Big steps go wrong in a telling way: the simple method spirals outwards, gaining energy from nowhere. Shrink the steps and the error shrinks. Take the steps all the way to infinitely small and you get **calculus**: the derivative $dx/dt$ and the integral $\int v\,dt$ are just $\Delta x/\Delta t$ and adding up slices, taken to the limit. And a cleverer ordering of the very same updates, called **leapfrog**, keeps orbits closed even with coarse steps. Real solar-system simulations run on that idea.`,
  Sim: TinyStepsSim,
  maths: [
    {
      title: 'Why the simple method gains energy',
      body: `Each simple step moves along the tangent, the straight line that just touches the orbit. From a point on a circle, any distance along the tangent puts you further from the centre: by Pythagoras, $\\sqrt{r^2 + (v\\,\\Delta t)^2} > r$. So every step nudges the planet outwards, and the computed orbit keeps growing. Leapfrog's half-step "kick" bends the path before the move, cancelling this to first order.`,
    },
  ],
  deeper: `**How the real thing is done.** NASA's planetary ephemerides (the tables used to steer spacecraft) integrate the Sun, planets, hundreds of asteroids and the effects of relativity, matched to radar and spacecraft tracking. They place the planets to within kilometres, or better.

**Predicting a planet before seeing it.** In 1846 Urbain Le Verrier worked out, by hand, that small wobbles in Uranus's orbit meant an unseen planet was tugging on it. He predicted where; Johann Galle looked that night and found Neptune within one degree.

**The limit of prediction.** The solar system is *chaotic*: tiny uncertainties grow tenfold roughly every 10 million years. Beyond about 100 million years, nobody can say where the planets will be, however good the computer. Simulations suggest a 1 % chance that Mercury's orbit becomes unstable before the Sun dies.`,
  next: 'With stepping we can launch at any speed, not just the circular one. Do it, and orbits come out stretched.',
};
