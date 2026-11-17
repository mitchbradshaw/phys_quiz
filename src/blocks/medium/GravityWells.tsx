// Medium 7: Gravity wells and dark stars. Throw a ball straight up: it climbs until the energy it has spent, the
// area under the pull-against-distance graph, equals the kinetic energy it started with. The whole area out to
// infinity is finite (GM/R per kg), so a big enough speed escapes for good. Squeeze a star (same mass, smaller
// radius) and its escape speed grows; at R = 2GM/c² it reaches the speed of light: Michell's "dark star" (1783).
// Colours: speed blue, pull/acceleration orange, distance gold, energy pink, mass green.
import { useMemo, useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { c as C_LIGHT, G } from '../../physics/constants';
import { Area, Dot, Line, Plot, Poly, sample, VLine } from '../../plot/Plot';
import { Challenge, Formula, Formulas, num, sci, WhatIfs } from '../../ui/blockkit';
import { Q } from '../../ui/colors';
import { Button, Readout, Readouts, Segmented, SimLayout, Slider, Toggle } from '../../ui/kit';
import { Rich } from '../../ui/Rich';
import { SpacePanel } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const BODIES = [
  { id: 'earth', name: 'Earth', M: 5.97e24, R: 6.371e6, col: '#2f6fa3' },
  { id: 'moon', name: 'Moon', M: 7.35e22, R: 1.737e6, col: '#8d8d8d' },
  { id: 'sun', name: 'Sun', M: 1.99e30, R: 6.96e8, col: '#f2b84b' },
  { id: 'ns', name: 'neutron star', M: 2.8e30, R: 1.2e4, col: '#b9c8ff' },
] as const;
type BodyId = (typeof BODIES)[number]['id'];
const XMAX = 10; // plot out to 10 radii

function WellsSim() {
  const [bid, setBid] = useState<BodyId>('earth');
  const [lsq, setLsq] = useState(0); // log10 of the squeeze factor (0 = real size)
  const [u, setU] = useState(0.9); // launch speed ÷ escape speed
  const [slices, setSlices] = useState(false);
  const [n, setN] = useState(8);
  const [s, setS] = useState({ x: 1, v: 0, t: 0, flying: false });
  const visRef = useRef<HTMLDivElement>(null);
  const b = BODIES.find((q) => q.id === bid) ?? BODIES[0];
  const R = b.R * Math.pow(10, lsq);
  const vesc = Math.sqrt((2 * G * b.M) / R);
  const rs = (2 * G * b.M) / (C_LIGHT * C_LIGHT);
  const dark = R <= rs;
  const minL = Math.log10((0.5 * rs) / b.R);
  // motion in units: x = r/R, speed in units of v0 = √(GM/R) = vesc/√2, time in √(R³/GM)
  const w0 = u * Math.SQRT2; // launch speed in v0 units

  useRaf(
    (dt) =>
      setS((c) => {
        if (!c.flying) return c;
        let { x, v, t } = c;
        const h = (dt * 1.2) / 20;
        for (let i = 0; i < 20; i++) {
          // leapfrog for x'' = −1/x²
          v += (-1 / (x * x)) * (h / 2);
          x += v * h;
          v += (-1 / (x * x)) * (h / 2);
          t += h;
        }
        if (x <= 1) return { x: 1, v: 0, t, flying: false };
        if (x > XMAX * 1.5) return { x, v, t, flying: false };
        return { x, v, t, flying: true };
      }),
    s.flying,
    visRef
  );
  const launch = () => setS({ x: 1, v: w0, t: 0, flying: true });

  const xTop = u < 1 ? 1 / (1 - u * u) : Infinity; // highest point, in radii
  const spent = 1 - 1 / s.x; // energy spent climbing, in units of GM/R per kg
  const pull = useMemo(() => sample((x) => 1 / (x * x), 1, XMAX, 200), []);
  const shade = useMemo(() => sample((x) => 1 / (x * x), 1, Math.max(1.0001, Math.min(s.x, XMAX)), 80), [s.x]);
  const sliceRects = useMemo(() => {
    if (!slices) return [];
    const dx = (XMAX - 1) / n;
    return Array.from({ length: n }, (_, i) => {
      const x0 = 1 + i * dx;
      const h = 1 / (x0 * x0);
      return [
        [x0, 0],
        [x0 + dx, 0],
        [x0 + dx, h],
        [x0, h],
      ] as [number, number][];
    });
  }, [slices, n]);
  const sliceSum = slices ? Array.from({ length: n }, (_, i) => 1 / (1 + (i * (XMAX - 1)) / n) ** 2).reduce((p, q) => p + q, 0) * ((XMAX - 1) / n) : 0;
  const escaped = !s.flying && s.x > XMAX;
  const challengeDone = bid === 'sun' && dark;

  const body = (
    <SpacePanel w={560} h={150} ariaLabel={`${b.name}${lsq < 0 ? ', squeezed' : ''}: escape speed ${(vesc / 1000).toFixed(1)} km/s.`} tags={['Distances from the centre, in radii']} tagsAt="tr" stars={50}>
      <circle cx={40} cy={80} r={dark ? 26 : 30} fill={dark ? '#000' : b.col} stroke={dark ? '#ffb46b' : 'rgba(255,255,255,0.4)'} strokeWidth={dark ? 2 : 1} />
      {Array.from({ length: XMAX }, (_, i) => i + 1).map((x) => (
        <g key={x}>
          <line x1={40 + (x - 1) * 54 + 30} x2={40 + (x - 1) * 54 + 30} y1={112} y2={120} stroke="rgba(255,255,255,0.3)" />
          <text x={40 + (x - 1) * 54 + 30} y={134} textAnchor="middle" className="plot-note" fill="var(--text-3)">
            {x}R
          </text>
        </g>
      ))}
      <line x1={70} x2={550} y1={116} y2={116} stroke="rgba(255,255,255,0.2)" />
      {!dark && <circle cx={Math.min(560, 40 + (s.x - 1) * 54 + 30)} cy={80} r={6} fill="#cfd5de" stroke="#fff" />}
      {!dark && u < 1 && xTop < XMAX && <line x1={40 + (xTop - 1) * 54 + 30} x2={40 + (xTop - 1) * 54 + 30} y1={62} y2={98} stroke={Q.s} strokeDasharray="3 3" />}
      <text x={16} y={24} className="plot-note" fill="var(--text-2)" fontWeight={700}>
        {dark ? `${b.name} squeezed inside 2GM/c²: a dark star` : `${b.name}${lsq < 0 ? ` squeezed to ${sci(R / 1000, 2).replace(' \\times 10^{', '×10^').replace('}', '')} km across radius` : ''}`}
      </text>
    </SpacePanel>
  );

  const visual = (
    <div ref={visRef} className="plot-stack">
      {body}
      <div className="plot-caption">
        <b style={{ color: Q.a }}>Gravity's pull</b> per kg against distance (in units of the surface pull). The <b style={{ color: Q.E }}>shaded area</b> is the energy the ball has spent climbing.
      </div>
      <Plot x={{ min: 1, max: XMAX, label: 'distance from the centre (radii)' }} y={{ min: 0, max: 1.05, label: 'pull ÷ surface pull' }} height={190} ariaLabel="Pull against distance, with the energy spent shaded">
        {sliceRects.map((pts, i) => (
          <Poly key={i} pts={pts} fill={Q.E} opacity={0.18} stroke={Q.E} />
        ))}
        {!slices && s.x > 1 && <Area points={shade} base={0} color={Q.E} opacity={0.35} />}
        <Line points={pull} color={Q.a} width={2.5} />
        {u < 1 && xTop <= XMAX && <VLine x={xTop} color={Q.s} label="top" />}
        {s.x <= XMAX && <Dot x={s.x} y={1 / (s.x * s.x)} color="#cfd5de" />}
      </Plot>
    </div>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Segmented<BodyId>
          size="sm"
          label="Body"
          value={bid}
          onChange={(v) => {
            setBid(v);
            setLsq(0);
            setS({ x: 1, v: 0, t: 0, flying: false });
          }}
          options={BODIES.map((q) => ({ value: q.id, label: q.name }))}
        />
        <Slider label="launch speed ÷ escape speed" tex="\qv{v}/\qv{v_{\text{esc}}}" tip="1.00 is exactly escape speed" value={u} min={0.1} max={1.3} step={0.01} sig={3} onChange={(x) => { setU(x); setS({ x: 1, v: 0, t: 0, flying: false }); }} />
        <Button variant="primary" onClick={launch} disabled={dark}>
          Throw it straight up
        </Button>
        <Toggle checked={slices} onChange={setSlices} label="Show the area as thin slices" />
        {slices && <Slider label="number of slices" value={n} min={2} max={60} step={1} sig={2} onChange={(x) => setN(Math.round(x))} />}
      </div>
      <div className="ctl-group">
        <div className="ctl-title">Squeeze it (same mass, smaller size)</div>
        <Slider label="radius" tex="\qs{R}" tip="squeezing keeps the mass and shrinks the radius" value={lsq} min={minL} max={0} step={0.01} format={(v) => (v === 0 ? 'real size' : `÷ ${sci(Math.pow(10, -v), 2).replace(' \\times 10^{', '×10^').replace('}', '')}`)} onChange={(x) => { setLsq(x); setS({ x: 1, v: 0, t: 0, flying: false }); }} />
        <Readouts min={140}>
          <Readout tex="\qv{v_{\text{esc}}}" tip="escape speed from the surface" value={vesc / 1000} unit="km/s" sig={3} />
          <Readout label="that's" tip="as a fraction of the speed of light" value={Math.min(vesc / C_LIGHT, 99)} unit="× light" sig={3} tone={dark ? 'bad' : undefined} />
          <Readout tex="\qs{R_s} = 2G\qm{M}/c^2" tip="the radius at which escape speed reaches light speed" value={rs} unit="m" sig={3} />
          <Readout label="highest point" tip="for your launch speed" value={u < 1 ? xTop : Infinity} unit="radii" sig={3} text={u >= 1 ? 'never comes back' : undefined} />
        </Readouts>
        {slices && <Rich className="note" text={`Slices add up to **${num(sliceSum, 3)}**; the exact area out to 10 radii is **0.900**, and out to infinity it is exactly **1**.`} />}
        {escaped && <div className="note">Gone: it had more energy than the whole area under the curve, all the way to infinity.</div>}
        {s.x > 1 && <div className="note">Energy spent climbing so far: {num(spent * 100, 0)} % of what it takes to escape.</div>}
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="Climbing out: add up the pull"
          tex="\qe{E_{\text{escape}}} = \int_{\qs{R}}^{\infty} \frac{G\qm{M}\qm{m}}{\qs{r}^{2}}\,d\qs{r} = \frac{G\qm{M}\qm{m}}{\qs{R}}"
          say="Climbing a short distance $dr$ against a pull $F$ costs $F\,dr$ of energy: a thin slice under the pull-against-distance graph. Add up all the slices from the surface to infinity (the integral). Because the pull fades so fast, the total is **finite**: there is a top to the well."
          where={[
            ['\\qe{E_{\\text{escape}}}', 'the energy needed to climb out for good (J)'],
            ['\\int_{R}^{\\infty}', 'add up slices from the surface ($R$) out to infinity'],
            ['\\qm{M},\\ \\qm{m}', 'the planet’s and the ball’s masses'],
            ['\\qs{r}', 'distance from the centre'],
          ]}
        />
        <Formula
          title="Escape speed, and the dark star"
          tex="\tfrac12\qm{m}\qv{v_{\text{esc}}}^{2} = \frac{G\qm{M}\qm{m}}{\qs{R}} \;\Rightarrow\; \qv{v_{\text{esc}}} = \sqrt{\frac{2G\qm{M}}{\qs{R}}} \qquad \qv{v_{\text{esc}}} = c \;\Leftrightarrow\; \qs{R} = \frac{2G\qm{M}}{c^{2}}"
          say="Escape if your kinetic energy covers the climb. Note the mass $m$ cancels: a feather and a rocket need the same speed. Squeeze the planet and $v_{\text{esc}}$ grows; when it reaches the speed of light, nothing can climb out."
          where={[
            ['\\qv{v_{\\text{esc}}}', 'escape speed from the surface'],
            ['c', 'the speed of light, $3 \\times 10^{8}$ m/s'],
          ]}
          live={`\\qv{v_{\\text{esc}}} = \\sqrt{\\frac{2 \\times ${sci(G)} \\times \\qm{${sci(b.M)}}}{\\qs{${sci(R)}}}} = \\qv{${sci(vesc, 3)}}\\ \\text{m/s}`}
          liveNote={`For the ${b.name}, the dark-star radius is ${rs < 1 ? `${num(rs * 1000, 1)} mm` : rs < 1e4 ? `${num(rs / 1000, 2)} km` : `${num(rs / 1000, 0)} km`}.`}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="gw-half"
          question="Throw the ball up at **half** of escape speed. How high does it get?"
          options={['A third of a radius above the surface', 'Half way to escaping: very high', 'Exactly one radius up', 'A quarter of a radius up']}
          answer={0}
          explain="Half the speed is a quarter of the energy ($\tfrac12 mv^2$), and the area under the curve reaches a quarter of the total by $r = 4/3\,R$: a third of a radius above the ground. Energy, not speed, decides height: the last few percent of speed buys most of the climb."
          tryIt="launch speed 0.50 and throw."
          onApply={() => {
            setU(0.5);
            setS({ x: 1, v: 0.5 * Math.SQRT2, t: 0, flying: true });
          }}
        />
        <WhatIf
          id="gw-earth"
          question="Earth's escape speed is 11.2 km/s. Does a rocket really have to reach that speed to leave Earth?"
          options={['No: that speed is for a coasting object. A rocket can keep pushing and climb slowly', 'Yes, always', 'No: it only needs orbital speed, 7.9 km/s', 'No: it needs the speed of light']}
          answer={0}
          explain="Escape speed is for something launched and then left to coast, like the ball. A rocket that keeps firing can climb as slowly as it likes; what it must supply, in the end, is the same total energy. In practice rockets burn hard and early (fighting gravity costs fuel every second), so real departures from Earth do reach about 11 km/s."
        />
        <WhatIf
          id="gw-michell"
          question="In 1783 John Michell asked: what if a star were so compact that its escape speed exceeded the speed of light? How small would the Sun have to be?"
          options={['About 3 km in radius', 'About 3000 km', 'About the size of the Earth', "It can't happen"]}
          answer={0}
          fixedOrder
          explain="Set $v_{\text{esc}} = c$ and solve: $R = 2GM/c^2$, about 3 km for the Sun's mass. Michell imagined light as particles that would fall back, and called such stars 'dark'. Einstein's general relativity, a century and a half later, gave exactly the same radius for a black hole's edge, for different reasons: there, light doesn't fall back; it has nowhere outward to go."
          tryIt="pick the Sun and squeeze it."
          onApply={() => {
            setBid('sun');
            setLsq(Math.log10((0.9 * (2 * G * 1.99e30)) / (C_LIGHT * C_LIGHT) / 6.96e8));
            setS({ x: 1, v: 0, t: 0, flying: false });
          }}
        />
        <Challenge
          goal="Turn the **Sun** into a dark star: squeeze it until not even light could escape."
          done={challengeDone}
          hint="Keep its mass, shrink its radius. Watch 'that's … × light' reach 1."
          success={`Dark. All of the Sun's mass inside ${num(rs / 1000, 2)} km. Nothing about the Sun will ever do this (it isn't heavy enough), but stars over about 20 times its mass can end their lives this way.`}
        />
      </WhatIfs>
    </>
  );
}

export const gravityWells: BlockDef = {
  id: 'gravity-wells',
  title: 'Gravity wells and dark stars',
  hook: 'How fast must you go to never come back, and what if the answer were the speed of light?',
  explain: `Throw a ball up and it slows, stops and falls back. Throw it faster and it climbs higher, and because gravity weakens with height, each extra metre costs a little less than the last. Add up the cost of every metre all the way to infinity (an **integral**: the area under the pull-against-distance graph) and the total comes out **finite**. Any ball launched with more energy than that never comes back. The speed that just does it is the **escape speed**, $v = \sqrt{2GM/R}$: 11.2 km/s from the Earth.

Now keep the mass and squeeze the planet smaller. The surface sits deeper in the well, and escape gets harder. In 1783 the English clergyman John Michell noticed that a star squeezed small enough would need an escape speed faster than light. It would be dark: a **dark star**. He had found, with Newton's physics, the size of a black hole.`,
  Sim: WellsSim,
  maths: [
    {
      title: 'Why the area under 1/r² is finite',
      body: `From 1 to 2, the area under $1/r^2$ is $\\tfrac12$. From 2 to 4: $\\tfrac14$. From 4 to 8: $\\tfrac18$, and so on: each doubling of distance adds half as much as the one before. $\\tfrac12 + \\tfrac14 + \\tfrac18 + \\dots$ never exceeds 1. In integral notation, $\\int_1^\\infty r^{-2}\\,dr = 1$. (Try the same with $1/r$ and each doubling adds the same amount: the total grows forever, and nothing could ever escape.)`,
    },
  ],
  deeper: `**The deepest well you can stand on.** A neutron star packs more than a Sun's mass into a ball about 20 km across. Its escape speed is about half the speed of light, and a marshmallow dropped onto it would hit with the energy of a small nuclear bomb.

**Michell's dark stars.** John Michell (1783) and Pierre-Simon Laplace (1796) both predicted invisible stars, then the idea was forgotten for over a century, when light came to be seen as a wave. In 1916 Karl Schwarzschild found the same radius in Einstein's general relativity, worked out while he was serving on the Russian front in the First World War. That radius now bears his name.

**Escape speed from everywhere.** The Sun's surface: 618 km/s. Escaping the Sun from the Earth's distance: 42 km/s. Escaping the Milky Way from here: about 550 km/s.`,
  next: "Michell's dark star needs light to have a speed. Strangely, everyone measures exactly the same speed for light, and that changes everything about time.",
};
