// Medium 8: The light clock. A clock that ticks each time light crosses between two mirrors and back. The crew see
// light go straight up and down; the station sees the moving ship drag the light along a longer zigzag. Light's
// speed is the same for both, so the station counts fewer ticks: time dilation, from Pythagoras. Mode 2 is the real
// test: muons raining down a mountain (Frisch and Smith, 1963). Every number says whose clock or ruler measured it.
// Colours: speeds blue, times purple, distances gold.
import { useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { mulberry32 } from '../../engine/rng';
import { Challenge, Formula, Formulas, num, WhatIfs } from '../../ui/blockkit';
import { Q } from '../../ui/colors';
import { Button, Readout, Readouts, Segmented, SimLayout, Slider, Toggle } from '../../ui/kit';
import { SpacePanel } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

type Mode = 'clock' | 'muons';
const W = 560;
const LIGHT = '#fff3b0';
const GAP = 64; // px between mirrors
const C_PX = 2 * GAP; // light travels 2 gaps per second of the crew's time
const TAU = 2.197e-6; // muon mean lifetime, its own clock (s)
const HEIGHT = 1907; // m, Mt Washington summit to sea level (Frisch & Smith)

const gammaOf = (b: number) => 1 / Math.sqrt(1 - b * b);

function Clock({ x, y, py }: { x: number; y: number; py: number }) {
  return (
    <g>
      <rect x={x - 22} y={y - GAP / 2 - 6} width={44} height={5} rx={2} fill="#cfd5de" />
      <rect x={x - 22} y={y + GAP / 2 + 1} width={44} height={5} rx={2} fill="#cfd5de" />
      <circle cx={x} cy={py} r={4.5} fill={LIGHT} />
      <circle cx={x} cy={py} r={9} fill={LIGHT} opacity={0.2} />
    </g>
  );
}

interface Muon {
  x: number;
  born: number; // station time of crossing the summit (sim µs)
  life: number; // station-measured lifetime (µs)
  arrived: boolean;
}

function LightClockSim() {
  const [mode, setMode] = useState<Mode>('clock');
  const [beta, setBeta] = useState(0.6);
  const [t, setT] = useState(0);
  const [dilate, setDilate] = useState(true);
  const [counts, setCounts] = useState({ top: 0, bottom: 0 });
  const muons = useRef<Muon[]>([]);
  const rng = useRef(mulberry32(5));
  const visRef = useRef<HTMLDivElement>(null);
  const g = gammaOf(beta);

  // muon clock: the summit-to-sea trip (at 0.995c) plays in 4 s; µs of station time per real second
  const muBeta = 0.9952;
  const vMu = muBeta * 3e8;
  const tripUs = (HEIGHT / vMu) * 1e6;
  const usPerSec = tripUs / 4;
  const gMu = gammaOf(muBeta);

  useRaf(
    (dt) => {
      setT((c) => c + dt);
      if (mode !== 'muons') return;
      const now = t * usPerSec;
      const list = muons.current;
      // spawn about 18 muons per second at the summit
      let top = 0;
      let bottom = 0;
      const nNew = Math.floor(rng.current() < (dt * 18) % 1 ? Math.ceil(dt * 18) : Math.floor(dt * 18));
      for (let i = 0; i < nNew; i++) {
        const mean = (dilate ? gMu : 1) * TAU * 1e6;
        list.push({ x: 70 + rng.current() * 400, born: now, life: -mean * Math.log(1 - rng.current()), arrived: false });
        top++;
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        const age = now - m.born;
        if (!m.arrived && age >= tripUs) {
          m.arrived = true;
          if (m.life >= tripUs) bottom++;
        }
        if (age > Math.min(m.life, tripUs) + 0.6 * usPerSec) list.splice(i, 1);
      }
      if (top || bottom) setCounts((c) => ({ top: c.top + top, bottom: c.bottom + bottom }));
    },
    true,
    visRef
  );

  // ---- light clock geometry (t in seconds of whichever observer the panel belongs to)
  const crewPhase = (t % 1) * 2; // 0..2 gaps
  const crewY = 120 + GAP / 2 - (crewPhase <= 1 ? crewPhase : 2 - crewPhase) * GAP;
  const stTick = g; // station seconds per tick of the moving clock
  const stPhase = ((t % stTick) / stTick) * 2;
  const stY = 120 + GAP / 2 - (stPhase <= 1 ? stPhase : 2 - stPhase) * GAP;
  const v = beta * C_PX;
  const lane = 300;
  const shipX = 140 + ((t * v) % lane);
  // the zigzag light path over the last tick, in the station's view
  const zig: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const tt = t - stTick + (i / 40) * stTick;
    if (tt < 0) continue;
    const ph = ((tt % stTick) / stTick) * 2;
    const yy = 120 + GAP / 2 - (ph <= 1 ? ph : 2 - ph) * GAP;
    const xx = shipX - (t - tt) * v;
    zig.push(`${zig.length ? 'L' : 'M'}${xx.toFixed(1)},${yy.toFixed(1)}`);
  }
  const shipTicks = Math.floor(t / g);
  const crewTicks = Math.floor(t);

  const clockVis = (
    <div className="plot-stack">
      <SpacePanel w={W} h={220} ariaLabel="The crew's view: light goes straight up and down." tags={["Crew's view: 1 s here = 1 s of the crew's time"]} tagsAt="tl" stars={40}>
        <Clock x={280} y={120} py={crewY} />
        <line x1={280} x2={280} y1={120 - GAP / 2} y2={120 + GAP / 2} stroke={LIGHT} strokeOpacity={0.35} strokeDasharray="3 3" />
        <text x={330} y={110} className="plot-note" fill={Q.t} fontWeight={700}>
          crew's clock: {crewTicks} ticks
        </text>
        <text x={330} y={128} className="plot-note" fill="var(--text-3)">
          (one tick = 1 s, measured on board)
        </text>
      </SpacePanel>
      <SpacePanel w={W} h={220} ariaLabel={`The station's view: the ship moves at ${beta.toFixed(2)} c and the light zigzags.`} tags={[`Station's view: ship at ${num(beta, 2)} c`]} tagsAt="tl" stars={40}>
        <path d={zig.join('')} fill="none" stroke={LIGHT} strokeOpacity={0.55} strokeWidth={1.5} />
        <Clock x={shipX} y={120} py={stY} />
        <text x={16} y={196} className="plot-note" fill={Q.t} fontWeight={700}>
          station's clock: {num(t, 1)} s · ship's clock, as the station measures it: {shipTicks} ticks
        </text>
      </SpacePanel>
    </div>
  );

  // ---- muons
  const now = t * usPerSec;
  const muonVis = (
    <SpacePanel w={W} h={440} ariaLabel="Muons raining down a mountain." tags={[dilate ? 'Clocks as they really are' : 'Pretend: no time dilation', 'Slowed a million times']} tagsAt="tr" stars={0}>
      <rect x={0} y={0} width={W} height={440} fill="#0b1626" />
      <polygon points="0,420 40,60 120,40 200,70 360,70 420,200 560,420" fill="#2b2f36" stroke="#4a515c" />
      <line x1={0} x2={W} y1={60} y2={60} stroke={Q.s} strokeDasharray="4 4" opacity={0.6} />
      <line x1={0} x2={W} y1={420} y2={420} stroke={Q.s} strokeDasharray="4 4" opacity={0.6} />
      <text x={W - 10} y={54} textAnchor="end" className="plot-note" fill={Q.s}>
        summit, 1907 m (mountain's ruler)
      </text>
      <text x={W - 10} y={414} textAnchor="end" className="plot-note" fill={Q.s}>
        sea level
      </text>
      {muons.current.map((m, i) => {
        const age = now - m.born;
        const y = 60 + (Math.min(age, m.life, tripUs) / tripUs) * 360;
        const dead = age > m.life && m.life < tripUs;
        return <circle key={m.born + m.x} cx={m.x} cy={y} r={dead ? 5 : 3} fill={dead ? 'none' : '#9cf0ff'} stroke={dead ? '#ff9a9a' : 'none'} opacity={dead ? Math.max(0, 1 - (age - m.life) / (0.5 * usPerSec)) : 1} />;
      })}
    </SpacePanel>
  );

  const survNo = Math.exp(-HEIGHT / (vMu * TAU));
  const survYes = Math.exp(-HEIGHT / (vMu * TAU * gMu));
  const half = Math.abs(g - 2) < 0.02;

  const controls =
    mode === 'clock' ? (
      <>
        <div className="ctl-group">
          <Slider label="ship's speed, measured by the station" tex="\qv{v}/c" tip="as a fraction of the speed of light" value={beta} min={0} max={0.99} step={0.001} sig={3} onChange={setBeta} />
          <Button size="sm" onClick={() => setT(0)}>
            Reset the clocks
          </Button>
        </div>
        <div className="ctl-group">
          <Readouts min={150}>
            <Readout tex="\gamma" tip="the stretch factor: station seconds per tick of the moving clock" value={g} sig={4} />
            <Readout label="one ship tick lasts" tip="measured by the station's clocks" value={g} unit="station s" sig={4} />
            <Readout label="ship's clock runs at" tip="its rate, as the station measures it" value={100 / g} unit="%" sig={3} tone={half ? 'ok' : undefined} />
          </Readouts>
        </div>
      </>
    ) : (
      <>
        <div className="ctl-group">
          <Toggle checked={dilate} onChange={(v) => { setDilate(v); muons.current = []; setCounts({ top: 0, bottom: 0 }); }} label="Muon clocks run slow (as relativity says)" />
          <Button size="sm" onClick={() => { muons.current = []; setCounts({ top: 0, bottom: 0 }); }}>
            Reset the counters
          </Button>
        </div>
        <div className="ctl-group">
          <Readouts min={150}>
            <Readout label="passed the summit" text={String(counts.top)} />
            <Readout label="reached sea level" text={counts.top ? `${counts.bottom} (${Math.round((100 * counts.bottom) / Math.max(1, counts.top))} %)` : '0'} />
            <Readout label="survivors, predicted" tip={dilate ? 'with time dilation' : 'if moving clocks did not slow down'} value={(dilate ? survYes : survNo) * 100} unit="%" sig={2} />
            <Readout label="measured in 1963" tip="Frisch and Smith: 408 of 563 per hour" value={72} unit="%" sig={2} tone="ok" />
          </Readouts>
          <div className="note">Muons move at 0.995 c, so γ ≈ {num(gMu, 1)}. Their own clocks give them 2.2 µs on average; the mountain's clocks give them {num(gMu * 2.2, 0)} µs.</div>
        </div>
      </>
    );

  return (
    <>
      <Formulas>
        <Formula
          title="Moving clocks run slow"
          tex="\Delta\qt{t} = \gamma\,\Delta\qt{t_0} \qquad \gamma = \frac{1}{\sqrt{1 - \qv{v}^{2}/c^{2}}}"
          say="A clock moving past you at speed $v$ ticks slower, as measured by your clocks, by the factor $\gamma$ (gamma). Barely noticeable at everyday speeds; enormous near the speed of light."
          where={[
            ['\\Delta\\qt{t_0}', "time between two ticks, measured by the clock's own crew (the clock's **proper time**)"],
            ['\\Delta\\qt{t}', 'time between the same two ticks, measured by the station the clock is moving past'],
            ['\\qv{v}', 'the clock’s speed relative to the station'],
            ['c', 'the speed of light, the same for every observer'],
          ]}
          live={mode === 'clock' ? `\\gamma = \\frac{1}{\\sqrt{1 - ${num(beta, 3)}^2}} = ${num(g, 3)}` : `\\gamma_{\\text{muon}} = \\frac{1}{\\sqrt{1 - 0.9952^2}} = ${num(gMu, 1)}`}
          liveNote={mode === 'clock' ? `Each 1 s tick of the ship's clock lasts ${num(g, 3)} s of station time.` : undefined}
        />
        <Formula
          title="Where it comes from: Pythagoras"
          tex="(c\,\Delta\qt{t})^{2} = (\qv{v}\,\Delta\qt{t})^{2} + (c\,\Delta\qt{t_0})^{2}"
          say="In the station's view, during one crossing the light runs along a slanted path (long side), while the ship moves forward (base) and the light also covers the mirror gap (height, the same for everyone). All three sides are distances. Solve for $\Delta t$ and $\gamma$ falls out."
          where={[
            ['c\\,\\Delta\\qt{t}', 'how far the light travels, measured by the station'],
            ['\\qv{v}\\,\\Delta\\qt{t}', 'how far the ship moves meanwhile'],
            ['c\\,\\Delta\\qt{t_0}', 'the mirror gap the crew sees the light cross'],
          ]}
        />
      </Formulas>
      <SimLayout
        visual={
          <div ref={visRef}>
            <Segmented<Mode>
              size="sm"
              label="Show"
              value={mode}
              onChange={(m) => {
                setMode(m);
                setT(0);
                muons.current = [];
                setCounts({ top: 0, bottom: 0 });
              }}
              options={[
                { value: 'clock', label: 'The light clock' },
                { value: 'muons', label: 'Muons on a mountain' },
              ]}
            />
            <div style={{ height: 8 }} />
            {mode === 'clock' ? clockVis : muonVis}
          </div>
        }
        controls={controls}
      />
      <WhatIfs>
        <WhatIf
          id="lc-slow"
          question="The ship flies past at 10 % of light speed. By how much does its clock run slow, as the station measures it?"
          options={['About 0.5 %', 'About 10 %', 'About 50 %', 'Not at all']}
          answer={0}
          fixedOrder
          explain="$\gamma = 1/\sqrt{1 - 0.1^2} = 1.005$. Relativity hides at everyday speeds, which is why nobody noticed it until 1905. It grows fast near light speed: at 87 % of $c$ the clock runs at half rate; at 99.5 %, a tenth."
          tryIt="set the speed to 0.100."
          onApply={() => {
            setMode('clock');
            setBeta(0.1);
          }}
        />
        <WhatIf
          id="lc-crew"
          question="Do the crew notice their own time slowing down?"
          options={['No: on board everything ticks normally, and they measure the station’s clocks running slow', 'Yes, everything feels like slow motion', 'Yes, but only their watches are affected', 'Only if they look out of the window']}
          answer={0}
          explain="To the crew, the ship is at rest and the *station* is moving, so by exactly the same argument the station's clocks run slow. Both are right: each measures the other's clocks running slow. That sounds like a contradiction, and resolving it is the twin paradox, in the next block."
        />
        <WhatIf
          id="lc-gps"
          question="GPS satellites orbit at about 3.9 km/s, which is $0.000013\,c$. Does time dilation matter to them?"
          options={['Yes: uncorrected, positions would drift by kilometres a day', 'No, the effect is far too small', 'Only for satellites near the Sun', 'Only at night']}
          answer={0}
          explain="Their speed slows their clocks by about 7 microseconds a day. (Weaker gravity up there speeds them up by about 45, so the net is +38 µs a day: general relativity's part, in Advanced.) GPS works by timing light signals, and light goes 300 m in a microsecond, so 38 µs a day would add about 10 km of error every day. The satellites' clocks are deliberately set to tick slow before launch."
        />
        <Challenge
          goal="Find the speed at which the ship's clock runs at exactly **half** the rate of the station's clocks (as the station measures it)."
          done={half}
          hint="You want $\gamma = 2$, so $1 - v^2/c^2 = 1/4$."
          success={`At ${num(beta, 3)} c, every tick on the ship takes two seconds of station time. That's $v = \\sqrt{3}/2 \\approx 0.866\\,c$.`}
        />
      </WhatIfs>
    </>
  );
}

export const lightClock: BlockDef = {
  id: 'light-clock',
  title: 'The light clock',
  hook: 'If everyone measures the same speed of light, whose clock is running slow?',
  explain: `In 1905 Einstein took one strange experimental fact at face value: everyone who measures the speed of light gets the same answer, $c$, however fast they're moving themselves. Light doesn't add to your speed like a thrown ball.

Build a clock from it: light bouncing between two mirrors, one tick per round trip. The crew see the light go straight up and down. Watching the ship fly past, the station sees the light run along a longer, slanted zigzag, because the mirrors move while it's in flight. Same speed, longer path: each tick must take **longer** by the station's clocks. That isn't a fault in light clocks. Every clock on board, the crew's hearts and their ageing included, has to keep pace, or the crew could tell they were moving. Moving clocks run slow.`,
  Sim: LightClockSim,
  maths: [
    {
      title: 'Solving the triangle',
      body: `Start from $(c\\Delta t)^2 = (v\\Delta t)^2 + (c\\Delta t_0)^2$. Move the $v$ term over: $\\Delta t^2 (c^2 - v^2) = c^2 \\Delta t_0^2$. Divide by $c^2 - v^2$ and take the square root: $\\Delta t = \\dfrac{\\Delta t_0}{\\sqrt{1 - v^2/c^2}} = \\gamma\\,\\Delta t_0$. At $v = 0$, $\\gamma = 1$; as $v$ approaches $c$, $\\gamma$ grows without limit.`,
    },
  ],
  deeper: `**The muon's side of the story: length contraction.** A muon riding down the mountain sees its own clock tick normally: it still lives 2.2 µs. So how does it reach sea level? In its view the *mountain* is moving, and moving lengths are shortened along the motion by the same $\\gamma$: the 1907 m mountain is only about 190 m tall. Same outcome, different explanation, and no contradiction. Each observer's numbers belong to their own clocks and rulers.

**It has been tested to death.** Atomic clocks flown around the world on airliners (Hafele and Keating, 1971) came back tens to hundreds of nanoseconds out, as predicted. Particle accelerators keep unstable particles alive 30 times longer than they live at rest.

**Why you can't reach light speed.** As $v \\to c$, $\\gamma \\to \\infty$: the energy needed to speed up any further grows without limit. Light itself travels at $c$ only because it has no mass at all.`,
  next: "If each observer sees the other's clock run slow, who is really younger? To answer that, draw time as a direction.",
};
