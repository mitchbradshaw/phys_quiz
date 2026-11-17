// Beginner 5: The stranded astronaut. Momentum and Newton's third law: an astronaut drifting away from the station
// gets back by throwing something the other way. Throw it in pieces and it becomes a rocket.
// Colours: velocity blue, masses green, momentum pink, the pushes during a throw orange.
import { useMemo, useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { Challenge, Formula, Formulas, num, WhatIfs } from '../../ui/blockkit';
import { Q } from '../../ui/colors';
import { Button, Readout, Readouts, Segmented, SimLayout, Slider } from '../../ui/kit';
import { Rich } from '../../ui/Rich';
import { SpacePanel, Vec } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const X0 = 12; // m from the station hatch
const V0 = 0.05; // m/s, drifting away
const WARP = 10; // 1 s here = 10 s
const T0 = 3; // s: first throw
const GAP = 2; // s between pieces
const T_MAX = 900;
const W = 560;
const H = 330;
const SX = 66; // px of the hatch
const KX = 12; // px per m
const LINE_Y = 120;
const BAR_Y = 250;
const OBJECTS = [
  { id: 'wrench', name: 'wrench', m: 2 },
  { id: 'camera', name: 'camera', m: 5 },
  { id: 'tank', name: 'oxygen tank', m: 20 },
] as const;
type ObjId = (typeof OBJECTS)[number]['id'];

interface Plan {
  t: number[]; // throw times
  vA: number[]; // her velocity after each throw
  vO: number[]; // each piece's velocity
  x: number[]; // her position at each throw
  dm: number;
  reach: number | null; // time she reaches the hatch
  vFinal: number;
}

function makePlan(M: number, m: number, w: number, dir: 1 | -1, n: number): Plan {
  const dm = m / n;
  let mass = M + m;
  let v = V0;
  let x = X0 + V0 * T0;
  const t: number[] = [];
  const vA: number[] = [];
  const vO: number[] = [];
  const xs: number[] = [];
  let reach: number | null = null;
  for (let k = 0; k < n; k++) {
    const tk = T0 + k * GAP;
    if (k > 0) {
      const xn = x + v * GAP;
      if (reach === null && v < 0 && xn <= 0) reach = tk - GAP + x / -v;
      x = xn;
    }
    // momentum before = after: mass·v = (mass − dm)·v' + dm·(v' + dir·w)
    const vNew = v - (dm * dir * w) / mass;
    t.push(tk);
    vA.push(vNew);
    vO.push(vNew + dir * w);
    xs.push(x);
    v = vNew;
    mass -= dm;
  }
  if (reach === null && v < 0) reach = t[n - 1] + x / -v;
  return { t, vA, vO, x: xs, dm, reach, vFinal: v };
}

function herX(p: Plan, t: number): number {
  if (t <= p.t[0]) return X0 + V0 * t;
  let k = p.t.length - 1;
  while (k > 0 && p.t[k] > t) k--;
  return Math.max(0, p.x[k] + p.vA[k] * (t - p.t[k]));
}

const fmtTime = (s: number) => (s < 120 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`);

function Astronaut({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${LINE_Y})`}>
      <rect x={-7} y={-12} width={14} height={20} rx={4} fill="#e8ebf0" stroke="#9aa3b2" />
      <rect x={-9} y={-10} width={4} height={14} rx={2} fill="#c7cdd8" />
      <circle cx={0} cy={-19} r={7.5} fill="#e8ebf0" stroke="#9aa3b2" />
      <rect x={-4.5} y={-22} width={9} height={5} rx={2} fill="#3b5b8a" />
      <line x1={-4} y1={8} x2={-5} y2={20} stroke="#e8ebf0" strokeWidth={4} strokeLinecap="round" />
      <line x1={4} y1={8} x2={6} y2={20} stroke="#e8ebf0" strokeWidth={4} strokeLinecap="round" />
    </g>
  );
}

function AstronautSim() {
  const [obj, setObj] = useState<ObjId>('wrench');
  const [w, setW] = useState(6);
  const [dir, setDir] = useState<1 | -1>(1);
  const [M, setM] = useState(120);
  const [n, setN] = useState(1);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const visRef = useRef<HTMLDivElement>(null);
  const m = OBJECTS.find((o) => o.id === obj)?.m ?? 2;
  const p = useMemo(() => makePlan(M, m, w, dir, n), [M, m, w, dir, n]);
  const tEnd = Math.min(T_MAX, (p.reach ?? T_MAX) + 4);

  useRaf(
    (dt) =>
      setT((cur) => {
        const nt = Math.min(tEnd, cur + dt * WARP);
        if (nt >= tEnd) setPlaying(false);
        return nt;
      }),
    playing,
    visRef
  );

  const reset = () => {
    setPlaying(false);
    setT(0);
  };
  const change =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      reset();
    };

  const xh = herX(p, t);
  const thrown = p.t.filter((tk) => tk <= t).length;
  const vNow = thrown === 0 ? V0 : p.vA[thrown - 1];
  const massNow = M + m - thrown * p.dm;
  const pHer = massNow * vNow;
  const pObj = p.vO.slice(0, thrown).reduce((s, v) => s + p.dm * v, 0);
  const pTot = (M + m) * V0;
  const pMax = Math.max(Math.abs(pTot), ...p.vO.map((v) => Math.abs(m * v)), Math.abs((M + m - m) * p.vFinal), 1e-9);
  const kp = 200 / pMax;
  const lastThrow = thrown > 0 ? p.t[thrown - 1] : -1;
  const showPush = thrown > 0 && t - lastThrow < 6;
  const reachFromThrow = p.reach !== null ? p.reach - T0 : null;
  const fast = obj === 'wrench' && reachFromThrow !== null && reachFromThrow <= 180;

  let status: string;
  if (t < T0) status = `Drifting away at **${num(V0 * 100, 0)} cm/s**. Press *Throw!*`;
  else if (p.vFinal >= 0) status = `Still drifting away, at **${num(p.vFinal * 100, 1)} cm/s**. Lost, unless she throws harder, throws something heavier, or throws the other way.`;
  else if (p.reach !== null && t >= p.reach) status = `**Made it!** Back at the hatch ${fmtTime(p.reach - T0)} after the first throw.`;
  else status = `Heading back at **${num(-p.vFinal * 100, 1)} cm/s**: she'll reach the hatch ${fmtTime((p.reach ?? 0) - T0)} after the first throw.`;

  const bar = (y: number, val: number, label: string, solid: boolean) => {
    const L = val * kp;
    return (
      <g>
        <rect x={Math.min(280, 280 + L)} y={y - 7} width={Math.max(1, Math.abs(L))} height={14} rx={2} fill={solid ? Q.E : 'none'} fillOpacity={0.7} stroke={Q.E} strokeWidth={1.4} />
        <text x={110} y={y + 4} textAnchor="end" className="plot-note" fill="var(--text-2)">
          {label}
        </text>
        <text x={L >= 0 ? 286 + L : 274 + L} y={y + 4} textAnchor={L >= 0 ? 'start' : 'end'} className="plot-note" fill={Q.E} fontWeight={700}>
          {num(val, 1)}
        </text>
      </g>
    );
  };

  const visual = (
    <div ref={visRef}>
      <SpacePanel w={W} h={H} ariaLabel={status.replace(/\*/g, '')} tags={['1 s here = 10 s', 'Distances to scale']} tagsAt="tr" stars={60}>
        {/* station */}
        <rect x={0} y={40} width={SX} height={150} fill="#3a4252" stroke="#6d7689" />
        <rect x={SX - 10} y={LINE_Y - 22} width={10} height={40} fill="#1b2230" stroke="#8f98a8" />
        <text x={SX / 2} y={34} textAnchor="middle" className="plot-note" fill="var(--text-2)">
          station
        </text>
        <line x1={SX} x2={W} y1={LINE_Y + 34} y2={LINE_Y + 34} stroke="rgba(255,255,255,0.12)" />
        {[0, 5, 10, 15, 20, 25, 30, 35, 40].map((d) => (
          <g key={d}>
            <line x1={SX + d * KX} x2={SX + d * KX} y1={LINE_Y + 30} y2={LINE_Y + 38} stroke="rgba(255,255,255,0.25)" />
            <text x={SX + d * KX} y={LINE_Y + 50} textAnchor="middle" className="plot-note" fill="var(--text-3)">
              {d} m
            </text>
          </g>
        ))}
        {/* pieces already thrown */}
        {p.t.map((tk, k) =>
          tk <= t ? <rect key={k} x={SX + (p.x[k] + 0.4 * dir + p.vO[k] * (t - tk)) * KX - 4} y={LINE_Y - 6} width={8} height={5} rx={1} fill="var(--m3)" /> : null
        )}
        {thrown < n && <rect x={SX + xh * KX + 8 * dir - 4} y={LINE_Y - 6} width={8} height={5} rx={1} fill="var(--m3)" />}
        <Astronaut x={SX + xh * KX} />
        <Vec x1={SX + xh * KX} y1={LINE_Y - 40} x2={SX + xh * KX + Math.sign(vNow) * Math.min(80, 12 + Math.abs(vNow) * 160)} y2={LINE_Y - 40} color={Q.v} width={2.4} head={8} label="v" labelOffset={10} />
        {showPush && (
          <>
            <Vec x1={SX + xh * KX + 10 * dir} y1={LINE_Y + 18} x2={SX + xh * KX + 50 * dir} y2={LINE_Y + 18} color={Q.F} width={3} head={9} />
            <Vec x1={SX + xh * KX - 10 * dir} y1={LINE_Y + 18} x2={SX + xh * KX - 50 * dir} y2={LINE_Y + 18} color={Q.F} width={3} head={9} />
            <text x={SX + xh * KX} y={LINE_Y + 72} textAnchor="middle" className="plot-note" fill={Q.F} fontWeight={700}>
              equal and opposite pushes
            </text>
          </>
        )}
        {/* momentum bars */}
        <line x1={280} x2={280} y1={BAR_Y - 34} y2={BAR_Y + 62} stroke="rgba(255,255,255,0.3)" />
        <text x={280} y={BAR_Y - 40} textAnchor="middle" className="plot-note" fill="var(--text-3)">
          momentum (kg·m/s): ← towards the station · away →
        </text>
        {bar(BAR_Y - 14, pHer, 'astronaut', true)}
        {bar(BAR_Y + 12, pObj, 'thrown', true)}
        {bar(BAR_Y + 40, pTot, 'total', false)}
      </SpacePanel>
    </div>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <div className="ctl-title">What she throws</div>
        <Segmented<ObjId> size="sm" label="Object to throw" value={obj} onChange={change(setObj)} options={OBJECTS.map((o) => ({ value: o.id, label: `${o.name} ${o.m} kg` }))} />
        <Slider label="throw speed" tex="\qv{w}" tip="how fast it leaves her hands, measured from her" value={w} min={1} max={15} step={0.5} unit="m/s" onChange={change(setW)} />
        <Segmented<1 | -1>
          size="sm"
          label="Throw direction"
          value={dir}
          onChange={change(setDir)}
          options={[
            { value: 1, label: 'away from the station' },
            { value: -1, label: 'towards the station' },
          ]}
        />
        <Slider label="her mass, with suit" tex="\qm{M}" tip="astronaut plus spacesuit (a real suit alone is about 120 kg)" value={M} min={60} max={250} step={5} unit="kg" onChange={change(setM)} />
        <Slider label="throw it in pieces" tip="split the same mass into this many pieces thrown one after another, like a rocket's exhaust" value={n} min={1} max={20} step={1} sig={2} onChange={change((v: number) => setN(Math.round(v)))} />
        <div className="row gap-s wrap">
          <Button
            variant="primary"
            onClick={() => {
              if (t >= tEnd) setT(0);
              setPlaying(true);
            }}
          >
            Throw!
          </Button>
          <Button size="sm" onClick={reset}>
            Reset
          </Button>
        </div>
        <Rich className="status" text={status} />
      </div>
      <div className="ctl-group">
        <Readouts>
          <Readout tex="\qv{v_a}" tip="her velocity after the throw(s); negative = towards the station" value={p.vFinal * 100} unit="cm/s" sig={3} />
          <Readout tex="\qv{v_o}" tip="the thrown object's velocity (first piece)" value={p.vO[0]} unit="m/s" sig={3} />
          <Readout tex="\qe{p_{\text{total}}}" tip="total momentum: the same before and after" value={pTot} unit="kg·m/s" sig={3} />
        </Readouts>
      </div>
    </>
  );

  const vA1 = p.vA[0];
  const vO1 = p.vO[0];
  return (
    <>
      <Formulas>
        <Formula
          title="Momentum"
          tex="\qe{p} = \qm{m}\,\qv{v}"
          say="Momentum is mass times velocity: how much 'oomph' a moving thing carries, with a direction. A slow heavy thing and a fast light thing can carry the same momentum."
          where={[
            ['\\qe{p}', 'momentum (kg·m/s), pointing the same way as the velocity'],
            ['\\qm{m}', 'mass (kg)'],
            ['\\qv{v}', 'velocity (m/s)'],
          ]}
          live={`\\qe{p}_{\\text{${OBJECTS.find((o) => o.id === obj)?.name ?? ''}}} = \\qm{${num(p.dm, 1)}} \\times \\qv{${num(vO1, 2)}} = \\qe{${num(p.dm * vO1, 1)}}\\ \\text{kg·m/s}`}
        />
        <Formula
          title="Momentum before = momentum after"
          tex="(\qm{M} + \qm{m})\,\qv{v_0} = \qm{M}\,\qv{v_a} + \qm{m}\,\qv{v_o}"
          say="Nothing outside pushes on astronaut-plus-wrench, so their total momentum can't change. Whatever the wrench gains one way, she gains the other way."
          where={[
            ['\\qm{M}', 'her mass, with suit (kg)'],
            ['\\qm{m}', "the thrown object's mass (kg)"],
            ['\\qv{v_0}', 'their shared velocity before the throw: drifting away at 0.05 m/s'],
            ['\\qv{v_a},\\ \\qv{v_o}', 'her velocity and the object’s, after the throw (away from the station is positive)'],
          ]}
          live={`(\\qm{${num(M + m - p.dm, 0)}} + \\qm{${num(p.dm, 1)}})(\\qv{${num(V0, 2)}}) = \\qm{${num(M + m - p.dm, 0)}}(\\qv{${num(vA1, 3)}}) + \\qm{${num(p.dm, 1)}}(\\qv{${num(vO1, 2)}})`}
          liveNote={n > 1 ? `That's the first of ${n} pieces. Each later throw uses the same rule with whatever mass is left.` : 'Both sides come to the same number: check it.'}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="sa-direction"
          question="She is drifting **away** from the station. To get back, which way should she throw the wrench?"
          options={['Away from the station', 'Towards the station', 'Straight up', "It doesn't matter: she can't change her motion"]}
          answer={0}
          explain="The wrench and the astronaut push each other apart, so she moves the **opposite** way to the wrench. Throw it away from the station and she recoils towards it. Throwing *towards* the station feels natural, and sends her further away."
          tryIt="throw the wrench away from the station at 6 m/s."
          onApply={() => {
            setObj('wrench');
            setDir(1);
            setW(6);
            setN(1);
            setT(0);
            setPlaying(true);
          }}
        />
        <WhatIf
          id="sa-heavy"
          question="She throws her 20 kg oxygen tank instead of the 2 kg wrench, just as fast. How much faster does she head back?"
          options={['About ten times faster', 'About twice as fast', 'The same speed', 'Slower: the tank is harder to throw']}
          answer={0}
          fixedOrder
          explain="Ten times the mass at the same speed carries ten times the momentum, and she gets the same amount the other way. (A little less than ten times, since she also loses the tank's mass.) Not a great trade, though: she needs that oxygen."
          tryIt="pick the oxygen tank."
          onApply={() => {
            setObj('tank');
            setDir(1);
            setW(6);
            setN(1);
            setT(0);
            setPlaying(true);
          }}
        />
        <WhatIf
          id="sa-push"
          question="During the throw, which gets pushed **harder**: the wrench or the astronaut?"
          options={['Exactly the same, in opposite directions', 'The wrench, since it flies off faster', 'The astronaut, since she is heavier', 'Only the wrench: she just lets go']}
          answer={0}
          explain="Every force is a pair: if she pushes the wrench, the wrench pushes her back exactly as hard (**Newton's third law**). Same push, same instant, so the same momentum each way. The wrench speeds up 60 times more only because it has 60 times less mass ($a = F/m$)."
          tryIt="press Throw! and watch the two orange arrows."
          onApply={() => {
            setObj('wrench');
            setDir(1);
            setN(1);
            setT(0);
            setPlaying(true);
          }}
        />
        <Challenge
          goal="Get her back to the hatch within **3 minutes** of the first throw, throwing only the **wrench**."
          done={fast}
          hint="Her speed back is roughly (wrench mass × throw speed) ÷ her mass, minus the 5 cm/s she was drifting away at. She has 12 m to cover in 180 s. How fast must the wrench go?"
          success={`Back in ${reachFromThrow !== null ? fmtTime(reachFromThrow) : ''}. Spacewalkers now wear a small nitrogen jetpack (NASA's SAFER) for exactly this emergency: a wrench-throw that can be repeated.`}
        />
      </WhatIfs>
    </>
  );
}

export const strandedAstronaut: BlockDef = {
  id: 'stranded-astronaut',
  title: 'The stranded astronaut',
  hook: 'How do you move when there is nothing to push against?',
  explain: `Out in space there's nothing to push against: no ground, no air. An astronaut whose tether snaps keeps drifting at a steady speed (Newton's first law), however much she flails.

Unless she throws something. Every push comes as a pair: as she pushes the wrench one way, the wrench pushes her the other way just as hard (**Newton's third law**). Both pushes last the same instant, so the wrench and the astronaut get equal and opposite amounts of **momentum**, mass times velocity, and the total never changes. The light wrench flies off fast; the heavy astronaut drifts back slowly.

A rocket does exactly this, all the time: it throws gas out of the back at a few kilometres per second.`,
  Sim: AstronautSim,
  maths: [
    {
      title: 'Why equal pushes give equal momentum',
      body: `Newton's second law says $F = ma$, and acceleration is change in velocity per time, $a = \\Delta v / \\Delta t$. Put them together and multiply both sides by $\\Delta t$: $F\\,\\Delta t = m\\,\\Delta v$. The push times how long it lasts equals the change in momentum. The wrench and the astronaut feel the same push for the same instant, so their momentum changes are the same size, in opposite directions.`,
    },
  ],
  deeper: `**Rockets.** Rocket exhaust leaves at 2 to 4.5 km/s. The speed a rocket can reach depends on that exhaust speed and on how much of the rocket is fuel: every extra km/s needs the fuel fraction to grow a lot (the **rocket equation**, Tsiolkovsky, 1903). Reaching orbit takes about 9 to 10 km/s including losses, so a launch rocket is around 85 to 90 % propellant by mass. Try the "pieces" slider: throwing the same mass in many small pieces gets her slightly more speed, because each later piece pushes a lighter astronaut. That's the rocket equation in miniature.

**You push the Earth when you walk.** Your foot pushes the ground back; the ground pushes you forward. The Earth moves too, by a vanishingly small amount, because its mass is $10^{23}$ times yours.

**Newton's cradle, pool balls, recoiling guns**: all momentum bookkeeping. Physicists trust these books so much that when radioactive decays in the 1930s seemed to lose energy and momentum, Wolfgang Pauli predicted an invisible particle carrying off the difference. It was detected 26 years later: the neutrino.`,
  next: 'Momentum is one of nature’s two great "never changes" quantities. The other is energy, and it explains why speed is so dangerous.',
};
