// Medium 9: Space-time diagrams and the twin paradox. Earth's frame: distance across (light-years), time up (years);
// light travels at 45°. One twin stays home; the other flies out at speed v and back. Elapsed time along a worldline
// is its space-time "length", Pythagoras with a minus sign, and the bent path is the shorter one. Optional "now"
// lines show what the traveller counts as simultaneous: they tilt, and jump at the turnaround.
// Colours: times purple, distances gold, speed blue.
import { useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { Challenge, Formula, Formulas, num, WhatIfs } from '../../ui/blockkit';
import { Q } from '../../ui/colors';
import { Button, Readout, Readouts, SimLayout, Slider, Toggle } from '../../ui/kit';
import { SpacePanel } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const W = 560;
const H = 440;
const X0 = 70; // px of x = 0
const Y0 = 410; // px of t = 0
const HOME = '#7fb0e6';
const AWAY = '#ffb46b';
const LIGHT = '#fff3b0';

function SpacetimeSim() {
  const [v, setV] = useState(0.8);
  const [D, setD] = useState(4.2);
  const [nowLines, setNowLines] = useState(false);
  const [te, setTe] = useState(0); // Earth time, years
  const [playing, setPlaying] = useState(true);
  const visRef = useRef<HTMLDivElement>(null);
  const g = 1 / Math.sqrt(1 - v * v);
  const tt = D / v; // turnaround, Earth time
  const T = 2 * tt;
  const tauAway = T / g;
  useRaf(
    (dt) =>
      setTe((c) => {
        const n = c + (dt * T) / 9; // the whole trip plays in 9 s
        if (n >= T) {
          setPlaying(false);
          return T;
        }
        return n;
      }),
    playing,
    visRef
  );

  const k = Math.min((H - 50) / T, (W - X0 - 30) / D); // px per year (= px per light-year)
  const P = (x: number, t: number) => ({ x: X0 + x * k, y: Y0 - t * k });
  const xAt = (t: number) => (t <= tt ? v * t : Math.max(0, D - v * (t - tt)));
  const awayNow = P(xAt(te), te);
  const homeNow = P(0, te);
  const earthAgeAtNow = te;
  const awayAge = te / g;
  // traveller's "now": t − te = ±v (x − x_now); where it crosses Earth's worldline
  const out = te <= tt;
  const nowOnEarth = out ? te - v * xAt(te) : te + v * xAt(te);
  const nowLine = (() => {
    const s = out ? v : -v;
    const xa = -0.5;
    const xb = D + 0.5;
    const a = P(xa, te + s * (xa - xAt(te)));
    const b = P(xb, te + s * (xb - xAt(te)));
    return { a, b };
  })();
  const ticks = (n: number, f: (i: number) => { x: number; t: number }) => Array.from({ length: n }, (_, i) => f(i + 1));
  const yearStep = T > 60 ? 10 : T > 25 ? 5 : 1;
  const homeTicks = ticks(Math.floor(T / yearStep), (i) => ({ x: 0, t: i * yearStep }));
  const awayTicks = ticks(Math.floor(tauAway / yearStep), (i) => ({ x: xAt(i * yearStep * g), t: i * yearStep * g }));
  const gap = T - tauAway;
  const tenYears = Math.abs(gap - 10) < 0.1;

  const visual = (
    <div ref={visRef}>
      <SpacePanel w={W} h={H} ariaLabel={`Twin trip at ${v} c to ${D} light-years: home twin ages ${T.toFixed(1)} years, traveller ${tauAway.toFixed(1)}.`} tags={["Earth's frame: 1 light-year across = 1 year up"]} tagsAt="tr" stars={0}>
        {/* axes */}
        <line x1={X0} x2={W - 10} y1={Y0} y2={Y0} stroke="rgba(255,255,255,0.35)" />
        <line x1={X0} x2={X0} y1={Y0} y2={10} stroke="rgba(255,255,255,0.35)" />
        <text x={W - 12} y={Y0 + 26} textAnchor="end" className="plot-note" fill={Q.s}>
          distance from Earth (light-years) →
        </text>
        <text x={X0 + 8} y={20} className="plot-note" fill={Q.t}>
          ↑ time (Earth's years)
        </text>
        {/* light rays from the start and from the turnaround */}
        <line x1={P(0, 0).x} y1={P(0, 0).y} x2={P(Math.min(D + 0.5, T), Math.min(D + 0.5, T)).x} y2={P(Math.min(D + 0.5, T), Math.min(D + 0.5, T)).y} stroke={LIGHT} strokeDasharray="3 4" opacity={0.6} />
        <line x1={P(D, tt).x} y1={P(D, tt).y} x2={P(0, T).x} y2={P(0, T).y} stroke={LIGHT} strokeDasharray="3 4" opacity={0.35} />
        <text x={P(Math.min(D, T) * 0.6, Math.min(D, T) * 0.6).x + 6} y={P(Math.min(D, T) * 0.6, Math.min(D, T) * 0.6).y + 14} className="plot-note" fill={LIGHT} opacity={0.8}>
          light: 45°
        </text>
        <line x1={P(D, 0).x} x2={P(D, 0).x} y1={Y0} y2={Y0 + 6} stroke={Q.s} />
        <text x={P(D, 0).x} y={Y0 + 20} textAnchor="middle" className="plot-note" fill={Q.s}>
          {D} ly
        </text>
        {/* worldlines */}
        <line x1={P(0, 0).x} y1={P(0, 0).y} x2={P(0, T).x} y2={P(0, T).y} stroke={HOME} strokeWidth={3} />
        <polyline points={`${P(0, 0).x},${P(0, 0).y} ${P(D, tt).x},${P(D, tt).y} ${P(0, T).x},${P(0, T).y}`} fill="none" stroke={AWAY} strokeWidth={3} />
        {homeTicks.map((p, i) => (
          <line key={`h${i}`} x1={P(p.x, p.t).x - 5} x2={P(p.x, p.t).x + 5} y1={P(p.x, p.t).y} y2={P(p.x, p.t).y} stroke={HOME} strokeWidth={2} />
        ))}
        {awayTicks.map((p, i) => (
          <circle key={`a${i}`} cx={P(p.x, p.t).x} cy={P(p.x, p.t).y} r={3} fill={AWAY} />
        ))}
        {nowLines && (
          <>
            <line x1={nowLine.a.x} y1={nowLine.a.y} x2={nowLine.b.x} y2={nowLine.b.y} stroke={AWAY} strokeDasharray="6 4" opacity={0.8} />
            <circle cx={P(0, nowOnEarth).x} cy={P(0, nowOnEarth).y} r={5} fill="none" stroke={AWAY} strokeWidth={2} />
            <line x1={P(0, tt - v * D).x - 8} x2={P(0, tt + v * D).x - 8} y1={P(0, tt - v * D).y} y2={P(0, tt + v * D).y} stroke={AWAY} strokeWidth={4} opacity={0.35} />
            <text x={P(0, tt).x - 12} y={P(0, tt).y} textAnchor="end" className="plot-note" fill={AWAY}>
              skipped
            </text>
          </>
        )}
        <line x1={homeNow.x} x2={awayNow.x} y1={homeNow.y} y2={awayNow.y} stroke="rgba(255,255,255,0.25)" />
        <circle cx={homeNow.x} cy={homeNow.y} r={6} fill={HOME} stroke="#fff" />
        <circle cx={awayNow.x} cy={awayNow.y} r={6} fill={AWAY} stroke="#fff" />
        <text x={homeNow.x + 10} y={homeNow.y - 8} className="plot-note" fill={HOME} fontWeight={700}>
          home: {num(earthAgeAtNow, 1)} y
        </text>
        <text x={awayNow.x + 10} y={awayNow.y + 16} className="plot-note" fill={AWAY} fontWeight={700}>
          traveller: {num(awayAge, 1)} y
        </text>
      </SpacePanel>
    </div>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Slider label="traveller's speed, measured from Earth" tex="\qv{v}/c" value={v} min={0.1} max={0.99} step={0.005} sig={3} onChange={(x) => { setV(x); setTe(0); setPlaying(true); }} />
        <Slider label="turnaround distance, measured from Earth" tex="\qs{D}" value={D} min={1} max={20} step={0.1} unit="ly" onChange={(x) => { setD(x); setTe(0); setPlaying(true); }} />
        <Toggle checked={nowLines} onChange={setNowLines} label={`Show the traveller's "now" lines`} />
        <div className="row gap-s wrap">
          <Button size="sm" variant="primary" onClick={() => { if (te >= T) setTe(0); setPlaying((p) => !p); }}>
            {playing ? 'Pause' : te >= T ? 'Fly again' : 'Play'}
          </Button>
        </div>
      </div>
      <div className="ctl-group">
        <Readouts min={150}>
          <Readout label="home twin ages" tip="whole trip, on the home twin's own clock" value={T} unit="years" sig={3} />
          <Readout label="traveller ages" tip="whole trip, on the traveller's own clock" value={tauAway} unit="years" sig={3} />
          <Readout label="difference at the reunion" tip="both clocks compared side by side, so everyone agrees on this one" value={gap} unit="years" sig={3} tone={tenYears ? 'ok' : undefined} />
          <Readout tex="\gamma" value={g} sig={3} />
        </Readouts>
        {nowLines && <div className="note">The traveller's "now" on Earth is at Earth year {num(nowOnEarth, 1)}. At the turnaround it jumps by {num(2 * v * D, 1)} Earth years.</div>}
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="Time along a path: Pythagoras with a minus sign"
          tex="(\Delta\qt{\tau})^{2} = (\Delta\qt{t})^{2} - \left(\frac{\Delta\qs{x}}{c}\right)^{2}"
          say="The time a clock records between two events, its **proper time** $\tau$, is the space-time 'length' of its path. It's like Pythagoras, but the distance part is *subtracted*: the more you move, the less time passes for you. A straight vertical path (staying put) records the most time of all."
          where={[
            ['\\Delta\\qt{\\tau}', "time on the moving clock itself (tau): what its owner's watch reads"],
            ['\\Delta\\qt{t}', "time between the two events, by Earth's clocks"],
            ['\\Delta\\qs{x}', "distance between them, by Earth's rulers"],
          ]}
          live={`\\text{one leg: } \\sqrt{(\\qt{${num(tt, 2)}})^2 - (\\qs{${num(D, 2)}})^2} = \\qt{${num(tt / g, 2)}}\\ \\text{years}`}
          liveNote="In years and light-years, c = 1."
        />
        <Formula
          title="The twins at the reunion"
          tex="\qt{\tau_{\text{traveller}}} = \frac{2\qs{D}}{\qv{v}\,\gamma} \qquad \qt{t_{\text{home}}} = \frac{2\qs{D}}{\qv{v}}"
          say="The home twin's clock simply records the trip time. The traveller's records less, by the factor $\gamma$. When they meet again side by side, there's no argument about whose clock to trust: they compare directly."
          where={[
            ['\\qs{D}', "turnaround distance, measured from Earth"],
            ['\\qv{v}', "the traveller's speed, measured from Earth"],
          ]}
          live={`\\qt{\\tau} = \\frac{2 \\times \\qs{${num(D, 1)}}}{\\qv{${num(v, 3)}} \\times ${num(g, 3)}} = \\qt{${num(tauAway, 2)}} \\quad\\text{vs}\\quad \\qt{t} = \\qt{${num(T, 2)}}\\ \\text{years}`}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="sd-why"
          question="On the way out, each twin measures the other's clock running slow. So why is the traveller the one who comes home younger?"
          options={["The traveller turns round: their path through space-time is bent, and a bent path is shorter in time", 'Acceleration damages clocks', 'The home twin is really moving too', "It's an illusion: they're really the same age"]}
          answer={0}
          explain="The situation isn't symmetric. The home twin stays in one frame the whole time: a straight worldline. The traveller switches frames at the turnaround: a bent one. In space-time, the minus sign means the *straight* path between two events records the **most** time, the opposite of ordinary geometry. Turn on the 'now' lines: at the turnaround, the traveller's sense of 'Earth now' jumps forwards by years. That's where the home twin's extra time goes."
          tryIt="tick 'Show the traveller's now lines' and watch the turnaround."
          onApply={() => {
            setNowLines(true);
            setTe(0);
            setPlaying(true);
          }}
        />
        <WhatIf
          id="sd-45"
          question="On this diagram, why can no worldline ever be flatter than 45°?"
          options={['That would mean travelling faster than light', 'The axes stop there', 'It would mean going back in time', 'It would mean standing still']}
          answer={0}
          explain="With years up and light-years across, light covers one unit across per unit up: 45°. A flatter line covers more distance per year than light does. Every possible journey from an event lies inside the 45° 'light cone' that opens upwards from it: its possible futures."
        />
        <WhatIf
          id="sd-proxima"
          question="Fly to Proxima Centauri (4.2 light-years) and back at 0.8 c. How old is each twin at the reunion, in years since leaving?"
          options={['Home: 10.5 · traveller: 6.3', 'Both 10.5', 'Home: 8.4 · traveller: 4.2', 'Home: 6.3 · traveller: 10.5']}
          answer={0}
          explain="Home: $2 \times 4.2 / 0.8 = 10.5$ years. At 0.8 c, $\gamma = 1/\sqrt{1 - 0.64} = 5/3$, so the traveller's clock records $10.5 \times 3/5 = 6.3$ years. They come home 4.2 years younger than their twin. No paradox, just geometry."
          tryIt="speed 0.8, distance 4.2."
          onApply={() => {
            setV(0.8);
            setD(4.2);
            setTe(0);
            setPlaying(true);
          }}
        />
        <Challenge
          goal="Plan a trip that brings the traveller home exactly **10 years younger** than the twin who stayed (within 0.1 years)."
          done={tenYears}
          hint="The difference is $T(1 - 1/\gamma)$, where $T$ is the home twin's time. Faster helps; so does further."
          success={`${num(D, 1)} light-years at ${num(v, 3)} c: home ages ${num(T, 1)} years, the traveller ${num(tauAway, 1)}. (The fastest spacecraft so far, the Parker Solar Probe, peaks at about 0.0006 c: a few years at that speed would separate the twins by well under a minute.)`}
        />
      </WhatIfs>
    </>
  );
}

export const spacetime: BlockDef = {
  id: 'spacetime',
  title: 'Space-time diagrams and the twin paradox',
  hook: 'Why does the twin who travels come home younger, when each sees the other moving?',
  explain: `Draw time as a direction. On a **space-time diagram**, distance runs across and time runs up; every event is a point and every object's history is a line, its **worldline**. Something sitting still draws a straight vertical line. Light, choosing years and light-years as units, draws lines at exactly 45°, and nothing can be flatter.

Einstein's insight, in Minkowski's geometric form: the time your own clock records along a worldline is that worldline's "length" in space-time. That length is Pythagoras with a minus sign: moving through space *subtracts* from the time you experience. So the twin who stays home, on a straight line, ages the most. The twin who flies out and back, on a bent line, ages less. When they meet again, they can stand side by side and compare.`,
  Sim: SpacetimeSim,
  maths: [
    {
      title: 'Why a minus sign makes straight lines longest',
      body: `In ordinary geometry a bent path between two points is longer than the straight one. In space-time the distance part is subtracted: $\\tau^2 = t^2 - x^2$. Bending the path adds sideways distance $x$, and that *reduces* $\\tau$. So the straight worldline, staying put, is the longest in proper time: every detour through space shortens your time. Light, with $x = t$, has $\\tau = 0$: a photon's own clock never ticks.`,
    },
  ],
  deeper: `**Where's the missing time?** On the outbound leg, the traveller's 'now' lines tilt one way; on the way back, the other way. At the instant of turning round, the traveller's idea of "what's happening on Earth right now" leaps forwards by $2vD/c^2$ years. Neither twin sees anything jump; it's a change of which distant events count as simultaneous. Different observers disagree about "now" far away, and that is the deepest surprise of special relativity.

**Hermann Minkowski**, Einstein's former maths teacher, recast relativity as geometry in 1908: "Henceforth space by itself, and time by itself, are doomed to fade away into mere shadows." Einstein was unimpressed at first, then built general relativity on exactly this geometry, where gravity *curves* the worldlines.

**Real twins.** Astronaut Scott Kelly spent nearly a year on the ISS while his twin brother Mark stayed on Earth. Scott came back a few milliseconds younger than he would have been had he stayed home: real, measurable, and tiny.`,
  next: 'Space-time can be drawn, and it can be bent. Bend it enough and you get a black hole. On to Advanced.',
};
