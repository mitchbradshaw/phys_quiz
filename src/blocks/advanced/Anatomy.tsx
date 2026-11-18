// Advanced 1: Anatomy of a black hole. Exact light paths in the plane around a non-spinning (Schwarzschild) black
// hole: a fan of parallel rays from the left, captured if aimed within 2.6 r_s of the centre (the shadow), plus one
// ray you aim yourself. Rings: event horizon r_s, photon sphere 1.5 r_s, innermost stable orbit 3 r_s. The picture
// is identical for every mass; only the scale changes.
// Colours: distances gold, mass green; light pale yellow, captured light red.
import { useMemo, useState } from 'react';
import type { BlockDef } from '../../content/types';
import { B_CRIT, meanDensity, MSUN, schwarzschild, traceRay } from '../../physics/blackhole';
import { Challenge, Formula, Formulas, num, sci, WhatIfs } from '../../ui/blockkit';
import { Q } from '../../ui/colors';
import { Readout, Readouts, Segmented, SimLayout, Slider, Toggle } from '../../ui/kit';
import { SpacePanel } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const W = 560;
const H = 420;
const CX = 300;
const CY = 210;
const K = 21; // px per r_s
const FAN = [0.4, 1.2, 2.0, 2.45, 2.56, 2.64, 2.8, 3.4, 4.5, 6, 8, 10.5];
const PRESETS = [
  { id: 'sun', label: 'Sun-mass', M: 1 },
  { id: 'stellar', label: 'Stellar (10 Suns)', M: 10 },
  { id: 'sgr', label: 'Sgr A*', M: 4.3e6 },
  { id: 'm87', label: 'M87*', M: 6.5e9 },
] as const;
type PresetId = (typeof PRESETS)[number]['id'];
const LIGHT = '#fff3b0';
const LOST = '#ff7a7a';

const fmtLen = (m: number) => (m < 1e3 ? `${num(m, 0)} m` : m < 1e6 ? `${num(m / 1000, m < 1e4 ? 1 : 0)} km` : m < 1e9 ? `${sci(m / 1000, 3).replace(' \\times 10^{', ' × 10^').replace('}', '')} km` : `${num(m / 1.496e11, m < 1.496e12 ? 2 : 0)} AU`);

function AnatomySim() {
  const [logM, setLogM] = useState(1); // log10 of mass in Suns
  const [b, setB] = useState(3.2);
  const [fan, setFan] = useState(true);
  const M = Math.pow(10, logM) * MSUN;
  const rs = schwarzschild(M);
  const fanRays = useMemo(() => FAN.flatMap((bb) => [traceRay(bb), traceRay(-bb)]), []);
  const mine = useMemo(() => traceRay(b), [b]);
  const pathOf = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(CX + x * K).toFixed(1)},${(CY - y * K).toFixed(1)}`).join('');
  const turns = (mine.sweep - Math.PI) / (2 * Math.PI);
  const loops = mine.fate === 'out' && mine.sweep > 3 * Math.PI;

  const visual = (
    <SpacePanel w={W} h={H} ariaLabel={`Light rays passing a black hole; your ray at ${b.toFixed(2)} r_s ${mine.fate === 'in' ? 'falls in' : 'escapes'}.`} tags={['Exact light paths', 'Every black hole looks like this, at its own scale']} tagsAt="tl" stars={60}>
      {/* shadow band on the incoming side */}
      <rect x={0} y={CY - B_CRIT * K} width={CX - 12 * K * 0.05} height={2 * B_CRIT * K} fill="rgba(255,122,122,0.06)" />
      <text x={8} y={CY - B_CRIT * K - 6} className="plot-note" fill={LOST} opacity={0.8}>
        aimed inside this band: captured
      </text>
      {fan &&
        fanRays.map((r, i) => (
          <path key={i} d={pathOf(r.pts)} fill="none" stroke={r.fate === 'in' ? LOST : LIGHT} strokeOpacity={r.fate === 'in' ? 0.45 : 0.35} strokeWidth={1.2} />
        ))}
      <circle cx={CX} cy={CY} r={3 * K} fill="none" stroke={Q.s} strokeDasharray="2 5" opacity={0.55} />
      <circle cx={CX} cy={CY} r={1.5 * K} fill="none" stroke={LIGHT} strokeDasharray="4 4" opacity={0.7} />
      <circle cx={CX} cy={CY} r={K * 1.12} fill="rgba(255,150,80,0.12)" />
      <circle cx={CX} cy={CY} r={K} fill="#000" stroke="#ff9a5a" strokeWidth={1.5} />
      <path d={pathOf(mine.pts)} fill="none" stroke={mine.fate === 'in' ? LOST : '#ffffff'} strokeWidth={2.4} />
      <text x={CX + 3 * K * 0.72 + 4} y={CY + 3 * K * 0.72 + 12} className="plot-note" fill={Q.s}>
        innermost stable orbit, 3 r_s
      </text>
      <text x={CX - 1.5 * K - 4} y={CY - 1.5 * K - 4} textAnchor="end" className="plot-note" fill={LIGHT}>
        photon sphere, 1.5 r_s
      </text>
      <text x={CX} y={CY + K + 16} textAnchor="middle" className="plot-note" fill="#ff9a5a">
        event horizon
      </text>
      {/* scale bar: 5 r_s */}
      <line x1={W - 20 - 5 * K} x2={W - 20} y1={H - 18} y2={H - 18} stroke={Q.s} strokeWidth={2} />
      <text x={W - 20 - 2.5 * K} y={H - 24} textAnchor="middle" className="plot-note" fill={Q.s}>
        5 r_s = {fmtLen(5 * rs)}
      </text>
    </SpacePanel>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Segmented<PresetId>
          size="sm"
          label="Black hole"
          value={(PRESETS.find((p) => Math.abs(Math.log10(p.M) - logM) < 0.01)?.id ?? 'sun') as PresetId}
          onChange={(id) => setLogM(Math.log10(PRESETS.find((p) => p.id === id)?.M ?? 1))}
          options={PRESETS.map((p) => ({ value: p.id, label: p.label }))}
        />
        <Slider label="mass" tex="\qm{M}" tip="in Suns" value={logM} min={0} max={10} step={0.01} format={(v) => `${sci(Math.pow(10, v), 2).replace(' \\times 10^{', '×10^').replace('}', '')} Suns`} onChange={setLogM} />
        <Slider label="aim your ray" tex="\qs{b}" tip="how far from the centre the ray is aimed, in units of r_s (the impact parameter)" value={b} min={0.1} max={8} step={0.0001} format={(v) => `${v.toFixed(4)} r_s`} onChange={setB} />
        <Toggle checked={fan} onChange={setFan} label="Show a fan of parallel rays" />
      </div>
      <div className="ctl-group">
        <Readouts min={150}>
          <Readout tex="\qs{r_s}" tip="Schwarzschild radius: the event horizon" value={rs / 1000} unit="km" sig={3} />
          <Readout label="shadow, across" tip="2 × 2.6 r_s: the dark disc a distant camera sees" value={(2 * B_CRIT * rs) / 1000} unit="km" sig={3} />
          <Readout label="average density" tip="mass ÷ volume inside the horizon" value={meanDensity(M)} unit="kg/m³" sig={2} />
          <Readout label="your ray" text={mine.fate === 'in' ? 'falls in' : turns >= 0.5 ? `escapes after ${num(turns, 1)} turns` : 'escapes, bent'} tone={mine.fate === 'in' ? 'bad' : undefined} />
        </Readouts>
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="The event horizon"
          tex="\qs{r_s} = \frac{2G\qm{M}}{c^{2}}"
          say="The Schwarzschild radius: Michell's dark-star size again, now from Einstein's general relativity. Inside it, every possible future path, even light's, leads inwards."
          where={[
            ['\\qs{r_s}', 'radius of the event horizon (m)'],
            ['\\qm{M}', 'the black hole’s mass (kg)'],
            ['G,\\ c', 'the gravitational constant and the speed of light'],
          ]}
          live={`\\qs{r_s} = \\frac{2 \\times ${sci(6.67e-11)} \\times \\qm{${sci(M)}}}{(3 \\times 10^{8})^2} = \\qs{${sci(rs, 3)}}\\ \\text{m}`}
        />
        <Formula
          title="How light moves near the hole"
          tex="\frac{d^{2}u}{d\varphi^{2}} + u = \frac{3}{2}\,\qs{r_s}\,u^{2}, \qquad u = \frac{1}{\qs{r}}"
          say="The shape of a light ray's path. With the right-hand side set to zero this is just a straight line; the extra term is general relativity's correction. Far away it bends light a little; at $r = 1.5\,r_s$ it can bend light into a complete circle (the photon sphere); and any ray aimed within $\tfrac{3\sqrt3}{2}\,r_s \approx 2.6\,r_s$ of the centre spirals in."
          where={[
            ['u', 'one over the distance from the centre, $1/r$'],
            ['\\varphi', 'angle around the black hole (phi)'],
            ['\\frac{d^2u}{d\\varphi^2}', 'how the bending of $u$ changes with angle: a second derivative'],
          ]}
          live={`\\qs{b} = \\qs{${b.toFixed(4)}}\\,r_s \\quad\\text{vs}\\quad \\qs{b_c} = \\tfrac{3\\sqrt3}{2}\\,r_s = 2.5981\\,r_s`}
          liveNote={mine.fate === 'in' ? 'Aimed inside the critical distance: your ray spirals in.' : `Aimed outside it: your ray escapes${turns >= 0.5 ? ` after ${num(turns, 1)} turns` : ', bent'}.`}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="bh-surface"
          question="A probe falls towards a huge black hole. What does it hit at the event horizon?"
          options={['Nothing: the horizon is not a surface, just the point of no return', 'A hard shell of crushed matter', 'A wall of light', 'The singularity']}
          answer={0}
          explain="The event horizon is a boundary in space-time, not a thing. Locally there's nothing to see or feel as you cross it: the probe's own clock ticks on normally. What changes is the future: after crossing, every direction in space-time leads inwards. (For a small black hole the stretching would kill you first: the next block.)"
        />
        <WhatIf
          id="bh-density"
          question="M87*, the black hole photographed in 2019, has 6.5 billion times the Sun's mass. What is its average density inside the horizon?"
          options={['Less than the air around you', 'Like a neutron star', 'Like lead', 'Infinite']}
          answer={0}
          explain="The horizon's radius grows with the mass, so the volume grows with mass *cubed*, and the average density falls as $1/M^2$. A Sun-mass black hole averages $2 \times 10^{19}$ kg/m³; M87* averages about 0.4 kg/m³, a third of the density of air. Black holes aren't defined by being dense, but by being *small for their mass*. (The 'average' is a curiosity: all the mass is thought to sit at the centre.)"
          tryIt="pick M87* and read the average density."
          onApply={() => setLogM(Math.log10(6.5e9))}
        />
        <WhatIf
          id="bh-photon"
          question="Aim a ray almost exactly at 2.6 r_s from the centre. What does the light do?"
          options={['Circles the hole one or more times before escaping or falling in', 'Bounces straight back', 'Passes straight through', 'Stops dead at the horizon']}
          answer={0}
          explain="Right at the critical aim, light is captured onto the photon sphere at 1.5 $r_s$ and can circle many times before peeling off. That makes the bright thin **photon ring** around the shadow in the Event Horizon Telescope images. Floating at the photon sphere, you could in principle see the back of your own head."
          tryIt="set your ray to 2.599 and watch it wrap."
          onApply={() => setB(2.599)}
        />
        <Challenge
          goal="Aim your ray so that it goes **all the way round** the black hole at least once and still escapes."
          done={loops}
          hint="Rays aimed further out than 2.5981 r_s escape. The closer you get to that number from above, the more they wind round first. Click the slider's value to type an exact aim."
          success={`Escaped after ${num(turns, 1)} turns, aimed at ${b.toFixed(4)} r_s. Each extra turn needs you to aim about 500 times more precisely: these windings are what make the photon ring in black-hole images so thin.`}
        />
      </WhatIfs>
    </>
  );
}

export const anatomy: BlockDef = {
  id: 'black-hole-anatomy',
  title: 'Anatomy of a black hole',
  hook: 'What is actually at the edge of a black hole, and what happens to light that passes close by?',
  explain: `General relativity says mass curves space-time, and things in free fall follow the straightest paths through it. Pack enough mass into a small enough region and the curvature closes over: inside a certain radius, the **event horizon** at $r_s = 2GM/c^2$, *every* path into the future leads inwards. Not even light comes back out. The horizon isn't a surface you'd hit; it's a point of no return.

Outside it, gravity bends light. Far away the bending is slight (it was first measured in 1919, starlight grazing the Sun during an eclipse). Closer in it grows extreme: at 1.5 $r_s$, the **photon sphere**, light can circle the hole. Any ray aimed within about 2.6 $r_s$ of the centre is captured, so a black hole in front of glowing gas casts a dark **shadow** 5.2 $r_s$ across, ringed by light that almost escaped. That is what the Event Horizon Telescope photographed in 2019 (M87*) and 2022 (Sagittarius A*, our own galaxy's).`,
  Sim: AnatomySim,
  maths: [
    {
      title: 'Reading the light-path equation',
      body: `Write the path as distance against angle, using $u = 1/r$. For a straight line, $u = \\sin\\varphi / b$, and its second derivative is $-u$: so $u'' + u = 0$ is the equation of a straight line. General relativity adds a small term, $\\tfrac32 r_s u^2$, which only matters close in (where $u$ is large). The sim solves this equation numerically, in tiny steps of angle, exactly the method of "How computers predict orbits".`,
    },
  ],
  deeper: `**Spinning black holes.** Real black holes spin, described by Roy Kerr's 1963 solution. Spin drags space round with it, pulls the innermost stable orbit closer and makes the shadow slightly lopsided. The Event Horizon Telescope images match spinning black holes.

**The innermost stable orbit.** Matter can orbit stably down to 3 $r_s$ for a non-spinning hole. Inside that, any orbit spirals in. Gas falling through this region heats to millions of degrees and shines brighter than whole galaxies: a **quasar**. Infall onto black holes is the most efficient power source known, up to about 40 % of the mass turned into energy, against 0.7 % for the fusion powering the Sun.

**What's in the middle?** General relativity predicts a *singularity*, where density becomes infinite. Most physicists read that as the theory breaking down, not as a description of reality. What really happens there needs a quantum theory of gravity, which nobody has yet.`,
  next: 'From a safe distance, a black hole bends light. What would it be like to fall in?',
};
