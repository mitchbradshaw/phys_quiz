// Beginner 3: "Speed is a slope, distance is an area". A rocket sled with steady acceleration and its three graphs,
// drawn as the clock runs. Slope of position = velocity; area under velocity = position; area under acceleration
// = change in velocity. Colours follow the site scheme (ui/colors.ts): velocities blue, acceleration orange, time purple, position gold.
import { useMemo, useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { displacementAt, displacementRange, sliceSum, velocityAt } from '../../physics/kinematics';
import { Area, Dot, HLine, Line, Plot, PlotText, Poly, sample } from '../../plot/Plot';
import { Challenge, Formula, Formulas, num, SimTags, WhatIfs } from '../../ui/blockkit';
import { Q } from '../../ui/colors';
import { Button, Readout, Readouts, Segmented, SimLayout, Slider } from '../../ui/kit';
import { Rich } from '../../ui/Rich';
import { WhatIf } from '../../ui/WhatIf';

const T_END = 10;
const C = { v: Q.v, a: Q.a, u: Q.v, t: Q.t, s: Q.s, neg: Q.E };
type AreaMode = 'fill' | 'split' | 'slices';

function niceStep(span: number) {
  const raw = span / 8;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

function Arrow({ x, y, len, color, label, above }: { x: number; y: number; len: number; color: string; label: string; above?: boolean }) {
  if (Math.abs(len) < 3) return null;
  const dir = Math.sign(len);
  const x2 = x + len;
  return (
    <g>
      <line x1={x} y1={y} x2={x2 - dir * 6} y2={y} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <polygon points={`${x2},${y} ${x2 - dir * 9},${y - 5} ${x2 - dir * 9},${y + 5}`} fill={color} />
      <text x={x2 + dir * 6} y={y + (above ? -6 : 4)} textAnchor={dir > 0 ? 'start' : 'end'} className="plot-note" fill={color} fontWeight={600}>
        {label}
      </text>
    </g>
  );
}

/** The track: a sled at position s with its velocity and acceleration arrows. */
function Track({ s, v, a, lo, hi }: { s: number; v: number; a: number; lo: number; hi: number }) {
  const W = 600;
  const X0 = 26;
  const X1 = W - 26;
  const xOf = (p: number) => X0 + ((p - lo) / (hi - lo)) * (X1 - X0);
  const step = niceStep(hi - lo);
  const ticks: number[] = [];
  for (let p = Math.ceil(lo / step) * step; p <= hi + 1e-9; p += step) ticks.push(Number(p.toPrecision(10)));
  const sx = xOf(s);
  const flame = a === 0 ? 0 : -Math.sign(a) * (6 + Math.abs(a) * 3.2);
  return (
    <svg viewBox={`0 0 ${W} 104`} className="anim" role="img" aria-label={`Sled at ${s.toFixed(1)} m, velocity ${v.toFixed(1)} m/s, acceleration ${a} m/s²`}>
      <line x1={X0} x2={X1} y1={78} y2={78} stroke="var(--text-3)" strokeWidth={1.5} />
      {ticks.map((p) => (
        <g key={p}>
          <line x1={xOf(p)} x2={xOf(p)} y1={78} y2={p === 0 ? 70 : 83} stroke="var(--text-3)" strokeWidth={p === 0 ? 2 : 1} />
          <text x={xOf(p)} y={97} textAnchor="middle" className="plot-note">
            {p === 0 ? 'start' : `${p} m`}
          </text>
        </g>
      ))}
      <g transform={`translate(${sx} 0)`}>
        {flame !== 0 && (
          <polygon
            points={`${flame > 0 ? 17 : -17},62 ${(flame > 0 ? 17 : -17) + flame},66 ${flame > 0 ? 17 : -17},70`}
            fill="var(--m2)"
            opacity={0.85}
          />
        )}
        <rect x={-17} y={58} width={34} height={16} rx={4} fill="var(--surface-3)" stroke="var(--text-2)" strokeWidth={1.5} />
        <circle cx={-9} cy={76} r={2.5} fill="var(--text-2)" />
        <circle cx={9} cy={76} r={2.5} fill="var(--text-2)" />
        <line x1={0} x2={0} y1={58} y2={78} stroke={C.s} strokeWidth={1.5} strokeDasharray="2 2" />
      </g>
      <Arrow x={sx} y={40} len={v * 4.2} color={C.v} label="v" above />
      <Arrow x={sx} y={18} len={a * 9} color={C.a} label="a" above />
      <text x={sx} y={54} textAnchor="middle" className="plot-note" fill={C.s} fontWeight={600}>
        s
      </text>
    </svg>
  );
}

function MotionGraphsSim() {
  const [u, setU] = useState(4);
  const [a, setA] = useState(1.5);
  const [t, setT] = useState(6);
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<AreaMode>('split');
  const [n, setN] = useState(8);
  const visRef = useRef<HTMLDivElement>(null);

  useRaf(
    (dt) =>
      setT((cur) => {
        const nt = Math.min(T_END, cur + dt);
        if (nt >= T_END) setPlaying(false);
        return nt;
      }),
    playing,
    visRef
  );

  const s = displacementAt(u, a, t);
  const v = velocityAt(u, a, t);
  const vEnd = velocityAt(u, a, T_END);

  // Plot ranges depend only on u and a, so nothing rescales while the clock runs.
  const sRange = useMemo(() => {
    const [lo, hi] = displacementRange(u, a, T_END);
    const pad = Math.max(4, (hi - lo) * 0.08);
    return [Math.min(lo, 0) - pad, Math.max(hi, 0) + pad] as const;
  }, [u, a]);
  const vRange = useMemo(() => {
    const lo = Math.min(0, u, vEnd);
    const hi = Math.max(0, u, vEnd);
    const pad = Math.max(1.5, (hi - lo) * 0.1);
    return [lo - pad, hi + pad] as const;
  }, [u, vEnd]);
  const sCurve = useMemo(() => sample((x) => displacementAt(u, a, x), 0, T_END, 200), [u, a]);
  const sPast = useMemo(() => sample((x) => displacementAt(u, a, x), 0, Math.max(t, 1e-6), 120), [u, a, t]);
  const vCurve = useMemo(() => sample((x) => velocityAt(u, a, x), 0, T_END, 2), [u, a]);

  // Signed area under v(t) from 0 to t, split where v crosses zero (above = forwards, below = backwards).
  const fillPieces = useMemo(() => {
    const tz = a !== 0 ? -u / a : -1;
    const cuts = [0, ...(tz > 0 && tz < t ? [tz] : []), t];
    const out: { pts: { x: Float64Array; y: Float64Array }; pos: boolean }[] = [];
    for (let i = 0; i + 1 < cuts.length; i++) {
      const mid = (cuts[i] + cuts[i + 1]) / 2;
      out.push({ pts: sample((x) => velocityAt(u, a, x), cuts[i], cuts[i + 1], 2), pos: velocityAt(u, a, mid) >= 0 });
    }
    return out;
  }, [u, a, t]);

  const slices = useMemo(() => {
    if (mode !== 'slices' || t <= 0) return [];
    const dt = t / n;
    return Array.from({ length: n }, (_, i) => {
      const x0 = i * dt;
      const h = velocityAt(u, a, x0);
      return { pts: [[x0, 0], [x0 + dt, 0], [x0 + dt, h], [x0, h]] as [number, number][], pos: h >= 0 };
    });
  }, [mode, n, t, u, a]);
  const sliceTotal = mode === 'slices' && t > 0 ? sliceSum(u, a, t, n) : NaN;

  const tan = 1.6; // half-width of the tangent line, s
  const stopTime = a !== 0 && -u / a > 0 ? -u / a : null;
  const s8 = displacementAt(u, a, 8);
  const challengeDone = Math.abs(s8) < 0.3 && Math.abs(u) >= 0.5;

  const set = (nu: number, na: number, nt: number, play = false) => {
    setU(nu);
    setA(na);
    setT(play ? 0 : nt);
    setPlaying(play);
  };

  const visual = (
    <div ref={visRef} className="plot-stack">
      <SimTags items={['Drag the time slider, or press Play', 'Graphs: faint = still to come']} />
      <Track s={s} v={v} a={a} lo={sRange[0]} hi={sRange[1]} />
      <div className="plot-caption">
        <b style={{ color: C.s }}>Position</b> against time. Its <b style={{ color: C.v }}>slope</b> (steepness) right now is the velocity.
      </div>
      <Plot x={{ min: 0, max: T_END, label: 'time t (s)' }} y={{ min: sRange[0], max: sRange[1], label: 's (m)' }} height={150} ariaLabel="Position against time" cursorX={t}>
        <HLine y={0} />
        <Line points={sCurve} color={C.s} opacity={0.3} dash />
        <Line points={sPast} color={C.s} width={2.5} />
        <Line
          points={[
            [t - tan, s - v * tan],
            [t + tan, s + v * tan],
          ]}
          color={C.v}
          width={2}
          dash="5 3"
        />
        {t + 1 <= T_END && (
          <>
            <Line
              points={[
                [t, s],
                [t + 1, s],
              ]}
              color={C.t}
              width={1.5}
            />
            <Line
              points={[
                [t + 1, s],
                [t + 1, s + v],
              ]}
              color={C.v}
              width={2.5}
            />
            <PlotText x={t + 1} y={s + v / 2} dx={5} color={C.v}>
              {`rise in 1 s = ${num(v)} m`}
            </PlotText>
          </>
        )}
        <Dot x={t} y={s} color={C.s} />
      </Plot>
      <div className="plot-caption">
        <b style={{ color: C.v }}>Velocity</b> against time. The <b style={{ color: C.s }}>area</b> underneath, so far, is the distance travelled.
      </div>
      <Plot x={{ min: 0, max: T_END, label: 'time t (s)' }} y={{ min: vRange[0], max: vRange[1], label: 'v (m/s)' }} height={150} ariaLabel="Velocity against time" cursorX={t}>
        {mode === 'fill' &&
          fillPieces.map((p, i) => <Area key={i} points={p.pts} base={0} color={p.pos ? C.s : C.neg} opacity={0.3} />)}
        {mode === 'split' && t > 0 && (
          <>
            <Poly
              pts={[
                [0, 0],
                [t, 0],
                [t, u],
                [0, u],
              ]}
              fill={C.u}
              opacity={0.22}
              stroke={C.u}
            />
            <Poly
              pts={[
                [0, u],
                [t, u],
                [t, v],
              ]}
              fill={C.a}
              opacity={0.3}
              stroke={C.a}
            />
          </>
        )}
        {mode === 'slices' && slices.map((sl, i) => <Poly key={i} pts={sl.pts} fill={sl.pos ? C.s : C.neg} opacity={0.3} stroke={sl.pos ? C.s : C.neg} />)}
        <HLine y={0} />
        <Line points={vCurve} color={C.v} width={2.5} />
        <Dot x={t} y={v} color={C.v} />
      </Plot>
      <div className="plot-caption">
        <b style={{ color: C.a }}>Acceleration</b> against time. The area underneath is how much the velocity has changed.
      </div>
      <Plot x={{ min: 0, max: T_END, label: 'time t (s)' }} y={{ min: -5.5, max: 5.5, label: 'a (m/s²)' }} height={110} ariaLabel="Acceleration against time" cursorX={t}>
        {t > 0 && (
          <Poly
            pts={[
              [0, 0],
              [t, 0],
              [t, a],
              [0, a],
            ]}
            fill={C.a}
            opacity={0.25}
          />
        )}
        <HLine y={0} />
        <Line
          points={[
            [0, a],
            [T_END, a],
          ]}
          color={C.a}
          width={2.5}
        />
        <Dot x={t} y={a} color={C.a} />
      </Plot>
    </div>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Slider label="starting velocity" tex="\qv{u}" tip="velocity at t = 0, in metres per second; negative means backwards" value={u} min={-10} max={20} step={0.5} unit="m/s" onChange={setU} />
        <Slider label="acceleration" tex="\qa{a}" tip="change in velocity every second, in m/s per second (m/s²)" value={a} min={-5} max={5} step={0.25} unit="m/s²" onChange={setA} />
        <Slider
          label="time"
          tex="\qt{t}"
          tip="seconds since the start"
          value={t}
          min={0}
          max={T_END}
          step={0.05}
          unit="s"
          onChange={(x) => {
            setPlaying(false);
            setT(x);
          }}
        />
        <div className="row gap-s wrap">
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (playing) setPlaying(false);
              else {
                if (t >= T_END) setT(0);
                setPlaying(true);
              }
            }}
          >
            {playing ? 'Pause' : t >= T_END ? 'Play again' : 'Play'}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setPlaying(false);
              setT(0);
            }}
          >
            Back to t = 0
          </Button>
        </div>
      </div>
      <div className="ctl-group">
        <Readouts>
          <Readout tex="\qt{t}" tip="time since the start" value={t} unit="s" sig={3} />
          <Readout tex="\qs{s}" tip="position: how far from the start (negative = behind it)" value={s} unit="m" sig={3} />
          <Readout tex="\qv{v}" tip="velocity right now" value={v} unit="m/s" sig={3} />
          <Readout tex="\qa{a}" tip="acceleration (steady)" value={a} unit="m/s²" sig={3} />
        </Readouts>
        {stopTime !== null && stopTime < T_END && (
          <div className="note">
            The sled is momentarily stopped at t = {stopTime.toFixed(2)} s, where the position graph is flat.
          </div>
        )}
      </div>
      <div className="ctl-group">
        <div className="ctl-title">Show the area under the velocity graph as</div>
        <Segmented<AreaMode>
          size="sm"
          label="Area display"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'split', label: 'rectangle + triangle' },
            { value: 'slices', label: 'thin slices' },
            { value: 'fill', label: 'one area' },
          ]}
        />
        {mode === 'slices' && (
          <>
            <Slider label="number of slices" value={n} min={1} max={40} step={1} sig={2} onChange={(x) => setN(Math.round(x))} />
            <Readouts min={150}>
              <Readout label="slices add up to" value={sliceTotal} unit="m" sig={4} tone="m5" />
              <Readout label="exact area" value={s} unit="m" sig={4} tone="m5" />
            </Readouts>
            <div className="note">Each slice pretends the velocity stayed fixed for a moment. More, thinner slices: closer to the exact answer.</div>
          </>
        )}
        {mode === 'split' && <Rich className="note" text={String.raw`Blue rectangle $= \qv{u} \times \qt{t}$. Orange triangle $= \tfrac12 \times$ base $\times$ height $= \tfrac12 \times \qt{t} \times \qa{a}\qt{t}$. Together they are the formula for $\qs{s}$.`} />}
        {mode === 'fill' && <div className="note">Area above the axis counts forwards; below the axis (pink) counts backwards.</div>}
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="Velocity after t seconds"
          tex="\qv{v} = \qv{u} + \qa{a}\,\qt{t}"
          say="Velocity now = starting velocity + (change per second × number of seconds). The $at$ part is the area under the acceleration graph."
          where={[
            ['\\qv{v}', 'the velocity after $t$ seconds (m/s)'],
            ['\\qv{u}', 'the starting velocity, at $t = 0$ (m/s)'],
            ['\\qa{a}', 'the acceleration: how much the velocity changes each second (m/s²)'],
            ['\\qt{t}', 'the time since the start (s)'],
          ]}
          live={`\\qv{v} = \\qv{${num(u)}} + (\\qa{${num(a, 2)}})(\\qt{${num(t)}}) = \\qv{${num(v)}}\\ \\text{m/s}`}
        />
        <Formula
          title="Position after t seconds"
          tex="\qs{s} = \qv{u}\,\qt{t} + \tfrac{1}{2}\,\qa{a}\,\qt{t}^{2}"
          say="Distance = (starting velocity × time) + ½ × acceleration × time². It is the blue rectangle plus the orange triangle under the velocity graph."
          where={[
            ['\\qs{s}', 'the position: how far the sled is from the start (m); negative means behind it'],
            ['\\qv{u},\\ \\qa{a},\\ \\qt{t}', 'as in the first formula'],
          ]}
          live={`\\qs{s} = (\\qv{${num(u)}})(\\qt{${num(t)}}) + \\tfrac{1}{2}(\\qa{${num(a, 2)}})(\\qt{${num(t)}})^{2} = \\qs{${num(s)}}\\ \\text{m}`}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="mg-zero-a"
          question="Set the acceleration to **zero**, with the sled already moving. What shape is the **position** graph?"
          options={['A straight, sloping line', 'A flat, horizontal line', 'A curve that bends upwards', 'A curve that bends downwards']}
          answer={0}
          explain="With no acceleration the velocity never changes, so the position grows by the **same amount every second**: a constant slope, which is a straight line. A flat line would mean the velocity is zero (not moving at all). Curves only appear when the velocity is changing."
          tryIt="set a to 0 and press Play."
          onApply={() => set(8, 0, 0, true)}
        />
        <WhatIf
          id="mg-turnaround"
          question="Start at 15 m/s and brake hard (a = −3 m/s²). At the instant the sled **stops**, what is the position graph doing?"
          options={['Reaching its highest point, where it is momentarily flat', 'Climbing at its steepest', 'Crossing back through zero', 'Ending, since the sled has stopped']}
          answer={0}
          explain="Velocity is the slope of the position graph, so zero velocity means **zero slope**: the graph is flat for an instant, at its peak. But the acceleration is still −3 m/s², so the sled doesn't stay stopped: it starts rolling backwards and the graph turns down. (Zero velocity is *not* zero acceleration: the same is true at the top of a ball's flight.) Finding where a slope is zero is how physicists find the highest or lowest point of anything."
          tryIt="set u = 15 and a = −3, then drag the time to 5 s."
          onApply={() => set(15, -3, 5)}
        />
        <WhatIf
          id="mg-double-time"
          question="Starting **from rest** with steady acceleration, the sled covers some distance in 4 s. How far does it get in **8 s**?"
          options={['Twice as far', 'Three times as far', 'Four times as far', 'Eight times as far']}
          answer={2}
          fixedOrder
          explain="From rest, the area under the velocity graph is a triangle. Doubling the time doubles its base *and* its height (the sled is going twice as fast by then), so the area is **four times** bigger: $s = \tfrac12 a t^2$, and $8^2 / 4^2 = 4$. The time is *squared*."
          tryIt="set u = 0, then compare the distance at t = 4 s and t = 8 s."
          onApply={() => set(0, 2, 8)}
        />
        <Challenge
          goal="Make the sled end up **exactly back at the start** at **t = 8 s** (and not by just sitting still)."
          done={challengeDone}
          hint="Being back at the start means the total distance is zero, so the area under the velocity graph from 0 to 8 s must cancel out: as much below the axis as above it. Which way must the acceleration point compared with the starting velocity?"
          success={`Back to the start: forwards area and backwards area cancel. Notice $u = -4a$ (here $u$ = ${num(u)}, $a$ = ${num(a, 2)}): put $s = 0$ and $t = 8$ into $s = ut + \\tfrac12 a t^2$ and that's what falls out.`}
        />
      </WhatIfs>
    </>
  );
}

export const motionGraphs: BlockDef = {
  id: 'speed-is-a-slope',
  title: 'Speed is a slope, distance is an area',
  hook: 'If you know how fast something is going at every instant, can you say exactly where it will be?',
  explain: `Motion comes in layers. Where something is: its **position**, $s$. How fast that is changing: its **velocity**, $v$. And how fast *that* is changing: its **acceleration**, $a$.

Going down a layer is always the same move: take the **rate of change**, which on a graph is how steep it is (its *slope*). Going back up is always the reverse: **add up thin slices**, which on a graph is the area underneath. So yes: if you know the velocity at every instant, and where you started, you can say exactly where you'll be. With steady acceleration, the adding-up gives the two formulas below; every orbit later on is the same two ideas, repeated in tiny steps.`,
  Sim: MotionGraphsSim,
  maths: [
    {
      title: 'Slope: how steep a graph is',
      body: `The slope of a straight line is how much it rises for every step to the right: $\\text{slope} = \\dfrac{\\text{rise}}{\\text{run}}$. On a position–time graph the rise is in metres and the run is in seconds, so the slope is in metres per second: a velocity.

A curved graph has a different slope at every point. The slope *at* a point is the slope of the straight line that just touches the curve there: the blue dashed line in the sim. The little triangle next to it shows the rise over a run of 1 second.`,
    },
    {
      title: 'Why the time-squared part takes over',
      body: `Double $t$ and $t^2$ becomes **four** times bigger; triple it and it becomes **nine** times bigger. That's why the $\\tfrac12 a t^2$ part of the distance soon takes over: anything speeding up steadily from rest covers 4 times as much ground in 10 s as in 5 s.`,
    },
    {
      title: 'Negative numbers are directions',
      body: `Along a straight track the sign gives the direction. A velocity of −3 m/s means 3 m/s **backwards**. Acceleration works the same way: when velocity and acceleration have the **same** sign the sled speeds up; when they have **opposite** signs it slows down (and, if it keeps going, eventually reverses).`,
    },
  ],
  deeper: `**Galileo's odd numbers.** Starting from rest, the distances covered in each successive second go 1 : 3 : 5 : 7 … The triangle under the velocity graph grows as 1, 4, 9, 16 …, and the gaps between those are the odd numbers. Galileo found this pattern in the early 1600s by timing balls rolling down gentle ramps, long before anyone had the formula.

**The third equation.** Remove $t$ from the two formulas (from $v = u + at$, $t = (v-u)/a$; put that into the formula for $s$) and you get $v^2 = u^2 + 2as$: velocity from distance, no clock needed. It answers questions like "how fast is a stone going after falling 20 m?"

**These two ideas have names.** "Rate of change" (the slope) is the **derivative**; "adding up thin slices" (the area) is the **integral**. Together they are **calculus**, invented by Newton and Leibniz in the late 1600s to handle motion where the acceleration *isn't* steady, like a planet whose pull changes as it moves. You'll meet the notation in Medium. You've already met the ideas.`,
  next: 'That describes motion with a steady push. But what *causes* acceleration, and why does nothing need a cause just to keep moving?',
};
