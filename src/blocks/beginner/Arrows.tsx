// Beginner 2: Arrows. Velocity is an arrow. Two views share one velocity diagram: launching from the moving Earth
// (arrows add head to tail), and the Earth's own velocity a few weeks apart (same speed, new direction, so the
// change Δv is not zero, and it points at the Sun). All velocities blue; the acceleration it implies is orange.
import { useState } from 'react';
import type { BlockDef } from '../../content/types';
import { Challenge, Formula, Formulas, num, WhatIfs } from '../../ui/blockkit';
import { Q, TRAIL } from '../../ui/colors';
import { Readout, Readouts, Segmented, SimLayout, Slider, Toggle } from '../../ui/kit';
import { SpacePanel, useSvgDrag, Vec } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const VE = 29.8; // Earth's orbital speed, km/s
const W = 560;
const H = 390;
const O = { x: 214, y: 236 }; // origin of the velocity diagram
const K = 4; // px per km/s
const LMAX = 40; // largest launch, km/s
const INS = { x: 10, y: 10, w: 160, h: 160, sx: 90, sy: 108, r: 56 }; // orbit inset: Sun at (sx, sy)
type Mode = 'add' | 'change';
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

function ArrowsSim() {
  const [mode, setMode] = useState<Mode>('add');
  const [ls, setLs] = useState(6); // launch speed, km/s
  const [ld, setLd] = useState(40); // launch direction, degrees (0 = with Earth's motion, 90 = away from the Sun)
  const [parts, setParts] = useState(false);
  const [days, setDays] = useState(30);

  // adding
  const lx = ls * Math.cos(rad(ld));
  const ly = ls * Math.sin(rad(ld));
  const tx = VE + lx;
  const ty = ly;
  const tot = Math.hypot(tx, ty);
  const totDeg = deg(Math.atan2(ty, tx));
  const P = (vx: number, vy: number) => ({ x: O.x + vx * K, y: O.y - vy * K });
  const earthTip = P(VE, 0);
  const tip = P(tx, ty);

  // changing: Earth moves clockwise in the picture (Sun below it at the start)
  const phi = (2 * Math.PI * days) / 365.25;
  const later = { x: VE * Math.cos(phi), y: -VE * Math.sin(phi) };
  const dvx = later.x - VE;
  const dvy = later.y;
  const dv = Math.hypot(dvx, dvy); // km/s
  const aAvg = (dv * 1000) / (days * 86400); // m/s²

  const drag = useSvgDrag((p, phase) => {
    if (phase === 'end' || mode !== 'add') return;
    const vx = (p.x - earthTip.x) / K;
    const vy = (earthTip.y - p.y) / K;
    setLs(Math.min(LMAX, Math.round(Math.hypot(vx, vy) * 10) / 10));
    setLd(Math.round(deg(Math.atan2(vy, vx))));
  });

  const straightOut = mode === 'add' && Math.abs(totDeg - 90) <= 1.5 && tot > 0.5;

  // inset geometry
  const ex = INS.sx;
  const ey = INS.sy - INS.r;
  const lat = { x: INS.sx + INS.r * Math.sin(phi), y: INS.sy - INS.r * Math.cos(phi) };
  const mid = { x: INS.sx + INS.r * Math.sin(phi / 2), y: INS.sy - INS.r * Math.cos(phi / 2) };

  const visual = (
    <SpacePanel w={W} h={H} ariaLabel={mode === 'add' ? `Launch at ${ls} km/s; total ${tot.toFixed(1)} km/s relative to the Sun.` : `Earth's velocity ${days} days apart; change ${dv.toFixed(1)} km/s.`} tags={['Velocity diagram: 1 square = 5 km/s']} tagsAt="br" stars={60}>
      {/* grid of the velocity diagram */}
      {Array.from({ length: 29 }, (_, q) => q - 14).map((q) => (
        <line key={`gx${q}`} x1={O.x + q * 5 * K} x2={O.x + q * 5 * K} y1={0} y2={H} stroke="rgba(255,255,255,0.05)" />
      ))}
      {Array.from({ length: 21 }, (_, q) => q - 10).map((q) => (
        <line key={`gy${q}`} x1={0} x2={W} y1={O.y + q * 5 * K} y2={O.y + q * 5 * K} stroke="rgba(255,255,255,0.05)" />
      ))}
      <circle cx={O.x} cy={O.y} r={3} fill="var(--text-2)" />
      {mode === 'add' ? (
        <>
          <Vec x1={O.x} y1={O.y} x2={earthTip.x} y2={earthTip.y} color={Q.v} width={2.5} opacity={0.75} />
          <text x={(O.x + earthTip.x) / 2} y={O.y + 18} textAnchor="middle" className="plot-note" fill={Q.v}>
            Earth: 29.8 km/s
          </text>
          <Vec x1={earthTip.x} y1={earthTip.y} x2={tip.x} y2={tip.y} color={Q.v} width={2.2} dash="6 4" label="launch" labelOffset={14} />
          <Vec x1={O.x} y1={O.y} x2={tip.x} y2={tip.y} color={Q.v} width={4.5} head={13} />
          <text x={(O.x + tip.x) / 2 - 8} y={(O.y + tip.y) / 2 - 8} textAnchor="end" fontSize={13} fontWeight={700} fill={Q.v}>
            total
          </text>
          {parts && (
            <>
              <line x1={tip.x} y1={tip.y} x2={tip.x} y2={O.y} stroke={Q.v} strokeDasharray="3 3" opacity={0.6} />
              <line x1={O.x} y1={tip.y} x2={tip.x} y2={tip.y} stroke={Q.v} strokeDasharray="3 3" opacity={0.6} />
              <text x={(O.x + tip.x) / 2} y={O.y + 34} textAnchor="middle" className="plot-note" fill="var(--text-2)">
                across {num(tx)} km/s
              </text>
              <text x={tip.x + 6} y={(O.y + tip.y) / 2} className="plot-note" fill="var(--text-2)">
                up {num(ty)} km/s
              </text>
            </>
          )}
          <circle cx={tip.x} cy={tip.y} r={9} fill="none" stroke={Q.v} strokeWidth={1.4} opacity={0.8} />
          <rect x={0} y={0} width={W} height={H} fill="transparent" {...drag} />
        </>
      ) : (
        <>
          <Vec x1={O.x} y1={O.y} x2={earthTip.x} y2={earthTip.y} color={Q.v} width={3} label="now" />
          <Vec x1={O.x} y1={O.y} x2={O.x + later.x * K} y2={O.y - later.y * K} color={Q.v} width={3} label={`${days} days later`} labelOffset={20} />
          <Vec x1={earthTip.x} y1={earthTip.y} x2={O.x + later.x * K} y2={O.y - later.y * K} color={Q.v} width={2.4} dash="6 4" />
          <text x={(earthTip.x + O.x + later.x * K) / 2 + 10} y={(earthTip.y + O.y - later.y * K) / 2} className="plot-note" fill={Q.v} fontWeight={700}>
            change Δv
          </text>
        </>
      )}

      {/* orbit inset: where the Earth is and where the Sun is */}
      <rect x={INS.x} y={INS.y} width={INS.w} height={INS.h} rx={8} fill="rgba(5,7,11,0.85)" stroke="rgba(255,255,255,0.15)" />
      <circle cx={INS.sx} cy={INS.sy} r={INS.r} fill="none" stroke="rgba(255,255,255,0.18)" strokeDasharray="2 3" />
      <circle cx={INS.sx} cy={INS.sy} r={9} fill="#f2b84b" />
      <text x={INS.sx} y={INS.sy + 24} textAnchor="middle" className="plot-note" fill="var(--text-3)">
        Sun
      </text>
      <circle cx={ex} cy={ey} r={4.5} fill="#2f6fa3" stroke="#9cc3e6" strokeWidth={1} />
      {mode === 'add' ? (
        <>
          <Vec x1={ex} y1={ey} x2={ex + 30} y2={ey} color={Q.v} width={1.8} head={6} opacity={0.75} />
          <Vec x1={ex} y1={ey} x2={ex + (tx / Math.max(tot, 1e-6)) * Math.min(48, tot * 1.0)} y2={ey - (ty / Math.max(tot, 1e-6)) * Math.min(48, tot * 1.0)} color={Q.v} width={2.6} head={7} />
          <text x={INS.x + 8} y={INS.y + INS.h - 8} className="plot-note" fill="var(--text-3)">
            from above: Earth and you
          </text>
        </>
      ) : (
        <>
          <path d={`M${ex},${ey} A${INS.r},${INS.r} 0 ${phi > Math.PI ? 1 : 0} 1 ${lat.x.toFixed(1)},${lat.y.toFixed(1)}`} fill="none" stroke={TRAIL} strokeWidth={1.6} opacity={0.7} />
          <circle cx={lat.x} cy={lat.y} r={4.5} fill="#2f6fa3" stroke="#9cc3e6" strokeWidth={1} />
          <Vec x1={ex} y1={ey} x2={ex + 26} y2={ey} color={Q.v} width={1.8} head={6} />
          <Vec x1={lat.x} y1={lat.y} x2={lat.x + 26 * Math.cos(phi)} y2={lat.y + 26 * Math.sin(phi)} color={Q.v} width={1.8} head={6} />
          <Vec x1={mid.x} y1={mid.y} x2={mid.x + (INS.sx - mid.x) * 0.45} y2={mid.y + (INS.sy - mid.y) * 0.45} color={Q.a} width={2.4} head={7} />
          <text x={INS.x + 8} y={INS.y + INS.h - 8} className="plot-note" fill="var(--text-3)">
            orange: the change points at the Sun
          </text>
        </>
      )}
    </SpacePanel>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Segmented<Mode>
          size="sm"
          label="What to show"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'add', label: 'Adding velocities' },
            { value: 'change', label: 'Changing velocity' },
          ]}
        />
      </div>
      {mode === 'add' ? (
        <div className="ctl-group">
          <div className="ctl-title">Your launch, relative to the Earth (or drag the arrow tip)</div>
          <Slider label="launch speed" tex="\qv{v_{\text{launch}}}" tip="how fast you leave the Earth, measured from the Earth" value={ls} min={0} max={LMAX} step={0.1} unit="km/s" onChange={setLs} />
          <Slider label="launch direction" tip="0° = the way Earth is moving, 90° = straight away from the Sun, 180° = backwards, −90° = towards the Sun" value={ld} min={-180} max={180} step={1} unit="°" onChange={setLd} />
          <Toggle checked={parts} onChange={setParts} label="Show the across and up parts" />
          <Readouts>
            <Readout tex="\qv{v_{\text{total}}}" tip="your speed relative to the Sun: the length of the total arrow" value={tot} unit="km/s" sig={3} />
            <Readout label="pointing" tip="direction of the total arrow (0° = Earth's direction of motion, 90° = away from the Sun)" text={`${Math.round(totDeg)}°`} />
          </Readouts>
        </div>
      ) : (
        <div className="ctl-group">
          <Slider label="time between the two arrows" tex="\qt{\Delta t}" tip="how many days apart the two velocity arrows are" value={days} min={1} max={180} step={1} unit="days" onChange={setDays} />
          <Readouts>
            <Readout label="speed now" value={VE} unit="km/s" sig={3} tone="m1" />
            <Readout label="speed later" value={VE} unit="km/s" sig={3} tone="m1" />
            <Readout tex="\qv{|\Delta \vec v|}" tip="size of the change in velocity" value={dv} unit="km/s" sig={3} />
            <Readout tex="\qa{a}" tip="average acceleration over that time: change in velocity ÷ time" value={aAvg * 1000} unit="mm/s²" sig={3} />
          </Readouts>
          <div className="note">Same speed, different direction: the velocity has changed, so the Earth is accelerating.</div>
        </div>
      )}
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="Adding velocities"
          tex="\qv{\vec v_{\text{total}}} = \qv{\vec v_{\text{Earth}}} + \qv{\vec v_{\text{launch}}}"
          say="Your velocity relative to the Sun is the Earth's velocity plus yours relative to the Earth, added **as arrows**: head to tail."
          where={[
            ['\\qv{\\vec v_{\\text{total}}}', 'your velocity relative to the Sun'],
            ['\\qv{\\vec v_{\\text{Earth}}}', "the Earth's velocity around the Sun: 29.8 km/s"],
            ['\\qv{\\vec v_{\\text{launch}}}', 'your velocity relative to the Earth, just after launch'],
            ['\\vec{v}', 'the arrow on top: this quantity has a direction as well as a size'],
          ]}
          live={mode === 'add' ? `|\\qv{\\vec v_{\\text{total}}}| = \\sqrt{(${num(tx)})^2 + (${num(ty)})^2} = \\qv{${num(tot, 2)}}\\ \\text{km/s}` : null}
          liveNote={mode === 'add' ? 'The across and up parts of the total, combined with Pythagoras.' : undefined}
        />
        <Formula
          title="Change of velocity"
          tex="\Delta\qv{\vec v} = \qv{\vec v_{\text{later}}} - \qv{\vec v_{\text{now}}} \qquad \qa{a} = \frac{\Delta\qv{v}}{\Delta\qt{t}}"
          say="The change is the arrow that takes you from the old arrow's tip to the new one's. Divide it by the time it took and you get the acceleration. A turn with no change of speed still counts."
          where={[
            ['\\Delta', '"change in" (the Greek letter delta)'],
            ['\\qv{\\vec v_{\\text{now}}},\\ \\qv{\\vec v_{\\text{later}}}', "the Earth's velocity at the two moments"],
            ['\\Delta\\qt{t}', 'the time between them'],
            ['\\qa{a}', 'the average acceleration over that time'],
          ]}
          live={mode === 'change' ? `\\qa{a} = \\frac{\\qv{${num(dv, 1)}}\\ \\text{km/s}}{\\qt{${days}}\\ \\text{days}} = \\qa{${num(aAvg * 1000, 2)}}\\ \\text{mm/s}^2` : null}
          liveNote={mode === 'change' ? 'A tiny acceleration, but it never stops, and it always points at the Sun: that is gravity at work.' : undefined}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="ar-backwards"
          question="Launch at 3 km/s straight **backwards**, against the Earth's motion. What happens to your speed around the Sun?"
          options={['It drops to about 27 km/s, and you start falling inwards, towards Venus', 'It rises to about 33 km/s', 'It stays at 29.8 km/s', 'You stop dead']}
          answer={0}
          explain="Arrows pointing opposite ways subtract: 29.8 − 3 ≈ 27 km/s. That's slower than the speed needed to stay in a circle at the Earth's distance, so the Sun's pull wins and you curve inwards. To reach Venus, you launch *backwards*."
          tryIt="launch speed 3 km/s, direction 180°."
          onApply={() => {
            setMode('add');
            setLs(3);
            setLd(180);
          }}
        />
        <WhatIf
          id="ar-sideways"
          question="Launch at 3 km/s **sideways**, straight away from the Sun. What is your speed relative to the Sun now?"
          options={['About 26.8 km/s', 'About 29.95 km/s', 'About 32.8 km/s', 'About 3 km/s']}
          answer={1}
          fixedOrder
          explain="At right angles the arrows make a right-angled triangle, so Pythagoras gives the total: $\sqrt{29.8^2 + 3^2} \approx 29.95$ km/s. The 3 km/s mostly changes your **direction**, hardly your speed. A sideways nudge turns; it doesn't speed you up."
          tryIt="launch speed 3 km/s, direction 90°, and show the parts."
          onApply={() => {
            setMode('add');
            setLs(3);
            setLd(90);
            setParts(true);
          }}
        />
        <WhatIf
          id="ar-steady"
          question="The Earth's speed around the Sun stays almost exactly the same all year. Is the Earth accelerating?"
          options={['Yes, because its direction keeps changing', 'No: a steady speed means no acceleration', 'Only slightly, when its speed drifts', 'No, because nothing is pushing it']}
          answer={0}
          explain="Velocity is an arrow, so turning it is a change, even when its length stays put. The change Δv points at the Sun every time, and so does the acceleration. Something must be causing it: the Sun's gravity. A steady speed in a circle is **always** an acceleration towards the centre."
          tryIt="switch to 'Changing velocity' and slide the days."
          onApply={() => {
            setMode('change');
            setDays(60);
          }}
        />
        <Challenge
          goal="Launch so that your velocity relative to the Sun points **straight away from the Sun** (straight up in the picture)."
          done={straightOut}
          hint="The total arrow must have no across part at all. The Earth gives you 29.8 km/s across. What must your launch do about that?"
          success={`You had to cancel the Earth's whole 29.8 km/s, so your launch is ${num(ls)} km/s, mostly *backwards*. That's far beyond any rocket ever flown, which is why no spacecraft flies straight out from the Sun: they keep most of the Earth's speed and curve outwards gradually instead.`}
        />
      </WhatIfs>
    </>
  );
}

export const arrows: BlockDef = {
  id: 'arrows',
  title: 'Arrows: velocity has a direction',
  hook: 'Why can a thing move at a perfectly steady speed and still be accelerating?',
  explain: `Some quantities are just a size: a mass, a temperature, the distance between two towns. Others have a **direction** too, and are drawn as arrows (physicists call them **vectors**). Velocity is one: 30 km/s *which way* matters as much as the 30.

Arrows add **head to tail**. You are already moving with the Earth at about 30 km/s around the Sun, so launch a rocket and its velocity relative to the Sun is the Earth's arrow plus the rocket's. Pointing the same way, the sizes add; pointing opposite ways, they subtract; at right angles, Pythagoras gives the answer.

Because velocity is an arrow, it can change without the speed changing: just turn it. The Earth's speed barely varies, but its direction changes all the time, so its velocity does too. Any change of velocity is an **acceleration**, so a planet on a steady orbit is accelerating towards the Sun every moment.`,
  Sim: ArrowsSim,
  maths: [
    {
      title: "Pythagoras: arrows at right angles",
      body: `Two arrows at right angles, placed head to tail, make the two short sides of a right-angled triangle; their total is the long side. Its length $c$ comes from $c^2 = a^2 + b^2$. Arrows of 3 and 4 give $\\sqrt{9 + 16} = 5$, not 7: at right angles, sizes don't simply add.`,
    },
    {
      title: 'The across and up parts of an arrow',
      body: `An arrow of length $v$ pointing at angle $\\theta$ above the across direction has an across part $v\\cos\\theta$ and an up part $v\\sin\\theta$. Cos and sin are calculator buttons that give the *fraction* of the arrow lying along each direction: at 0° it's all across ($\\cos 0^\\circ = 1$, $\\sin 0^\\circ = 0$); at 90° it's all up. To add any number of arrows, add their across parts, add their up parts, then use Pythagoras for the total.`,
    },
  ],
  deeper: `**You're already moving very fast.** The Earth's spin carries you east at up to 0.46 km/s; the Earth carries you around the Sun at 30 km/s; the Sun carries you around the galaxy at about 230 km/s. None of it can be felt, because only *changes* in velocity can be felt. Velocity only means something **relative** to something else. Galileo made this point with a ship sailing smoothly, and Einstein took it all the way to relativity.

**Why rockets launch east.** A rocket on the launch pad already has the Earth's spin, so launching east borrows it for free. That's why launch sites sit as close to the equator as possible, with open ocean to their east: Cape Canaveral, Kourou in French Guiana.`,
  next: 'Arrows tell you where motion points. Next, how position, velocity and acceleration tie together over time, on a straight track first.',
};
