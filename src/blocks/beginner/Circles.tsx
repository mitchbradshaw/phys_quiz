// Beginner 8: Going in circles. A spinning ring station makes "gravity": the floor pushes everyone towards the
// centre to carry them round. Let go of a ball and, seen from outside, it flies in a straight line until the floor
// swings round to meet it; seen riding along, it seems to fall, and lands slightly behind.
// Colours: velocity blue, the floor's inward push / acceleration orange, radius gold, period purple.
import { useMemo, useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { Challenge, Formula, Formulas, num, WhatIfs } from '../../ui/blockkit';
import { Q, TRAIL } from '../../ui/colors';
import { Button, Readout, Readouts, Segmented, SimLayout, Slider } from '../../ui/kit';
import { SpacePanel, Vec } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const W = 560;
const H = 380;
const CX = 280;
const CY = 190;
const RPX = 160; // px of the rim
const G0 = 9.8;
type View = 'outside' | 'riding';

interface Drop {
  t: number; // release time
  th: number; // her angle at release
  rb: number; // release radius, m
}

function CirclesSim() {
  const [r, setR] = useState(60);
  const [T, setT] = useState(16);
  const [hDrop, setHDrop] = useState(12);
  const [view, setView] = useState<View>('outside');
  const [t, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [drop, setDrop] = useState<Drop | null>(null);
  const visRef = useRef<HTMLDivElement>(null);
  useRaf((dt) => setTime((c) => c + dt), playing, visRef);

  const w = (2 * Math.PI) / T;
  const v = w * r;
  const a = w * w * r;
  const k = RPX / r; // px per m
  const rot = view === 'riding' ? -w * t : 0; // frame rotation
  const her = -Math.PI / 2 + w * t; // her angle (inertial)
  const toS = (x: number, y: number) => {
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    return { x: CX + (x * c - y * s) * k, y: CY - (x * s + y * c) * k };
  };

  // the dropped ball: straight line (inertial) until it meets the rim, then carried round with the floor
  const ball = useMemo(() => {
    if (!drop) return null;
    const { th, rb } = drop;
    const tHit = rb > 1e-6 ? Math.sqrt(r * r - rb * rb) / (w * rb) : Infinity;
    const at = (tau: number) => {
      if (tau < tHit) return { x: rb * Math.cos(th) - w * rb * tau * Math.sin(th), y: rb * Math.sin(th) + w * rb * tau * Math.cos(th) };
      const ang = th + Math.atan2(Math.sqrt(r * r - rb * rb), rb) + w * (tau - tHit);
      return { x: r * Math.cos(ang), y: r * Math.sin(ang) };
    };
    const lag = rb > 1e-6 ? r * (w * tHit - Math.atan2(Math.sqrt(r * r - rb * rb), rb)) : 0;
    return { at, tHit, lag };
  }, [drop, r, w]);

  const tau = drop ? t - drop.t : 0;
  let trail = '';
  if (ball && drop) {
    const end = Math.min(tau, Number.isFinite(ball.tHit) ? ball.tHit : tau);
    for (let i = 0; i <= 60; i++) {
      const ti = (end * i) / 60;
      const p = ball.at(ti);
      // in the riding view, each point is placed where the frame was at that moment
      const fr = view === 'riding' ? -w * (drop.t + ti) : 0;
      const c = Math.cos(fr);
      const s = Math.sin(fr);
      trail += `${i ? 'L' : 'M'}${(CX + (p.x * c - p.y * s) * k).toFixed(1)},${(CY - (p.x * s + p.y * c) * k).toFixed(1)}`;
    }
  }
  const bp = ball ? ball.at(tau) : null;
  const bs = bp ? toS(bp.x, bp.y) : null;

  const herPos = toS(r * Math.cos(her), r * Math.sin(her));
  const tang = { x: -Math.sin(her), y: Math.cos(her) };
  const vEnd = toS(r * Math.cos(her) + tang.x * r * 0.42, r * Math.sin(her) + tang.y * r * 0.42);
  const aEnd = toS(r * Math.cos(her) * 0.62, r * Math.sin(her) * 0.62);
  const figH = Math.max(7, 1.8 * k);
  const headR = r - figH / k;
  const head = toS(headR * Math.cos(her), headR * Math.sin(her));
  const rpm = 60 / T;
  const gs = a / G0;
  const comfy = gs >= 0.98 && gs <= 1.02 && rpm <= 2;

  const letGo = () => {
    setDrop({ t, th: her, rb: Math.max(0, r - hDrop) });
    setPlaying(true);
  };

  const spokes = [0, 1, 2, 3].map((i) => {
    const ang = (i * Math.PI) / 2 + w * t;
    const p = toS(r * Math.cos(ang), r * Math.sin(ang));
    return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="rgba(160,170,190,0.35)" strokeWidth={5} />;
  });

  const visual = (
    <div ref={visRef}>
      <SpacePanel w={W} h={H} ariaLabel={`Station of radius ${r} m turning once every ${T} s: ${gs.toFixed(2)} g at the rim.`} tags={[view === 'outside' ? 'Seen from outside' : 'Riding with the station', 'Real time']} tagsAt="tl" stars={80}>
        <circle cx={CX} cy={CY} r={RPX + 9} fill="none" stroke="rgba(160,170,190,0.55)" strokeWidth={14} />
        <circle cx={CX} cy={CY} r={RPX} fill="rgba(255,255,255,0.025)" stroke="rgba(220,226,236,0.7)" strokeWidth={1.5} />
        {spokes}
        <circle cx={CX} cy={CY} r={12} fill="#3a4252" stroke="#8f98a8" />
        {/* a marker on the floor, so the turning shows in both views */}
        {(() => {
          const ang = -Math.PI / 2 + Math.PI + w * t;
          const p = toS((r + 3 / k) * Math.cos(ang), (r + 3 / k) * Math.sin(ang));
          return <circle cx={p.x} cy={p.y} r={4} fill="#ffd28a" />;
        })()}
        <line x1={CX} y1={CY} x2={toS(r * Math.cos(her + 0.6), r * Math.sin(her + 0.6)).x} y2={toS(r * Math.cos(her + 0.6), r * Math.sin(her + 0.6)).y} stroke={Q.s} strokeDasharray="4 4" />
        {trail && <path d={trail} fill="none" stroke={TRAIL} strokeWidth={1.8} strokeDasharray="3 3" />}
        <line x1={herPos.x} y1={herPos.y} x2={head.x} y2={head.y} stroke="#e8ebf0" strokeWidth={Math.max(3, figH / 3)} strokeLinecap="round" />
        <circle cx={head.x} cy={head.y} r={Math.max(2.5, figH / 5)} fill="#e8ebf0" />
        <Vec x1={herPos.x} y1={herPos.y} x2={vEnd.x} y2={vEnd.y} color={Q.v} width={3} head={10} label="v" />
        <Vec x1={herPos.x} y1={herPos.y} x2={aEnd.x} y2={aEnd.y} color={Q.a} width={3} head={10} label="floor's push" labelOffset={16} />
        {bs && <circle cx={bs.x} cy={bs.y} r={5} fill="var(--m3)" stroke="#fff" />}
      </SpacePanel>
    </div>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Segmented<View>
          size="sm"
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: 'outside', label: 'from outside' },
            { value: 'riding', label: 'riding with the station' },
          ]}
        />
        <Slider label="radius" tex="\qs{r}" tip="distance from the centre to the floor" value={r} min={10} max={500} step={1} unit="m" onChange={(x) => { setR(x); setDrop(null); }} />
        <Slider label="time for one turn" tex="\qt{T}" tip="the rotation period" value={T} min={4} max={120} step={0.5} unit="s" onChange={(x) => { setT(x); setDrop(null); }} />
        <Slider label="let go this high above the floor" tex="\qs{h}" tip="height of the release above the floor (up = towards the centre)" value={Math.min(hDrop, r)} min={0} max={r} step={0.5} unit="m" onChange={setHDrop} />
        <div className="row gap-s wrap">
          <Button size="sm" variant="primary" onClick={letGo}>
            Let go of a ball
          </Button>
          <Button size="sm" onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause' : 'Play'}
          </Button>
        </div>
      </div>
      <div className="ctl-group">
        <Readouts>
          <Readout tex="\qv{v}" tip="speed of the floor" value={v} unit="m/s" sig={3} />
          <Readout tex="\qa{a}" tip="acceleration towards the centre" value={a} unit="m/s²" sig={3} />
          <Readout label="feels like" tip="compared with gravity on Earth's surface" value={gs} unit="g" sig={3} tone={Math.abs(gs - 1) < 0.02 ? 'ok' : undefined} />
          <Readout label="spin" tip="turns per minute (above about 2, most people get dizzy)" value={rpm} unit="rpm" sig={3} tone={rpm > 2 ? 'warn' : undefined} />
        </Readouts>
        {ball && Number.isFinite(ball.tHit) && <div className="note">The ball took {num(ball.tHit, 2)} s to reach the floor and landed {num(ball.lag, 2)} m behind the spot below where it was let go.</div>}
        {ball && !Number.isFinite(ball.tHit) && <div className="note">Let go at the very centre, the ball has no speed at all, so it just floats there.</div>}
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="Speed around the circle"
          tex="\qv{v} = \frac{2\pi\,\qs{r}}{\qt{T}}"
          say="One lap is a circumference, $2\pi r$, covered once every period $T$."
          where={[
            ['\\qv{v}', 'speed around the circle (m/s)'],
            ['\\qs{r}', 'radius of the circle (m)'],
            ['\\qt{T}', 'time for one full turn (s)'],
          ]}
          live={`\\qv{v} = \\frac{2\\pi \\times \\qs{${num(r, 0)}}}{\\qt{${num(T, 1)}}} = \\qv{${num(v, 1)}}\\ \\text{m/s}`}
        />
        <Formula
          title="Acceleration towards the centre"
          tex="\qa{a} = \frac{\qv{v}^{2}}{\qs{r}}"
          say="Going round a circle is a constant change of direction, so it is a constant acceleration, always towards the centre. Twice the speed: four times the acceleration."
          where={[['\\qa{a}', 'centripetal ("centre-seeking") acceleration (m/s²): what the floor must provide by pushing']]}
          live={`\\qa{a} = \\frac{(\\qv{${num(v, 1)}})^2}{\\qs{${num(r, 0)}}} = \\qa{${num(a, 2)}}\\ \\text{m/s}^2`}
          liveNote={`That's ${num(gs, 2)} times Earth's gravity: the floor pushes on a 70 kg person with ${num(70 * a, 0)} N, which feels just like weight.`}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="ci-outside"
          question="She lets go of a ball well above the floor. Seen from **outside** the station, what path does it take?"
          options={['A straight line', 'A curve down to the floor, as on Earth', 'A spiral outwards', 'It stays where she let go']}
          answer={0}
          explain="Once released, nothing pushes the ball, so it carries on in a straight line at the speed it had (Newton's first law). The floor, still turning, swings round to meet it. Switch to 'riding with the station' and the same straight path looks like a fall that curves backwards: that's what people inside would call gravity."
          tryIt="press 'Let go of a ball' and compare both views."
          onApply={() => {
            setView('outside');
            setHDrop(Math.round(r * 0.4));
            setDrop({ t, th: her, rb: r - Math.round(r * 0.4) });
            setPlaying(true);
          }}
        />
        <WhatIf
          id="ci-hub"
          question="She floats up to the hub and lets go of the ball at the **very centre**. What does it do?"
          options={['Floats in place forever', 'Falls to the floor, but slowly', 'Flies outwards fast', 'Circles the hub']}
          answer={0}
          explain="At the centre, the ball isn't moving at all (the axis doesn't go anywhere), so nothing carries it towards the floor. Artificial gravity is zero at the hub and grows in step with the distance from it: $a = \omega^2 r$. Station designers put docking ports at the hub for exactly this reason."
          tryIt="set the release height equal to the radius and let go."
          onApply={() => {
            setHDrop(r);
            setDrop({ t, th: her, rb: 0 });
            setPlaying(true);
          }}
        />
        <WhatIf
          id="ci-double"
          question="Spin the station twice as fast (half the time per turn). How much stronger is the 'gravity' at the rim?"
          options={['Twice as strong', 'Four times as strong', 'Half as strong', 'The same']}
          answer={1}
          fixedOrder
          explain="Twice as fast doubles the speed $v$, and the acceleration goes with $v^2$, so it quadruples. Spin is a powerful knob, and an uncomfortable one: spin too fast and turning your head makes you dizzy."
          tryIt="halve the time for one turn and watch 'feels like'."
          onApply={() => setT(Math.max(4, T / 2))}
        />
        <Challenge
          goal="Design a station with **Earth gravity** at the rim (0.98 to 1.02 g) that spins no faster than **2 turns a minute**, so its crew doesn't feel sick."
          done={comfy}
          hint="At most 2 rpm means the period is at least 30 s. For 1 g you need $4\pi^2 r / T^2 = 9.8$. What radius does that give?"
          success={`A radius of ${num(r, 0)} m: a ring ${num(2 * r, 0)} m across. That's why realistic designs for spinning stations are so big, and why no one has built one yet.`}
        />
      </WhatIfs>
    </>
  );
}

export const circles: BlockDef = {
  id: 'circles',
  title: 'Going in circles',
  hook: 'If nothing is pushing a spinning thing outwards, what does the string actually do?',
  explain: `Anything moving in a circle is turning all the time, and turning is a change of velocity, so it is **accelerating**, towards the centre. Something has to pull it inwards: a string, the road on a roundabout, gravity for a moon. Nothing pushes it outwards. Let go, and it flies off in a straight line, along the circle's edge at that point.

That's how you could make gravity in space. Spin a ring-shaped station and the floor has to keep pushing everyone inwards to carry them round. That push feels exactly like weight. Faster spin or a bigger ring gives stronger "gravity". Nothing actually pulls you down: the floor just keeps getting in the way of the straight line you'd otherwise follow.`,
  Sim: CirclesSim,
  maths: [
    {
      title: 'Where $v^2/r$ comes from',
      body: `In one second, an object going round a circle at speed $v$ turns through an angle of $v/r$ radians (the arc length it covers divided by the radius). Its velocity arrow, of length $v$, turns by the same angle, and a short arrow of length $v$ turning by a small angle changes by about $v \\times$ angle (the Arrows block showed this change points at the centre). So each second the velocity changes by $v \\times v/r$: the acceleration is $v^2/r$.`,
    },
  ],
  deeper: `**Spinning stations in fiction and fact.** The rotating wheel of *2001: A Space Odyssey* and the *Hermes* ship in *The Martian* are realistic designs. In 1966 the Gemini 11 crew tied their capsule to a rocket stage with a 30 m tether and set the pair slowly spinning: the first artificial gravity, about 0.00015 g.

**Why not just spin a small one fast?** Above about 2 rpm, turning your head inside a spinning room confuses your inner ear (the same "pseudo-force" that curves the dropped ball in the riding view), and most people feel sick. Hence the half-kilometre answer to the challenge.

**"Centrifugal force".** Riding with the station, things seem to be flung outwards and dropped balls curve sideways. Physicists call these *fictitious forces*: they're what a straight-line motion looks like from a spinning point of view. From outside, there's only ever the inward push.`,
  next: 'For the Moon, the string is gravity. So how hard does gravity pull, and on what?',
};
