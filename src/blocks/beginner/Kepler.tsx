// Beginner 11: Kepler's third law: weighing the Sun. Bodies orbiting one central mass obey T² = 4π²r³/(GM). Plot
// period against distance on log–log axes and slide the central mass until the law's line runs through the
// measurements: that's how astronomers weigh the Sun, Jupiter, and the black hole at the centre of our galaxy.
// Colours: mass green, distance gold, time purple.
import { useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { G } from '../../physics/constants';
import { Dot, Line, Plot, sample } from '../../plot/Plot';
import { Challenge, Formula, Formulas, num, sci, WhatIfs } from '../../ui/blockkit';
import { Q, TRAIL } from '../../ui/colors';
import { Readout, Readouts, Segmented, Select, SimLayout, Slider } from '../../ui/kit';
import { SpacePanel } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const AU = 1.496e11;
const YR = 3.156e7;
const DAY = 86400;
const MSUN = 1.99e30;

interface Orbiter {
  name: string;
  a: number; // display units
  T: number; // display units
  e?: number;
}
interface System {
  id: 'sun' | 'jupiter' | 'sgr';
  label: string;
  centre: string;
  M: number; // kg, measured
  aUnit: string;
  aSI: number;
  TUnit: string;
  TSI: number;
  warp: number; // display time units per real second
  bodies: Orbiter[];
}
const SYSTEMS: System[] = [
  {
    id: 'sun',
    label: 'Sun & planets',
    centre: 'the Sun',
    M: 1.99e30,
    aUnit: 'AU',
    aSI: AU,
    TUnit: 'years',
    TSI: YR,
    warp: 0.25,
    bodies: [
      { name: 'Mercury', a: 0.387, T: 0.2408 },
      { name: 'Venus', a: 0.723, T: 0.6152 },
      { name: 'Earth', a: 1, T: 1 },
      { name: 'Mars', a: 1.524, T: 1.881 },
      { name: 'Jupiter', a: 5.203, T: 11.86 },
      { name: 'Saturn', a: 9.537, T: 29.46 },
      { name: 'Uranus', a: 19.19, T: 84.01 },
      { name: 'Neptune', a: 30.07, T: 164.8 },
    ],
  },
  {
    id: 'jupiter',
    label: 'Jupiter & moons',
    centre: 'Jupiter',
    M: 1.898e27,
    aUnit: 'thousand km',
    aSI: 1e6,
    TUnit: 'days',
    TSI: DAY,
    warp: 1,
    bodies: [
      { name: 'Io', a: 421.7, T: 1.769 },
      { name: 'Europa', a: 671.0, T: 3.551 },
      { name: 'Ganymede', a: 1070.4, T: 7.155 },
      { name: 'Callisto', a: 1882.7, T: 16.69 },
    ],
  },
  {
    id: 'sgr',
    label: 'Galaxy’s centre',
    centre: 'the black hole Sagittarius A*',
    M: 4.26e6 * MSUN,
    aUnit: 'AU',
    aSI: AU,
    TUnit: 'years',
    TSI: YR,
    warp: 1,
    bodies: [{ name: 'star S2', a: 1031.6, T: 16.05, e: 0.885 }],
  },
];
const W = 560;
const H = 300;
const CX = 280;
const CY = 150;
const RMAX = 135;

const massFrom = (aSI: number, TSI: number) => (4 * Math.PI * Math.PI * aSI ** 3) / (G * TSI * TSI);
const suns = (M: number) => M / MSUN;

/** Eccentric anomaly from mean anomaly (Newton's method). */
function solveKepler(Mean: number, e: number) {
  let E = Mean;
  for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - Mean) / (1 - e * Math.cos(E));
  return E;
}

function KeplerSim() {
  const [sysId, setSys] = useState<System['id']>('sun');
  const [s, setS] = useState(-0.6); // log10 of (guess / true mass)
  const [sel, setSel] = useState('Earth');
  const [t, setT] = useState(0);
  const visRef = useRef<HTMLDivElement>(null);
  useRaf((dt) => setT((c) => c + dt), true, visRef);

  const sys = SYSTEMS.find((q) => q.id === sysId) ?? SYSTEMS[0];
  const body = sys.bodies.find((b) => b.name === sel) ?? sys.bodies[0];
  const Mguess = sys.M * Math.pow(10, s);
  const Mbody = massFrom(body.a * sys.aSI, body.T * sys.TSI);
  const ratio = Mguess / Mbody;
  const tSim = t * sys.warp; // display time units
  const aMax = Math.max(...sys.bodies.map((b) => b.a));
  const aMin = Math.min(...sys.bodies.map((b) => b.a));
  const TMin = Math.min(...sys.bodies.map((b) => b.T));
  const TMax = Math.max(...sys.bodies.map((b) => b.T));
  const xr = sysId === 'sgr' ? [100, 10000] : [aMin / 2, aMax * 2];
  const yr = sysId === 'sgr' ? [1, 300] : [TMin / 3, TMax * 3];
  const lawT = (aDisp: number) => (2 * Math.PI * Math.sqrt((aDisp * sys.aSI) ** 3 / (G * Mguess))) / sys.TSI;
  const line = sample(lawT, xr[0], xr[1], 60, true);
  const fitted = Math.abs(s) < 0.04;
  const jupiterDone = sysId === 'jupiter' && fitted;

  const orbitView = (
    <SpacePanel w={W} h={H} ariaLabel={`Orbits around ${sys.centre}.`} tags={[sysId === 'sgr' ? 'True shape, 1 s here = 1 year' : `Distances squashed to fit · 1 s here = ${sys.warp === 0.25 ? '3 months' : '1 day'}`]} tagsAt="tl" stars={80}>
      {sysId === 'sgr' ? (
        (() => {
          const b = sys.bodies[0];
          const e = b.e ?? 0;
          const A = RMAX * 1.05;
          const B = A * Math.sqrt(1 - e * e);
          const Mean = (2 * Math.PI * tSim) / b.T;
          const E = solveKepler(Mean % (2 * Math.PI), e);
          const x = A * (Math.cos(E) - e);
          const y = B * Math.sin(E);
          const ox = CX + 100;
          return (
            <g>
              <ellipse cx={ox - A * e} cy={CY} rx={A} ry={B} fill="none" stroke={TRAIL} strokeOpacity={0.5} />
              <circle cx={ox} cy={CY} r={5} fill="#000" stroke="#ffb46b" strokeWidth={2} />
              <text x={ox + 10} y={CY + 18} className="plot-note" fill="var(--m3)" fontWeight={700}>
                Sgr A*
              </text>
              <circle cx={ox + x} cy={CY - y} r={4.5} fill="#cfe0ff" />
              <text x={ox + x + 8} y={CY - y - 6} className="plot-note" fill="var(--text-2)">
                S2
              </text>
            </g>
          );
        })()
      ) : (
        <g>
          <circle cx={CX} cy={CY} r={sysId === 'sun' ? 8 : 10} fill={sysId === 'sun' ? '#f2b84b' : '#c9a27a'} />
          {sys.bodies.map((b) => {
            const R = RMAX * Math.sqrt(b.a / aMax);
            const ang = (2 * Math.PI * tSim) / b.T;
            const on = b.name === body.name;
            return (
              <g key={b.name}>
                <circle cx={CX} cy={CY} r={R} fill="none" stroke={on ? Q.s : TRAIL} strokeOpacity={on ? 0.9 : 0.25} />
                <circle cx={CX + R * Math.cos(ang)} cy={CY - R * Math.sin(ang)} r={on ? 5 : 3.5} fill={on ? '#fff' : '#cfd5de'} style={{ cursor: 'pointer' }} onClick={() => setSel(b.name)}>
                  <title>{b.name}</title>
                </circle>
                {on && (
                  <text x={CX + R * Math.cos(ang) + 8} y={CY - R * Math.sin(ang) - 6} className="plot-note" fill="var(--text)">
                    {b.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}
    </SpacePanel>
  );

  const visual = (
    <div ref={visRef} className="plot-stack">
      {orbitView}
      <div className="plot-caption">
        <b style={{ color: Q.t }}>Period</b> against <b style={{ color: Q.s }}>distance</b>, both on multiplying (log) scales. Dots: measured. Line: the law, for your guess of the <b style={{ color: Q.m }}>central mass</b>.
      </div>
      <Plot x={{ min: xr[0], max: xr[1], log: true, label: `distance (${sys.aUnit})` }} y={{ min: yr[0], max: yr[1], log: true, label: `period (${sys.TUnit})` }} height={200} ariaLabel="Orbital period against distance, log scales">
        <Line points={line} color={Q.m} width={2.5} />
        {sys.bodies.map((b) => (
          <Dot key={b.name} x={b.a} y={b.T} color={b.name === body.name ? Q.s : '#cfd5de'} r={b.name === body.name ? 5.5 : 4} label={sys.bodies.length <= 4 || b.name === body.name ? b.name : undefined} />
        ))}
      </Plot>
    </div>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Segmented<System['id']>
          size="sm"
          label="System"
          value={sysId}
          onChange={(v) => {
            setSys(v);
            setS(v === 'sgr' ? 0.8 : -0.6);
            setSel((SYSTEMS.find((q) => q.id === v) ?? SYSTEMS[0]).bodies[0].name);
          }}
          options={SYSTEMS.map((q) => ({ value: q.id, label: q.label }))}
        />
        <Slider
          label={`your guess for the mass of ${sys.centre}`}
          tex="\qm{M}"
          tip="slide until the line runs through the measured dots"
          value={s}
          min={-1.5}
          max={1.5}
          step={0.005}
          format={() => `${sci(Mguess, 3).replace(' \\times 10^{', '×10^').replace('}', '')} kg`}
          onChange={setS}
        />
        <div className="note">
          That's {suns(Mguess) >= 0.01 ? `${num(suns(Mguess), suns(Mguess) < 10 ? 2 : 0)} times the Sun's mass` : `${num(Mguess / 5.97e24, 0)} times the Earth's mass`}.
        </div>
      </div>
      <div className="ctl-group">
        <div className="ctl-title">Measure one orbit</div>
        <Select label="Orbiting body" value={body.name} onChange={setSel} options={sys.bodies.map((b) => ({ value: b.name, label: b.name }))} />
        <Readouts min={140}>
          <Readout tex="\qs{r}" tip="average distance from the centre" value={body.a} unit={sys.aUnit} sig={4} />
          <Readout tex="\qt{T}" tip="time for one orbit" value={body.T} unit={sys.TUnit} sig={4} />
          <Readout label="mass it implies" tip={`4π²r³/(GT²) for ${body.name}`} value={Mbody} unit="kg" sig={3} tone="m3" />
          <Readout label="your guess ÷ that" tip="1.00 means the line goes right through this dot" value={ratio} sig={3} tone={Math.abs(ratio - 1) < 0.1 ? 'ok' : undefined} />
        </Readouts>
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="Kepler's third law (Newton's version)"
          tex="\qt{T}^{2} = \frac{4\pi^{2}}{G\,\qm{M}}\,\qs{r}^{3}"
          say="The square of the orbit time is proportional to the cube of the distance, and the heavier the central body, the faster everything goes round it."
          where={[
            ['\\qt{T}', 'the time for one orbit (s)'],
            ['\\qs{r}', 'the orbit’s radius: its average distance from the centre (m)'],
            ['\\qm{M}', 'the mass of the body in the middle (kg); the orbiter’s own mass hardly matters'],
            ['G', 'the gravitational constant, $6.67 \\times 10^{-11}$'],
          ]}
          live={`\\qt{T} = 2\\pi\\sqrt{\\frac{(\\qs{${sci(body.a * sys.aSI)}})^3}{${sci(G)} \\times \\qm{${sci(Mguess)}}}} = \\qt{${num(lawT(body.a), 3)}}\\ \\text{${sys.TUnit}}`}
          liveNote={`With your guess for the mass. ${body.name} actually takes ${body.T} ${sys.TUnit}.`}
        />
        <Formula
          title="So: weigh the centre"
          tex="\qm{M} = \frac{4\pi^{2}\,\qs{r}^{3}}{G\,\qt{T}^{2}}"
          say="The same law, rearranged. Measure how big an orbit is and how long it takes, and out comes the mass of whatever is in the middle, even if you can't see it."
          where={[['\\qm{M},\\ \\qs{r},\\ \\qt{T}', 'as above, all in SI units (kg, m, s)']]}
          live={`\\qm{M} = \\frac{4\\pi^2 (\\qs{${sci(body.a * sys.aSI)}})^3}{${sci(G)} \\times (\\qt{${sci(body.T * sys.TSI)}})^2} = \\qm{${sci(Mbody)}}\\ \\text{kg}`}
          liveNote={`That's ${suns(Mbody) >= 0.01 ? `${num(suns(Mbody), suns(Mbody) < 10 ? 2 : 0)} Suns` : `${num(Mbody / 5.97e24, 0)} Earths`}. Your guess is ${num(ratio, 2)} times that.`}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="kp-twice"
          question="One planet is **twice** as far from its star as another. How much longer is its year?"
          options={['Twice as long', 'About 2.8 times as long', 'Four times as long', 'Eight times as long']}
          answer={1}
          fixedOrder
          explain="$T^2$ goes with $r^3$, so $T$ goes with $r^{3/2}$: $2^{1.5} = \sqrt{8} \approx 2.8$. Twice the distance means twice as far to go *and* a slower speed (gravity is weaker out there). Mars, at 1.52 times the Earth's distance, takes 1.88 years."
          tryIt="compare Earth and Mars in the list."
          onApply={() => {
            setSys('sun');
            setSel('Mars');
          }}
        />
        <WhatIf
          id="kp-own-mass"
          question="Jupiter is 318 times heavier than the Earth. If you swapped them, would the Earth's orbit take longer or shorter?"
          options={["Almost exactly the same: the planet's own mass barely matters", 'Much shorter: heavier planets are pulled harder', 'Much longer: heavier planets are harder to move', 'Twice as long']}
          answer={0}
          explain="A heavier planet is pulled harder, but is equally harder to accelerate; the two effects cancel, as they did for the heavy cannonball. Only the central mass counts. (Strictly, the law uses the *sum* of the two masses, but the Sun outweighs even Jupiter a thousand to one.)"
          tryIt="look at the Sun's planets: they all fall on one line, whatever their mass."
          onApply={() => {
            setSys('sun');
            setS(0);
            setSel('Jupiter');
          }}
        />
        <WhatIf
          id="kp-sgr"
          question="The star S2 circles the centre of our galaxy every 16 years, about 1000 times as far out as the Earth is from the Sun. How heavy is the invisible thing it orbits?"
          options={['About 4 million Suns', 'About 1000 Suns', 'About 1 billion Suns', 'About one Sun']}
          answer={0}
          explain="In Sun-masses, AU and years, the law becomes simply $M = r^3 / T^2$: $1000^3 / 16^2 \approx 4$ million. That much mass, in a region smaller than our solar system, emitting no light: a black hole. Measuring S2's orbit earned Reinhard Genzel and Andrea Ghez the 2020 Nobel Prize in Physics."
          tryIt="pick 'Galaxy's centre' and slide the mass onto S2."
          onApply={() => {
            setSys('sgr');
            setSel('star S2');
            setS(0);
          }}
        />
        <Challenge
          goal="Weigh **Jupiter** from its moons: slide the mass until the line runs through all four moons (within 10 %)."
          done={jupiterDone}
          hint="Pick 'Jupiter & moons', then watch the 'your guess ÷ that' readout for any moon: you want 1.00."
          success={`Jupiter: about ${sci(Mguess, 3).replace(' \\times 10^{', ' × 10^').replace('}', '')} kg, or ${num(Mguess / 5.97e24, 0)} Earths. Galileo discovered these four moons in 1610, the first things ever seen orbiting something other than the Earth.`}
        />
      </WhatIfs>
    </>
  );
}

export const kepler: BlockDef = {
  id: 'kepler-three',
  title: "Kepler's third law: weighing the Sun",
  hook: 'How can a stopwatch weigh a star?',
  explain: `Johannes Kepler spent years on Tycho Brahe's careful measurements of the planets, and in 1619 found a strange pattern: the **square** of a planet's year is proportional to the **cube** of its distance from the Sun. Further planets don't just have further to go; they move more slowly too.

Newton showed why. The pattern falls straight out of his law of gravity, and the number that sets it is the **mass of the body in the middle**. So time an orbit and measure its size, and you can weigh whatever sits at the centre: the Sun from the Earth's year, Jupiter from its moons, and the invisible thing at the heart of our galaxy from a star that circles it every 16 years.`,
  Sim: KeplerSim,
  maths: [
    {
      title: 'Reading a log–log graph',
      body: `On these axes, equal steps are equal *multiplications* (like the ladder in "Powers of ten"). A law like $T \\propto r^{1.5}$ then becomes a straight line whose slope is the power, 1.5: every 100 times further out means $100^{1.5} = 1000$ times longer to go round. Changing the central mass slides the whole line up or down without changing its slope.`,
    },
    {
      title: 'Rearranging to weigh',
      body: `Start from $T^2 = \\dfrac{4\\pi^2}{GM} r^3$. Multiply both sides by $M$ and divide both by $T^2$: $M = \\dfrac{4\\pi^2 r^3}{G T^2}$. Same law, now answering a different question.`,
    },
  ],
  deeper: `**A unit trick.** Measure distances in AU (the Earth–Sun distance), times in years and masses in Suns, and the law becomes $M = r^3/T^2$. For the Earth, $1^3/1^2 = 1$ Sun. Astronomers do this in their heads.

**Weighing galaxies, and finding what's missing.** In the 1970s Vera Rubin measured how fast stars orbit in the outskirts of galaxies. They move far too fast for the mass we can see: galaxies are about five times heavier than their stars and gas. The unseen mass is called **dark matter**, and nobody yet knows what it is.

**Exoplanets.** Thousands of planets around other stars are known. Timing how often a planet passes in front of its star, or how often it tugs the star to and fro, gives its year; Kepler's law then gives its distance.`,
  next: 'Kepler also found that orbits are ellipses, not circles. To see why, Medium starts by predicting an orbit the way a computer does: in tiny steps.',
};
