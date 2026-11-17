// Medium 4: To catch up, slow down. Two modes sharing one engine: a spacecraft on a circular orbit makes one
// sideways burn onto a transfer ellipse while a target moves on its own circle. "Catch the station": brake to drop
// into a lower, faster orbit and meet a station ahead of you after a few laps. "Fly to Mars": the Hohmann transfer,
// which only works if Mars is the right distance ahead at launch.
// Colours: speeds blue, distances gold, times purple.
import { useMemo, useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { Challenge, Formula, Formulas, num, WhatIfs } from '../../ui/blockkit';
import { Q, TRAIL } from '../../ui/colors';
import { Button, Readout, Readouts, Segmented, SimLayout, Slider } from '../../ui/kit';
import { Rich } from '../../ui/Rich';
import { SpacePanel } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

type Mode = 'station' | 'mars';
const MU_E = 3.986e14; // m³/s²
const R_E = 6.371e6;
const R_ORBIT = R_E + 400e3;
const MU_S = 1.327e20;
const AU = 1.496e11;
const W = 560;
const H = 400;
const CX = 280;
const CY = 200;

function solveE(M: number, e: number) {
  let E = M;
  for (let i = 0; i < 25; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

interface Transfer {
  a: number;
  e: number;
  T: number;
  startAtPeri: boolean;
  peri: number;
  apo: number;
}
function transfer(mu: number, r1: number, v: number): Transfer | null {
  const inv = 2 / r1 - (v * v) / mu;
  if (inv <= 0) return null;
  const a = 1 / inv;
  const p = (r1 * v) ** 2 / mu;
  const e = Math.abs(p / r1 - 1);
  const startAtPeri = p / r1 >= 1;
  return { a, e, T: 2 * Math.PI * Math.sqrt(a ** 3 / mu), startAtPeri, peri: a * (1 - e), apo: a * (1 + e) };
}
/** [radius, angle] of the craft at time t on the transfer orbit (starts at angle 0). */
function craftAt(tr: Transfer, t: number): [number, number] {
  const n = (2 * Math.PI) / tr.T;
  const M = (tr.startAtPeri ? 0 : Math.PI) + n * t;
  const E = solveE(M, tr.e);
  const f = 2 * Math.atan2(Math.sqrt(1 + tr.e) * Math.sin(E / 2), Math.sqrt(1 - tr.e) * Math.cos(E / 2));
  return [tr.a * (1 - tr.e * Math.cos(E)), f + (tr.startAtPeri ? 0 : Math.PI)];
}

function HohmannSim() {
  const [mode, setMode] = useState<Mode>('station');
  const [lead, setLead] = useState(20); // degrees the target is ahead
  const [laps, setLaps] = useState(3);
  const [dv, setDv] = useState(30); // m/s (station) — deliberately the wrong sign to start
  const [marsLead, setMarsLead] = useState(70); // degrees
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const visRef = useRef<HTMLDivElement>(null);

  const station = mode === 'station';
  const mu = station ? MU_E : MU_S;
  const r1 = station ? R_ORBIT : AU;
  const r2 = station ? R_ORBIT : 1.524 * AU;
  const vc = Math.sqrt(mu / r1);
  const Tc = 2 * Math.PI * Math.sqrt(r1 ** 3 / mu);
  const aH = (r1 + r2) / 2;
  const vH = Math.sqrt(mu * (2 / r1 - 1 / aH));
  const v = station ? vc + dv : vH;
  const tr = useMemo(() => transfer(mu, r1, v), [mu, r1, v]);
  const T2 = 2 * Math.PI * Math.sqrt(r2 ** 3 / mu); // target's period
  const tEnd = tr ? (station ? laps * tr.T : tr.T / 2) : 0;
  const leadDeg = station ? lead : marsLead;
  const warp = tEnd / 7; // the whole manoeuvre plays in about 7 s

  useRaf(
    (dt) =>
      setT((c) => {
        const nt = Math.min(tEnd, c + dt * warp);
        if (nt >= tEnd) setPlaying(false);
        return nt;
      }),
    playing,
    visRef
  );

  // exact answers, for feedback
  const Tneed = Tc * (1 - lead / (360 * laps));
  const aNeed = Math.cbrt((mu * Tneed * Tneed) / (4 * Math.PI * Math.PI));
  const dvNeed = Math.sqrt(mu * (2 / r1 - 1 / aNeed)) - vc;
  const tH = Math.PI * Math.sqrt(aH ** 3 / mu);
  const marsNeed = 180 - (360 * tH) / T2;

  // screen mapping (station heights exaggerated so a 200 km dip is visible)
  const EXAG = 1.1e-4; // px per m of altitude
  const rpx = (r: number) => (station ? 92 + (r - R_E) * EXAG : (r / AU) * 112);
  const P = (r: number, ang: number) => ({ x: CX + rpx(r) * Math.cos(ang), y: CY - rpx(r) * Math.sin(ang) });

  const [cr, ca] = tr ? craftAt(tr, t) : [r1, 0];
  const tgA = (leadDeg * Math.PI) / 180 + ((2 * Math.PI) / T2) * t;
  const craft = P(cr, ca);
  const target = P(r2, tgA);
  const missM = Math.hypot(cr * Math.cos(ca) - r2 * Math.cos(tgA), cr * Math.sin(ca) - r2 * Math.sin(tgA));
  const done = t >= tEnd - 1e-9 && tEnd > 0;
  const caught = station && done && missM < 10e3;

  const ellipsePath = useMemo(() => {
    if (!tr) return '';
    let d = '';
    for (let i = 0; i <= 180; i++) {
      const [r, a] = craftAt(tr, (i / 180) * tr.T);
      const p = P(r, a);
      d += `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }
    return d;
  }, [tr, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = () => {
    setT(0);
    setPlaying(true);
  };
  const missText = station ? `${num(missM / 1000, missM < 10e3 ? 2 : 0)} km` : `${num(missM / 1e9, 1)} million km`;
  let status = '';
  if (!tr) status = 'That burn is so fast the craft escapes Earth altogether.';
  else if (t === 0 && !playing) status = station ? `The station is **${lead}°** ahead. Choose a burn and press *Burn*.` : `Mars is **${marsLead}°** ahead of the Earth. Press *Launch*.`;
  else if (done) status = station ? (caught ? `**Rendezvous!** You're ${missText} from the station after ${laps} laps. Burn ${num(-dv, 1)} m/s to circularise and dock.` : `Missed: the station is ${missText} away. ${dv > 0 ? 'Speeding up raised your orbit and made it *slower*.' : ''}`) : missM < 5e9 ? `**Arrived at Mars** after ${num(tH / 86400, 0)} days.` : `Mars isn't there: it's ${missText} away. ${marsLead > marsNeed ? 'It was too far ahead at launch.' : 'It was not far enough ahead at launch.'}`;
  else if (station && tr && tr.peri < R_E + 100e3) status = 'Your new orbit dips into the atmosphere: air drag would bring you down. Spread the catch-up over more laps.';
  else status = station ? 'Coasting…' : `Coasting: day ${num(t / 86400, 0)}.`;

  const visual = (
    <div ref={visRef}>
      <SpacePanel w={W} h={H} ariaLabel={status.replace(/\*/g, '')} tags={[station ? 'Heights above the Earth exaggerated' : 'Distances to scale', station ? `${laps} laps in 7 s` : `${num(tH / 86400, 0)} days in 7 s`]} tagsAt="tl" stars={90}>
        {station ? (
          <circle cx={CX} cy={CY} r={92} fill="#24507f" stroke="#7fb0e6" />
        ) : (
          <>
            <circle cx={CX} cy={CY} r={10} fill="#f2b84b" />
            <circle cx={CX} cy={CY} r={rpx(r1)} fill="none" stroke="#4f8fd6" strokeOpacity={0.5} strokeDasharray="3 4" />
          </>
        )}
        <circle cx={CX} cy={CY} r={rpx(r2)} fill="none" stroke={station ? TRAIL : '#d0623c'} strokeOpacity={0.45} strokeDasharray="3 4" />
        {ellipsePath && <path d={ellipsePath} fill="none" stroke={Q.v} strokeOpacity={0.55} strokeWidth={1.5} />}
        <line x1={CX + rpx(r1) - 8} x2={CX + rpx(r1) + 8} y1={CY} y2={CY} stroke="#ffd28a" strokeWidth={2} />
        <text x={CX + rpx(r1) + 10} y={CY + 14} className="plot-note" fill="#ffd28a">
          {station ? 'burn here' : 'launch'}
        </text>
        {!station && <circle cx={P(r1, ((2 * Math.PI) / (2 * Math.PI * Math.sqrt(r1 ** 3 / mu))) * t).x} cy={P(r1, ((2 * Math.PI) / (2 * Math.PI * Math.sqrt(r1 ** 3 / mu))) * t).y} r={6} fill="#4f8fd6" />}
        <circle cx={target.x} cy={target.y} r={station ? 6 : 7} fill={station ? '#e8ebf0' : '#d0623c'} stroke="#fff" />
        <text x={target.x + 9} y={target.y - 7} className="plot-note" fill="var(--text-2)">
          {station ? 'station' : 'Mars'}
        </text>
        <circle cx={craft.x} cy={craft.y} r={5} fill="#7fd4ff" stroke="#fff" />
        <text x={craft.x + 8} y={craft.y + 14} className="plot-note" fill="#7fd4ff">
          you
        </text>
      </SpacePanel>
    </div>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Segmented<Mode>
          size="sm"
          label="Mission"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setT(0);
            setPlaying(false);
          }}
          options={[
            { value: 'station', label: 'Catch the space station' },
            { value: 'mars', label: 'Fly to Mars' },
          ]}
        />
        {station ? (
          <>
            <Slider label="station's lead" tip="how far ahead the station is, around the orbit" value={lead} min={5} max={60} step={1} unit="°" onChange={(x) => { setLead(x); setT(0); setPlaying(false); }} />
            <Slider label="laps to catch up in" value={laps} min={1} max={5} step={1} sig={1} onChange={(x) => { setLaps(Math.round(x)); setT(0); setPlaying(false); }} />
            <Slider label="burn (+ forwards, − backwards)" tex="\Delta\qv{v}" tip="change of speed from one short engine firing" value={dv} min={-150} max={150} step={0.1} unit="m/s" onChange={(x) => { setDv(x); setT(0); setPlaying(false); }} />
            <Button variant="primary" onClick={go}>
              Burn
            </Button>
          </>
        ) : (
          <>
            <Slider label="Mars's lead at launch" tip="how far ahead of the Earth Mars is, around the Sun, on launch day" value={marsLead} min={0} max={120} step={0.5} unit="°" onChange={(x) => { setMarsLead(x); setT(0); setPlaying(false); }} />
            <Button variant="primary" onClick={go}>
              Launch
            </Button>
          </>
        )}
        <Rich className="status" text={status} />
      </div>
      <div className="ctl-group">
        <Readouts min={140}>
          <Readout tex="\qv{v}" tip="speed just after the burn" value={(station ? v : vH) / 1000} unit="km/s" sig={4} />
          <Readout tex="\qt{T'}" tip="period of your new orbit" value={tr ? (station ? tr.T / 60 : tr.T / 86400) : NaN} unit={station ? 'min' : 'days'} sig={4} />
          <Readout label={station ? 'lowest point' : 'furthest point'} tip={station ? 'height above the ground at the bottom of your new orbit' : 'distance from the Sun at the far end'} value={tr ? (station ? (tr.peri - R_E) / 1000 : tr.apo / AU) : NaN} unit={station ? 'km' : 'AU'} sig={3} />
          <Readout label="distance to target" tip="right now" value={station ? missM / 1000 : missM / 1e9} unit={station ? 'km' : 'million km'} sig={3} />
        </Readouts>
        {done && station && !caught && <div className="note">The burn that works here is about {num(dvNeed, 1)} m/s.</div>}
        {done && !station && missM >= 5e9 && <div className="note">The launch window opens when Mars leads by about {num(marsNeed, 1)}°.</div>}
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="Lower orbits are faster orbits"
          tex="\qt{T} = 2\pi\sqrt{\frac{\qs{a}^{3}}{G\qm{M}}}"
          say="Kepler's third law: a smaller orbit takes less time. Brake, and you fall into a smaller ellipse that goes round sooner, so you gain on anything still in the old orbit. Speed up, and you climb into a bigger, slower one."
          where={[
            ['\\qt{T}', 'time for one orbit'],
            ['\\qs{a}', "the orbit's semi-major axis (its average radius)"],
            ['G\\qm{M}', "the Earth's (or Sun's) mass times G"],
          ]}
          live={station && tr ? `\\qt{T'} = \\qt{${num(tr.T / 60, 2)}}\\ \\text{min} \\quad \\text{vs} \\quad \\qt{T} = \\qt{${num(Tc / 60, 2)}}\\ \\text{min for the station}` : null}
        />
        <Formula
          title="The Hohmann transfer"
          tex="\qs{a} = \frac{\qs{r_1} + \qs{r_2}}{2} \qquad \qt{t_{\text{trip}}} = \tfrac{1}{2}\,\qt{T}"
          say="The cheapest way between two circular orbits: one burn onto an ellipse that just touches both, half an orbit of coasting, then a second burn to match the new orbit. Walter Hohmann worked it out in 1925, decades before any rocket reached space."
          where={[
            ['\\qs{r_1},\\ \\qs{r_2}', 'radii of the starting and final orbits (1 AU and 1.52 AU for Earth to Mars)'],
            ['\\qt{t_{\\text{trip}}}', 'the journey time: half the transfer ellipse’s period'],
          ]}
          live={`\\qs{a} = \\frac{\\qs{1}+\\qs{1.524}}{2} = \\qs{1.262}\\ \\text{AU} \\quad\\Rightarrow\\quad \\qt{t_{\\text{trip}}} = \\qt{${num(tH / 86400, 0)}}\\ \\text{days}`}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="hm-speedup"
          question="The station is 20° ahead of you in the same orbit. You fire your engine **forwards** to speed up. What happens?"
          options={['You climb into a higher, slower orbit and fall further behind', 'You catch up quickly', 'You catch up slowly', 'Nothing changes']}
          answer={0}
          explain="Extra speed lifts the far side of your orbit: a bigger orbit with a longer period. Each lap now takes longer than the station's, so you drift back. To gain ground you must do the opposite: brake, drop into a smaller, faster orbit, and come back up when you've caught up. Gemini 4's crew learned this the hard way in 1965, chasing their own rocket stage and only falling further behind."
          tryIt="a forward burn (positive) and press Burn."
          onApply={() => {
            setMode('station');
            setLead(20);
            setLaps(3);
            setDv(30);
            go();
          }}
        />
        <WhatIf
          id="hm-window"
          question="Why can Mars missions only leave every 26 months or so?"
          options={['Mars has to be about 44° ahead of the Earth at launch, and that arrangement only comes round every 26 months', 'Rockets take that long to build', 'Mars is too far away the rest of the time', "The Earth's orbit is in the way"]}
          answer={0}
          explain="The transfer takes about 259 days, during which Mars moves on by about 136°. So Mars must start 44° ahead to arrive at the meeting point when the craft does. The Earth laps Mars once every 780 days, so the window comes round about every 26 months. That's why Mars missions launch in clusters: several countries at once, then a two-year gap."
          tryIt="'Fly to Mars' with Mars 44° ahead."
          onApply={() => {
            setMode('mars');
            setMarsLead(44);
            go();
          }}
        />
        <WhatIf
          id="hm-time"
          question="Flying the Hohmann transfer, how long does it take to get to Mars?"
          options={['About 8½ months', 'About 3 days', 'About 2 weeks', 'About 5 years']}
          answer={0}
          fixedOrder
          explain="Half of the transfer ellipse's 1.42-year period: about 259 days. Faster routes exist, but they cost far more fuel. Every robotic Mars lander so far has taken roughly 6 to 9 months."
          tryIt="launch for Mars and watch the day counter."
          onApply={() => {
            setMode('mars');
            setMarsLead(44.3);
            go();
          }}
        />
        <Challenge
          goal="**Catch the space station**: choose a burn that brings you within **10 km** of it at the end of the laps."
          done={caught}
          hint="You need an orbit whose period is a little shorter than the station's, so that after your laps you've gained exactly the station's lead. Which way should you burn?"
          success={`Caught it, with a burn of ${num(dv, 1)} m/s: braking to catch up. Real crews reaching the ISS use the same idea, spread over several hours of carefully timed burns.`}
        />
      </WhatIfs>
    </>
  );
}

export const hohmann: BlockDef = {
  id: 'hohmann',
  title: 'To catch up, slow down',
  hook: 'Why does a spacecraft chasing another one in orbit have to brake to catch it?',
  explain: `On the ground, to catch up you speed up. In orbit, that backfires. Firing forwards raises the far side of your orbit, and a bigger orbit takes **longer** to go round (Kepler's third law), so you fall behind. To catch something ahead of you, you brake: you drop into a smaller orbit, which is faster, gain on your target lap by lap, then speed up again to rise back and meet it.

The same logic gets you to other planets. To reach Mars you speed up at the Earth's orbit, onto an ellipse that just touches Mars's orbit on the far side. That **Hohmann transfer** is the cheapest route, and it only works if Mars is in the right place when you arrive: there's a launch window every 26 months.`,
  Sim: HohmannSim,
  maths: [
    {
      title: 'Why braking makes you faster',
      body: `Brake and you drop into a lower orbit. As you fall inwards, gravity speeds you up, so near the bottom of your new ellipse you're moving faster than the station above you, and your lap is shorter. You traded a little speed now for more speed later: energy from height again.`,
    },
  ],
  deeper: `**Rendezvous in practice.** In 1965 Gemini 4 tried to fly alongside its spent rocket stage by aiming at it and thrusting towards it; the stage kept drifting away and the attempt was abandoned. Buzz Aldrin's 1963 doctoral thesis was on orbital rendezvous, and Gemini 6A and 7 met in orbit the same year using exactly this "brake to catch up" thinking.

**Faster routes.** Hohmann transfers are the most fuel-efficient between circular orbits, not the quickest. Spacecraft with more fuel take shorter, steeper paths; future crewed Mars missions aim for about 6 months each way to limit radiation.

**Gravity helps you choose.** Missions to the outer planets add another trick: swinging past a planet on the way to borrow some of its speed. That's next.`,
  next: 'Rockets are expensive. Planets are free. How does a spacecraft steal speed from a planet, and who pays?',
};
