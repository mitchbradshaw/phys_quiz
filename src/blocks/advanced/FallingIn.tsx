// Advanced 2: Falling in. Exact radial free fall from rest at 10 r_s into a Schwarzschild black hole, shown twice,
// each on its own clock at the same playback rate: the faller (proper time τ: crosses the horizon and reaches the
// centre in finite time) and a distant watcher (who receives the faller's light later and later, redder and dimmer,
// and never sees the crossing). Tidal stretch across a 2 m body depends on the mass: deadly for small holes,
// gentle for giants. Units inside: r_s = c = 1. Colours: times purple, distances gold, stretching orange.
import { useMemo, useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { c } from '../../physics/constants';
import { MSUN, schwarzschild } from '../../physics/blackhole';
import { Challenge, Formula, Formulas, num, sci, WhatIfs } from '../../ui/blockkit';
import { Q } from '../../ui/colors';
import { Button, Readout, Readouts, SimLayout, Slider } from '../../ui/kit';
import { SpacePanel } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const R0 = 10; // start, r_s
const A = Math.sqrt(R0 - 1);
const ETA_H = 2 * Math.atan(A); // horizon
const rOf = (eta: number) => (R0 / 2) * (1 + Math.cos(eta));
const tauOf = (eta: number) => (Math.pow(R0, 1.5) / 2) * (eta + Math.sin(eta));
/** Schwarzschild time (MTW 31.10 with r_s = 1). Diverges at the horizon. */
const tOf = (eta: number) => Math.log(Math.abs((A + Math.tan(eta / 2)) / (A - Math.tan(eta / 2)))) + A * (eta + (R0 / 2) * (eta + Math.sin(eta)));
const rStar = (r: number) => r + Math.log(r - 1);
/** When the distant watcher receives light emitted at eta (0 when light from the release arrives). */
const tObsOf = (eta: number) => tOf(eta) - rStar(rOf(eta)) + rStar(R0);
const TAU_H = tauOf(ETA_H);
const TAU_END = tauOf(Math.PI);
const L_BODY = 2; // m
const G_EARTH = 9.8;

function etaFor(f: (e: number) => number, target: number, hi: number) {
  let lo = 0;
  let h = hi;
  for (let i = 0; i < 60; i++) {
    const m = (lo + h) / 2;
    if (f(m) < target) lo = m;
    else h = m;
  }
  return (lo + h) / 2;
}

const W = 560;
const H = 400;
const Y_TOP = 40;
const Y_BOT = 370;
const yOf = (r: number) => Y_BOT - (r / R0) * (Y_BOT - Y_TOP);

function Figure({ x, y, stretch, color, opacity = 1 }: { x: number; y: number; stretch: number; color: string; opacity?: number }) {
  const s = Math.min(5, stretch);
  return (
    <g transform={`translate(${x} ${y}) scale(${1 / Math.sqrt(s)} ${s})`} opacity={opacity}>
      <circle cx={0} cy={-11} r={3.4} fill={color} />
      <rect x={-3} y={-7} width={6} height={9} rx={2} fill={color} />
      <line x1={-2} y1={2} x2={-3} y2={10} stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      <line x1={2} y1={2} x2={3} y2={10} stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </g>
  );
}

/** Rough colour of light whose wavelength has been stretched by (1 + z), starting green. */
function shiftedColour(onePlusZ: number) {
  const lam = 530 * onePlusZ; // nm
  if (lam < 580) return '#7dff9a';
  if (lam < 620) return '#ffd25a';
  if (lam < 700) return '#ff6a4a';
  return '#7a2a2a';
}

function FallingSim() {
  const [logM, setLogM] = useState(Math.log10(4.3e6)); // start with Sagittarius A*: a gentle fall
  const [s, setS] = useState(0); // playback clock, in units of r_s/c on each observer's own clock
  const [playing, setPlaying] = useState(true);
  const visRef = useRef<HTMLDivElement>(null);
  const rate = TAU_END / 9; // the whole fall plays in 9 s
  useRaf(
    (dt) =>
      setS((c0) => {
        const n = c0 + dt * rate;
        if (n > TAU_END * 2.2) {
          setPlaying(false);
          return c0;
        }
        return n;
      }),
    playing,
    visRef
  );

  const M = Math.pow(10, logM) * MSUN;
  const rs = schwarzschild(M);
  const unit = rs / c; // seconds per r_s/c
  // faller (own clock)
  const tauNow = Math.min(s, TAU_END);
  const etaF = etaFor(tauOf, tauNow, Math.PI);
  const rF = rOf(etaF);
  const inside = rF < 1;
  // watcher (own clock): find the emission whose light arrives now
  const etaW = useMemo(() => etaFor(tObsOf, s, ETA_H * (1 - 1e-12)), [s]);
  const rW = rOf(etaW);
  const dE = 1e-6;
  const onePlusZ = Math.max(1, (tObsOf(Math.min(etaW + dE, ETA_H * (1 - 1e-13))) - tObsOf(etaW)) / (tauOf(etaW + dE) - tauOf(etaW)));
  const dim = Math.min(1, 1 / (onePlusZ * onePlusZ));
  // tides at the faller's radius: Δa = c² L / (r_s² x³)
  const tideAt = (x: number) => (c * c * L_BODY) / (rs * rs * x * x * x);
  const tideNow = tideAt(Math.max(rF, 0.05));
  const tideH = tideAt(1);
  const stretchVis = Math.min(5, 1 + Math.log10(1 + tideNow / G_EARTH) * 0.8);
  const hoverRate = (r: number) => Math.sqrt(1 - 1 / r);
  const threshold = Math.abs(tideH / G_EARTH - 9) <= 1;

  const half = (x0: number, title: string, sub: string, body: React.ReactNode) => (
    <g>
      <text x={x0 + 10} y={20} fontSize={13} fontWeight={700} fill="var(--text)">
        {title}
      </text>
      <text x={x0 + 10} y={34} className="plot-note" fill="var(--text-2)">
        {sub}
      </text>
      <rect x={x0} y={yOf(1)} width={W / 2} height={Y_BOT - yOf(1) + 30} fill="#000" />
      <line x1={x0} x2={x0 + W / 2} y1={yOf(1)} y2={yOf(1)} stroke="#ff9a5a" strokeWidth={2} />
      <text x={x0 + W / 2 - 8} y={yOf(1) - 6} textAnchor="end" className="plot-note" fill="#ff9a5a">
        event horizon
      </text>
      {[2, 4, 6, 8, 10].map((r) => (
        <g key={r}>
          <line x1={x0} x2={x0 + 8} y1={yOf(r)} y2={yOf(r)} stroke="rgba(255,255,255,0.3)" />
          <text x={x0 + 11} y={yOf(r) + 4} className="plot-note" fill="var(--text-3)">
            {r} r_s
          </text>
        </g>
      ))}
      {body}
    </g>
  );

  const visual = (
    <div ref={visRef}>
      <SpacePanel w={W} h={H} ariaLabel={`Fall from 10 r_s: the faller is at ${rF.toFixed(2)} r_s; the distant watcher sees them at ${rW.toFixed(3)} r_s.`} tags={[]} stars={50}>
        <line x1={W / 2} x2={W / 2} y1={0} y2={H} stroke="rgba(255,255,255,0.15)" />
        {half(
          0,
          'The faller',
          `own clock: ${num(tauNow * unit < 1 ? tauNow * unit * 1000 : tauNow * unit, 2)} ${tauNow * unit < 1 ? 'ms' : 's'}`,
          <>
            <Figure x={W / 4} y={yOf(rF)} stretch={stretchVis} color={inside ? '#9aa0aa' : '#e8ebf0'} opacity={inside ? 0.6 : 1} />
            {inside && (
              <text x={W / 4} y={yOf(1) + 30} textAnchor="middle" className="plot-note" fill="var(--text-2)">
                inside: every path leads inwards
              </text>
            )}
          </>
        )}
        {half(
          W / 2,
          'A watcher far away',
          `own clock: ${num(s * unit < 1 ? s * unit * 1000 : s * unit, 2)} ${s * unit < 1 ? 'ms' : 's'}`,
          <>
            <Figure x={(3 * W) / 4} y={yOf(rW)} stretch={1} color={shiftedColour(onePlusZ)} opacity={Math.max(0.05, dim)} />
            <text x={(3 * W) / 4} y={yOf(1) + 30} textAnchor="middle" className="plot-note" fill="var(--text-2)">
              {onePlusZ > 3 ? 'frozen, fading, reddening: never seen to cross' : 'light arrives later and later'}
            </text>
          </>
        )}
      </SpacePanel>
    </div>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Slider label="black hole's mass" tex="\qm{M}" tip="in Suns" value={logM} min={0} max={10} step={0.01} format={(v) => `${sci(Math.pow(10, v), 2).replace(' \\times 10^{', '×10^').replace('}', '')} Suns`} onChange={setLogM} />
        <div className="row gap-s wrap">
          <Button size="sm" variant="primary" onClick={() => { setS(0); setPlaying(true); }}>
            Fall again
          </Button>
          <Button size="sm" onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause' : 'Play'}
          </Button>
        </div>
        <div className="note">Each half plays on its own observer's clock, at the same rate. The fall starts from rest at 10 r_s.</div>
      </div>
      <div className="ctl-group">
        <Readouts min={150}>
          <Readout label="faller reaches the horizon" tip="on the faller's own clock" value={TAU_H * unit} unit="s" sig={3} />
          <Readout label="…and the centre" tip="on the faller's own clock" value={TAU_END * unit} unit="s" sig={3} />
          <Readout label="watcher sees the light stretched" tip="1 + z: how much slower and redder the faller's light arrives" value={onePlusZ} unit="×" sig={3} />
          <Readout label="stretch across a 2 m body" tip="difference in pull between head and feet, right now" value={tideNow / G_EARTH} unit="g" sig={3} tone={tideNow > 100 * G_EARTH ? 'bad' : undefined} />
          <Readout label="…at the horizon" value={tideH / G_EARTH} unit="g" sig={3} tone={tideH > 10 * G_EARTH ? 'bad' : 'ok'} />
          <Readout label="clock hovering at 1.5 r_s" tip="its rate compared with a clock far away" value={hoverRate(1.5) * 100} unit="%" sig={3} />
        </Readouts>
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="Clocks deep in the well run slow"
          tex="\Delta\qt{\tau} = \Delta\qt{t}\,\sqrt{1 - \frac{\qs{r_s}}{\qs{r}}}"
          say="A clock hovering at distance $r$ ticks slower than one far away, and the slowing grows without limit towards the horizon, where a hovering clock would stop altogether. Light climbing out loses energy in step: it arrives redder."
          where={[
            ['\\Delta\\qt{\\tau}', 'time on the hovering clock'],
            ['\\Delta\\qt{t}', 'the matching time on a clock far away'],
            ['\\qs{r}', 'distance from the centre'],
            ['\\qs{r_s}', 'the Schwarzschild radius'],
          ]}
          live={`\\text{at } \\qs{${num(Math.max(rF, 1.0001), 2)}}\\,r_s: \\quad \\sqrt{1 - 1/${num(Math.max(rF, 1.0001), 2)}} = ${num(hoverRate(Math.max(rF, 1.0001)), 3)}`}
          liveNote="That's for a clock hovering there. The faller's clock runs slower still, as seen from afar, because it's also moving fast."
        />
        <Formula
          title="Spaghettification"
          tex="\Delta\qa{a} \approx \frac{2G\qm{M}\,\qs{L}}{\qs{r}^{3}} \quad\Rightarrow\quad \Delta\qa{a}_{\text{horizon}} = \frac{c^{2}\qs{L}}{\qs{r_s}^{2}} \propto \frac{1}{\qm{M}^{2}}"
          say="The tide from Medium, across a body of length $L$. At the horizon, $r = r_s$ grows with the mass, so the stretch there falls as one over the mass squared: small black holes shred you outside the horizon, giant ones let you cross untroubled."
          where={[
            ['\\Delta\\qa{a}', 'difference in pull between your head and your feet'],
            ['\\qs{L}', 'your height, 2 m'],
          ]}
          live={`\\Delta\\qa{a}_{\\text{horizon}} = \\frac{(3\\times10^8)^2 \\times 2}{(\\qs{${sci(rs, 3)}})^2} = \\qa{${sci(tideH, 2)}}\\ \\text{m/s}^2`}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="fi-watch"
          question="Your friend watches from far away as you fall in. What do they see when you reach the horizon?"
          options={['You slow down, redden and fade, and never quite seem to cross', 'You vanish in a flash', 'You speed up and disappear', 'You bounce off']}
          answer={0}
          explain="Light from close to the horizon takes longer and longer to climb out, and arrives more and more stretched. Your image creeps towards the horizon, slows, reddens through infrared to radio, and fades: it never visibly crosses. Meanwhile, on your own watch, you cross in finite time and notice nothing special there. Both accounts are correct, for their own clocks."
          tryIt="press 'Fall again' and compare the two halves."
          onApply={() => {
            setS(0);
            setPlaying(true);
          }}
        />
        <WhatIf
          id="fi-spag"
          question="Which black hole would stretch you apart **before** you reached its horizon?"
          options={['A 10 Sun-mass one', 'Sagittarius A* (4 million Suns)', 'Both', 'Neither']}
          answer={0}
          explain="At the horizon of a 10 Sun-mass black hole, the difference in pull between your head and feet is about 20 million g: you'd be stretched into a stream of atoms ('spaghettified') well outside the horizon. At Sagittarius A*, the horizon stretch is about a ten-thousandth of a g. You'd sail across, and only meet the shredding far inside."
          tryIt="compare the 'at the horizon' readout for 10 Suns and 4 million Suns."
          onApply={() => setLogM(Math.log10(4.3e6))}
        />
        <WhatIf
          id="fi-hover"
          question="Hovering in a rocket at 1.5 r_s, how fast does your clock run compared with a friend far away?"
          options={['About 58 % of their rate', '50 %', 'The same', 'Faster than theirs']}
          answer={0}
          fixedOrder
          explain="$\sqrt{1 - 1/1.5} = \sqrt{1/3} \approx 0.58$. Every hour you spend there, your friend lives about 1 h 44 min. (Hovering that close would need an absurd rocket: your weight there is enormous.) GPS satellites feel a tiny version of the same effect: their clocks run *faster* than ours because they sit higher in the Earth's well."
        />
        <Challenge
          goal="Find a black hole whose horizon stretches a 2 m body by about **9 g** (between 8 and 10 g): roughly the heaviest that would still spaghettify you."
          done={threshold}
          hint="The stretch at the horizon falls as one over the mass squared. 10 Suns gives about 20 million g, so you need a mass about √(2 million) ≈ 1500 times bigger."
          success={`About ${sci(Math.pow(10, logM), 2).replace(' \\times 10^{', ' × 10^').replace('}', '')} Suns. Any heavier and the horizon is gentle; any lighter and the tides kill first.`}
        />
      </WhatIfs>
    </>
  );
}

export const fallingIn: BlockDef = {
  id: 'falling-in',
  title: 'Falling in',
  hook: 'What would you see, and feel, falling into a black hole, and what would someone watching from far away see?',
  explain: `Two people, two clocks, two true stories. **You**, falling in from rest at 10 $r_s$, reach the horizon in a perfectly finite time on your own watch, cross it without any bump, and reach the centre shortly after. **A friend** watching from far away never sees you cross. Near the horizon, time (as measured from far away) slows without limit: the light you send takes longer and longer to climb out, arriving ever redder and dimmer. Your image freezes at the edge and fades from view.

What you **feel** depends on the size of the hole. Gravity's pull changes across your body (the tide from Medium), and near a small black hole that difference is lethal: you'd be stretched head to foot and squeezed side to side, physicists' word for it being *spaghettification*. But the horizon of a giant black hole is wide and gentle: you could cross it and not notice for a while.`,
  Sim: FallingSim,
  maths: [
    {
      title: 'Proper time versus far-away time',
      body: `The faller's own clock records proper time $\\tau$, the length of their worldline in curved space-time; it stays finite all the way to the centre. The far-away watcher labels events with Schwarzschild time $t$, which runs off to infinity at the horizon. The sim uses the exact formulas for a fall from rest (a cycloid): $r = \\tfrac{r_0}{2}(1 + \\cos\\eta)$, $\\tau = \\tfrac{r_0^{3/2}}{2}(\\eta + \\sin\\eta)$ in units of $r_s/c$, and the matching expression for $t$, which has a logarithm that blows up at the horizon.`,
    },
  ],
  deeper: `**Black-hole time in practice.** The film *Interstellar* (2014) put a planet near a giant spinning black hole where one hour was seven years far away. That needs extreme spin and a planet orbiting just outside the horizon, but the effect is real.

**Inside, the centre is in your future.** Inside the horizon, the radial direction behaves like time: moving towards the centre is as unavoidable as moving towards tomorrow. That's why no rocket could save you.

**Tidal disruption events.** Astronomers regularly see stars wander too close to supermassive black holes and get spaghettified, producing a flare that brightens over weeks and fades over months. Dozens are found every year.`,
  next: 'A black hole lets nothing out, by these rules. Add quantum mechanics, and something gets out after all.',
};
