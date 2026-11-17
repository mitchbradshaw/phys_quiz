// Beginner 6: Energy, the currency of motion. A cart rolls on a smooth track with two hills; energy bars show
// kinetic energy and gravitational potential energy trading back and forth, and friction turning some into heat.
// The cart moves with the true equation of motion for a bead on a curve; its energy is a check, not an input.
// Colours: speed blue, height gold, mass green, g orange, all forms of energy pink.
import { useMemo, useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { beadStep, trackAt as track } from '../../physics/track';
import { Challenge, Formula, Formulas, num, WhatIfs } from '../../ui/blockkit';
import { Q, TRAIL } from '../../ui/colors';
import { Button, Readout, Readouts, Segmented, SimLayout, Slider, Toggle } from '../../ui/kit';
import { SpacePanel, Vec } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const WORLDS = [
  { id: 'earth', name: 'Earth', g: 9.8 },
  { id: 'moon', name: 'Moon', g: 1.62 },
  { id: 'mars', name: 'Mars', g: 3.71 },
] as const;
type WorldId = (typeof WORLDS)[number]['id'];
const XEND = 125;
const X_START = 3;
const FRICTION = 0.08; // per second, when the track is rough
const W = 560;
const H = 360;
const KX = 4.06; // px per m
const PX0 = 18; // px of x = 0
const BASE = 226; // px of h = 0
const sx = (x: number) => PX0 + x * KX;
const sy = (h: number) => BASE - h * KX;

interface State {
  x: number;
  u: number; // dx/dt
  t: number;
}

function EnergySim() {
  const [world, setWorld] = useState<WorldId>('earth');
  const [h0, setH0] = useState(30);
  const [hill1, setHill1] = useState(20);
  const [hill2, setHill2] = useState(26);
  const [v0, setV0] = useState(0);
  const [m, setM] = useState(500);
  const [rough, setRough] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [, setTick] = useState(0);
  const visRef = useRef<HTMLDivElement>(null);
  const g = WORLDS.find((w) => w.id === world)?.g ?? 9.8;
  const hs = useMemo(() => [h0, 0, hill1, 0, hill2, 50], [h0, hill1, hill2]);
  // The latest settings, so a restart scheduled before React re-renders still uses them.
  const cfg = useRef({ hs, v0 });
  cfg.current = { hs, v0 };
  const start = (): State => {
    const [, s1] = track(cfg.current.hs, X_START);
    return { x: X_START, u: cfg.current.v0 / Math.sqrt(1 + s1 * s1), t: 0 };
  };
  const st = useRef<State>(start());
  const maxX = useRef(X_START);

  const restart = (play = false) => {
    st.current = start();
    maxX.current = X_START;
    setPlaying(play);
    setTick((n) => n + 1);
  };
  /** Restart after React has applied the new settings. */
  const restartSoon = (play = false) => requestAnimationFrame(() => restart(play));

  useRaf(
    (dt) => {
      const k = rough ? FRICTION : 0;
      const steps = Math.max(1, Math.ceil(dt / 0.004));
      const h = dt / steps;
      let { x, u } = st.current;
      for (let i = 0; i < steps; i++) {
        [x, u] = beadStep(hs, g, k, x, u, h);
        if (x < -2 && u < 0) u = -u; // buffers at both ends
        if (x > XEND && u > 0) u = -u;
      }
      st.current = { x, u, t: st.current.t + dt };
      maxX.current = Math.max(maxX.current, x);
      setTick((n) => n + 1);
    },
    playing,
    visRef
  );

  const { x, u } = st.current;
  const [hx, slope] = track(hs, x);
  const v = Math.abs(u) * Math.sqrt(1 + slope * slope);
  const [hStart, s0] = track(hs, X_START);
  const u0 = v0 / Math.sqrt(1 + s0 * s0);
  const E0 = 0.5 * m * u0 * u0 * (1 + s0 * s0) + m * g * hStart;
  const KE = 0.5 * m * v * v;
  const PE = m * g * hx;
  const heat = Math.max(0, E0 - KE - PE);
  const Eref = Math.max(E0, m * g * 50);
  const KB = 380 / Eref;

  const path = useMemo(() => {
    let d = `M${sx(-4)},${sy(hs[0])}`;
    for (let q = 0; q <= XEND + 4; q += 1) d += `L${sx(q).toFixed(1)},${sy(track(hs, q)[0]).toFixed(1)}`;
    return d;
  }, [hs]);

  const ang = Math.atan(slope);
  const dirx = Math.sign(u) / Math.sqrt(1 + slope * slope);
  const diry = (Math.sign(u) * slope) / Math.sqrt(1 + slope * slope);
  const vLen = Math.min(90, v * 3.2);
  const overHill = !rough && hill1 >= 2 * hStart - 0.01 && E0 > m * g * hill1 && hStart > 0.5;

  const bar = (y: number, val: number, label: string, fill: string) => (
    <g>
      <text x={96} y={y + 4} textAnchor="end" className="plot-note" fill="var(--text-2)">
        {label}
      </text>
      <rect x={104} y={y - 7} width={Math.max(0.5, val * KB)} height={14} rx={2} fill={fill} />
      <text x={110 + val * KB} y={y + 4} className="plot-note" fill={Q.E} fontWeight={700}>
        {num(val / 1000, val < 10000 ? 1 : 0)} kJ
      </text>
    </g>
  );

  const visual = (
    <div ref={visRef}>
      <SpacePanel w={W} h={H} ariaLabel={`Cart at height ${hx.toFixed(1)} m moving at ${v.toFixed(1)} m/s.`} tags={[WORLDS.find((w) => w.id === world)?.name ?? '', 'Real time']} tagsAt="tr" stars={50}>
        <path d={`${path}L${sx(XEND + 4)},${BASE + 10}L${sx(-4)},${BASE + 10}Z`} fill="rgba(255,255,255,0.05)" />
        <path d={path} fill="none" stroke={TRAIL} strokeWidth={2.4} />
        <line x1={sx(-4)} x2={sx(XEND + 4)} y1={BASE} y2={BASE} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
        <line x1={sx(-4)} x2={sx(XEND + 4)} y1={sy(E0 / (m * g))} y2={sy(E0 / (m * g))} stroke={Q.E} strokeDasharray="2 5" opacity={0.6} />
        <text x={sx(XEND) - 4} y={sy(E0 / (m * g)) - 5} textAnchor="end" className="plot-note" fill={Q.E}>
          highest it could ever reach
        </text>
        <line x1={sx(x)} x2={sx(x)} y1={sy(hx) - 8} y2={BASE} stroke={Q.s} strokeDasharray="3 3" />
        <text x={sx(x) + 5} y={(sy(hx) + BASE) / 2} className="plot-note" fill={Q.s} fontWeight={700}>
          h
        </text>
        <g transform={`translate(${sx(x)} ${sy(hx)}) rotate(${(-ang * 180) / Math.PI})`}>
          <rect x={-11} y={-14} width={22} height={10} rx={3} fill="var(--m3)" stroke="#fff" strokeWidth={0.8} />
          <circle cx={-6} cy={-3} r={3} fill="#cfd5de" />
          <circle cx={6} cy={-3} r={3} fill="#cfd5de" />
        </g>
        {v > 0.05 && <Vec x1={sx(x)} y1={sy(hx) - 22} x2={sx(x) + dirx * vLen} y2={sy(hx) - 22 - diry * vLen} color={Q.v} width={2.6} head={8} label="v" labelOffset={10} />}
        {/* energy bars */}
        <text x={104} y={266} className="plot-note" fill="var(--text-3)">
          energy (the dotted line is the total at the start)
        </text>
        {bar(286, KE, 'motion ½mv²', Q.E)}
        {bar(308, PE, 'height mgh', 'rgba(255,107,154,0.55)')}
        {bar(330, heat, 'heat', 'rgba(180,185,197,0.55)')}
        <line x1={104 + E0 * KB} x2={104 + E0 * KB} y1={276} y2={340} stroke={Q.E} strokeDasharray="2 3" />
        {/* stacked total */}
        <rect x={104} y={346} width={KE * KB} height={6} fill={Q.E} />
        <rect x={104 + KE * KB} y={346} width={PE * KB} height={6} fill="rgba(255,107,154,0.55)" />
        <rect x={104 + (KE + PE) * KB} y={346} width={heat * KB} height={6} fill="rgba(180,185,197,0.55)" />
      </SpacePanel>
    </div>
  );

  const reset =
    <T,>(set: (v: T) => void) =>
    (val: T) => {
      set(val);
      setPlaying(false);
      restartSoon(false);
    };

  const controls = (
    <>
      <div className="ctl-group">
        <Segmented<WorldId> size="sm" label="World" value={world} onChange={reset(setWorld)} options={WORLDS.map((w) => ({ value: w.id, label: w.name, title: `g = ${w.g} m/s²` }))} />
        <Slider label="starting height" tex="\qs{h_0}" tip="height of the start of the track" value={h0} min={5} max={50} step={1} unit="m" onChange={reset(setH0)} />
        <Slider label="first hill" tip="height of the first hill" value={hill1} min={0} max={50} step={1} unit="m" onChange={reset(setHill1)} />
        <Slider label="second hill" tip="height of the second hill" value={hill2} min={0} max={50} step={1} unit="m" onChange={reset(setHill2)} />
        <Slider label="starting push" tex="\qv{v_0}" tip="speed at the start" value={v0} min={0} max={30} step={0.5} unit="m/s" onChange={reset(setV0)} />
        <Slider label="mass of the cart" tex="\qm{m}" tip="changes the amount of energy, not the motion" value={m} min={100} max={2000} step={50} unit="kg" onChange={setM} />
        <Toggle checked={rough} onChange={reset(setRough)} label="Rough track (friction turns motion into heat)" />
        <div className="row gap-s wrap">
          <Button size="sm" variant="primary" onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button size="sm" onClick={() => restart(false)}>
            Back to the start
          </Button>
        </div>
      </div>
      <div className="ctl-group">
        <Readouts>
          <Readout tex="\qv{v}" tip="speed along the track" value={v} unit="m/s" sig={3} />
          <Readout label="that's" value={v * 3.6} unit="km/h" sig={3} />
          <Readout tex="\qs{h}" tip="height above the lowest point" value={hx} unit="m" sig={3} />
          <Readout tex="\qe{E_{\text{total}}}" tip="motion + height + heat: never changes" value={(KE + PE + heat) / 1000} unit="kJ" sig={4} />
        </Readouts>
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="Energy of motion"
          tex="\qe{E_k} = \tfrac{1}{2}\,\qm{m}\,\qv{v}^{2}"
          say="Kinetic energy: half the mass times the speed squared. The square is why speed is so dangerous: twice as fast carries four times the energy."
          where={[
            ['\\qe{E_k}', 'kinetic energy, in joules (J)'],
            ['\\qm{m}', 'mass (kg)'],
            ['\\qv{v}', 'speed (m/s)'],
          ]}
          live={`\\qe{E_k} = \\tfrac12 (\\qm{${m}})(\\qv{${num(v, 1)}})^2 = \\qe{${num(KE / 1000, 1)}}\\ \\text{kJ}`}
        />
        <Formula
          title="Energy of height"
          tex="\qe{U} = \qm{m}\,\qa{g}\,\qs{h}"
          say="Gravitational potential energy: lifting a mass stores energy that comes back as speed when it falls. Measured from the lowest point of the track."
          where={[
            ['\\qe{U}', 'gravitational potential energy (J)'],
            ['\\qa{g}', "gravity's strength: 9.8 m/s² on Earth, 1.62 on the Moon, 3.71 on Mars"],
            ['\\qs{h}', 'height above the lowest point (m)'],
          ]}
          live={`\\qe{U} = (\\qm{${m}})(\\qa{${g}})(\\qs{${num(hx, 1)}}) = \\qe{${num(PE / 1000, 1)}}\\ \\text{kJ}`}
        />
        <Formula
          title="The total never changes"
          tex="\tfrac{1}{2}\qm{m}\qv{v}^{2} + \qm{m}\qa{g}\qs{h} + \qe{\text{heat}} = \text{constant}"
          say="Energy changes form but never appears or disappears. Without friction, the speed anywhere depends only on how far below the start you are: $v = \sqrt{v_0^2 + 2g\,\Delta h}$, whatever the shape of the track."
          where={[['\\qe{\\text{heat}}', 'energy friction has turned into warmth in the wheels and track']]}
          live={`\\qe{${num(KE / 1000, 1)}} + \\qe{${num(PE / 1000, 1)}} + \\qe{${num(heat / 1000, 1)}} = \\qe{${num((KE + PE + heat) / 1000, 1)}}\\ \\text{kJ}`}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="en-double"
          question="Double the speed of a moving cart. How much more kinetic energy does it carry?"
          options={['Twice as much', 'Three times as much', 'Four times as much', 'The same']}
          answer={2}
          fixedOrder
          explain="Kinetic energy goes with speed **squared**: $2^2 = 4$. That's why a crash at 100 km/h is four times as destructive as one at 50, and why the braking distance quadruples too: the brakes must turn four times as much energy into heat."
          tryIt="compare the 'motion' bar at a starting push of 10 m/s and 20 m/s on flat ground."
          onApply={() => {
            setH0(5);
            setV0(20);
            restartSoon(false);
          }}
        />
        <WhatIf
          id="en-valleys"
          question="With no friction, the cart passes through both valleys (both at the same lowest height). Where is it going faster?"
          options={['Exactly the same speed in both', 'Faster in the first valley', 'Faster in the second valley', 'Depends on how steep the hill between them is']}
          answer={0}
          explain="The speed only depends on how far below the start you are, because the energy bank only tracks height. The hill in between borrows speed on the way up and pays it all back on the way down. The shape of the track changes **when** you get there, never **how fast**."
          tryIt="press Play with the rough track off and watch the speed in each valley."
          onApply={() => {
            setRough(false);
            setV0(0);
            restartSoon(true);
          }}
        />
        <WhatIf
          id="en-moon"
          question="On the Moon, where gravity is a sixth as strong, can the cart roll over a **higher** hill than on Earth?"
          options={['No: exactly the same hills, just more slowly', 'Yes, six times higher', 'Yes, a little higher', 'No: it struggles over lower ones']}
          answer={0}
          explain="Weaker gravity means less energy stored per metre of height, but the climb also costs less energy per metre, by exactly the same factor. Released from rest, the cart reaches the same heights on any world; everything just happens in slow motion. (Give it a starting push and the Moon wins: that push buys far more height there.)"
          tryIt="switch between Earth and the Moon and press Play."
          onApply={() => {
            setWorld('moon');
            setV0(0);
            restartSoon(true);
          }}
        />
        <Challenge
          goal="With friction off, get the cart over a first hill **at least twice as tall** as the height it starts from."
          done={overHill}
          hint="Height alone can't do it: without a push the cart can never rise above where it started. What else could put energy in the bank at the start?"
          success={`Done: a starting push of ${num(v0, 1)} m/s bought the extra height. To climb $\\Delta h$ above your start you need at least $v_0 = \\sqrt{2g\\,\\Delta h}$: about ${num(Math.sqrt(2 * g * Math.max(0, hill1 - hStart)), 1)} m/s here.`}
        />
      </WhatIfs>
    </>
  );
}

export const energy: BlockDef = {
  id: 'energy',
  title: 'Energy: the currency of motion',
  hook: 'Why does going twice as fast make a crash four times worse?',
  explain: `Energy is the universe's currency of motion. It comes in different forms and can be exchanged between them, but in every experiment ever done the **total** stays the same.

A moving thing carries **kinetic energy**, $\\tfrac12 mv^2$. The square matters: twice the speed means four times the energy, which is why a crash at 100 km/h is so much worse than at 50. Height is energy in the bank: lifting a mass stores **gravitational potential energy**, $mgh$, which comes back as speed when it falls. Friction turns some of it into heat, which spreads out and never comes back as motion.

Watch the cart: dropping, it trades height for speed; climbing, it trades back. Without friction, it always returns to exactly the height it started from.`,
  Sim: EnergySim,
  maths: [
    {
      title: 'Why the mass cancels',
      body: `Starting from rest, the speed after dropping a height $h$ comes from setting the energy gained equal to the energy lost: $\\tfrac12 m v^2 = m g h$. Every term has $m$ in it, so divide it out: $v^2 = 2gh$, and $v = \\sqrt{2gh}$. A heavy cart and a light one reach the same speed, exactly as Galileo's falling balls do. The mass changes how much energy is involved, not the motion.`,
    },
  ],
  deeper: `**What a joule is.** Lifting an apple (about 1 N) by 1 m takes 1 joule. A AA battery holds about 10 000 J; a slice of bread about 1 million.

**Why meteors are so destructive.** At 20 km/s, each kilogram of rock carries $\\tfrac12 \\times 1 \\times 20\\,000^2 = 2 \\times 10^{8}$ J, about 50 times the energy in a kilogram of TNT. That's why a 50 m iron meteorite could dig Arizona's 1.2 km Meteor Crater.

**Mass is energy too.** Einstein's $E = mc^2$ says mass itself is a store of energy: one kilogram is worth $9 \\times 10^{16}$ J. The Sun turns about 4 million tonnes of mass into sunlight every second.

**Why energy is conserved at all.** In 1918 Emmy Noether proved that energy conservation follows from a symmetry: the laws of physics are the same today as yesterday. Each symmetry of nature comes with something that never changes; momentum's comes from the laws being the same everywhere in space.`,
  next: 'Energy tells you how fast and how high, but not where. For that, back to arrows: a thrown ball moves sideways and up at the same time.',
};
