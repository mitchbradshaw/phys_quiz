// Medium 2: Orbits are ellipses. Launch a planet from 1 AU at any speed and angle; the exact conic orbit is drawn
// with the Sun at one focus, Kepler's equal-area wedges (equal times), and the planet moving by Kepler's equation:
// fast near the Sun, slow far out. Units inside: AU, years, GM = 4π².
// Colours: speed blue, distances gold, time purple, mass green.
import { useMemo, useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { Challenge, Formula, Formulas, num, WhatIfs } from '../../ui/blockkit';
import { Q, TRAIL } from '../../ui/colors';
import { Readout, Readouts, SimLayout, Slider, Toggle } from '../../ui/kit';
import { SpacePanel, Vec } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const MU = 4 * Math.PI * Math.PI; // AU³/yr²
const KMS = 4.7406; // km/s per AU/yr
const VC = (2 * Math.PI) * KMS; // circular speed at 1 AU, km/s (29.8)
const W = 560;
const H = 380;
const WEDGES = 12;

interface Orbit {
  bound: boolean;
  a: number;
  e: number;
  w: number; // argument of perihelion (rad)
  T: number; // years
  M0: number; // mean anomaly at launch
  q: number;
  Qa: number;
}

function orbitFrom(vKms: number, tiltDeg: number): Orbit {
  const v = vKms / KMS;
  const al = Math.PI / 2 - (tiltDeg * Math.PI) / 180; // velocity direction, from +x
  const [x, y] = [1, 0];
  const [vx, vy] = [v * Math.cos(al), v * Math.sin(al)];
  const r = 1;
  const eps = (v * v) / 2 - MU / r;
  const rv = x * vx + y * vy;
  const ex = ((v * v - MU / r) * x - rv * vx) / MU;
  const ey = ((v * v - MU / r) * y - rv * vy) / MU;
  const e = Math.hypot(ex, ey);
  const w = e > 1e-9 ? Math.atan2(ey, ex) : 0;
  if (eps >= 0 || e >= 1) return { bound: false, a: Infinity, e, w, T: Infinity, M0: 0, q: (Math.pow(x * vy - y * vx, 2) / MU) / (1 + e), Qa: Infinity };
  const a = -MU / (2 * eps);
  const f0 = 0 - w; // true anomaly at launch
  const E0 = 2 * Math.atan(Math.sqrt((1 - e) / (1 + e)) * Math.tan(f0 / 2));
  return { bound: true, a, e, w, T: 2 * Math.PI * Math.sqrt((a * a * a) / MU), M0: E0 - e * Math.sin(E0), q: a * (1 - e), Qa: a * (1 + e) };
}

function solveE(M: number, e: number) {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 30; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

/** Position (AU) at time t (years) after launch. */
function posAt(o: Orbit, t: number): [number, number] {
  const n = (2 * Math.PI) / o.T;
  const M = o.M0 + n * t;
  const E = solveE(((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), o.e);
  const f = 2 * Math.atan2(Math.sqrt(1 + o.e) * Math.sin(E / 2), Math.sqrt(1 - o.e) * Math.cos(E / 2));
  const r = o.a * (1 - o.e * Math.cos(E));
  return [r * Math.cos(f + o.w), r * Math.sin(f + o.w)];
}

function EllipsesSim() {
  const [v, setV] = useState(34);
  const [tilt, setTilt] = useState(0);
  const [wedges, setWedges] = useState(true);
  const [t, setT] = useState(0);
  const visRef = useRef<HTMLDivElement>(null);
  const o = useMemo(() => orbitFrom(v, tilt), [v, tilt]);
  const lapSeconds = 6; // one orbit takes 6 real seconds
  useRaf((dt) => setT((c) => (o.bound ? (c + (dt * o.T) / lapSeconds) % o.T : c + dt * 0.3)), true, visRef);

  // scale: fit the orbit (bounded) or a 6 AU window (escaping)
  const bAU = o.bound ? o.a * Math.sqrt(1 - o.e * o.e) : 3;
  const halfX = o.bound ? Math.hypot(o.a * Math.cos(o.w), bAU * Math.sin(o.w)) : 3;
  const halfY = o.bound ? Math.hypot(o.a * Math.sin(o.w), bAU * Math.cos(o.w)) : 3;
  const k = Math.min((W - 60) / (2 * halfX), (H - 60) / (2 * halfY), 150);
  const cxAU = o.bound ? -o.a * o.e : 0; // ellipse centre along the major axis, relative to the Sun
  const sunX = W / 2 - (o.bound ? cxAU * Math.cos(o.w) * k : 0);
  const sunY = H / 2 + (o.bound ? cxAU * Math.sin(o.w) * k : 0);
  const S = (x: number, y: number) => ({ x: sunX + x * k, y: sunY - y * k });

  const path = useMemo(() => {
    if (!o.bound) {
      // escaping: a branch of the hyperbola (or parabola) from the launch point outwards
      const p = (1 * (v / KMS)) ** 2 * Math.cos((tilt * Math.PI) / 180) ** 2 / MU;
      let d = '';
      const f0 = -o.w;
      for (let i = 0; i <= 200; i++) {
        const f = f0 + (i / 200) * (Math.acos(-1 / Math.max(o.e, 1.0001)) - 0.02 - f0);
        const r = p / (1 + o.e * Math.cos(f));
        if (r < 0 || r > 50) break;
        const pt = S(r * Math.cos(f + o.w), r * Math.sin(f + o.w));
        d += `${i ? 'L' : 'M'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      }
      return d;
    }
    let d = '';
    for (let i = 0; i <= 240; i++) {
      const E = (i / 240) * 2 * Math.PI;
      const xx = o.a * (Math.cos(E) - o.e);
      const yy = o.a * Math.sqrt(1 - o.e * o.e) * Math.sin(E);
      const pt = S(xx * Math.cos(o.w) - yy * Math.sin(o.w), xx * Math.sin(o.w) + yy * Math.cos(o.w));
      d += `${i ? 'L' : 'M'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }
    return d + 'Z';
  }, [o, k, sunX, sunY]); // eslint-disable-line react-hooks/exhaustive-deps

  const wedgeEls = useMemo(() => {
    if (!o.bound || !wedges) return null;
    return Array.from({ length: WEDGES }, (_, j) => {
      let d = `M${sunX},${sunY}`;
      for (let s = 0; s <= 16; s++) {
        const [x, y] = posAt(o, ((j + s / 16) / WEDGES) * o.T);
        const pt = S(x, y);
        d += `L${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      }
      return <path key={j} d={d + 'Z'} fill={j % 2 ? 'rgba(242,201,76,0.16)' : 'rgba(242,201,76,0.06)'} stroke="none" />;
    });
  }, [o, wedges, k, sunX, sunY]); // eslint-disable-line react-hooks/exhaustive-deps

  const [px, py] = o.bound ? posAt(o, t) : [1, 0];
  const P = S(px, py);
  const rNow = Math.hypot(px, py);
  const vNow = o.bound ? Math.sqrt(MU * (2 / rNow - 1 / o.a)) * KMS : v;
  const peri = o.bound ? S(o.q * Math.cos(o.w), o.q * Math.sin(o.w)) : null;
  const aph = o.bound ? S(-o.Qa * Math.cos(o.w), -o.Qa * Math.sin(o.w)) : null;
  const focus2 = o.bound ? S(-2 * o.a * o.e * Math.cos(o.w), -2 * o.a * o.e * Math.sin(o.w)) : null;
  const marsDone = o.bound && Math.abs(o.q - 1) < 0.01 && Math.abs(o.Qa - 1.524) < 0.02;
  const launch = S(1, 0);
  const al = Math.PI / 2 - (tilt * Math.PI) / 180;

  const visual = (
    <div ref={visRef}>
      <SpacePanel w={W} h={H} ariaLabel={o.bound ? `Ellipse with eccentricity ${o.e.toFixed(2)}, period ${o.T.toFixed(2)} years.` : 'Escape: the orbit is open.'} tags={[o.bound ? `One orbit = ${num(o.T, o.T < 10 ? 2 : 0)} years, shown in 6 s` : 'Open orbit: it never comes back']} tagsAt="tl" stars={80}>
        {wedgeEls}
        <path d={path} fill="none" stroke={TRAIL} strokeWidth={1.8} opacity={0.8} />
        {o.bound && peri && aph && (
          <>
            <line x1={peri.x} y1={peri.y} x2={aph.x} y2={aph.y} stroke={Q.s} strokeDasharray="4 4" opacity={0.6} />
            <text x={peri.x} y={peri.y - 8} textAnchor="middle" className="plot-note" fill={Q.s}>
              closest
            </text>
            <text x={aph.x} y={aph.y - 8} textAnchor="middle" className="plot-note" fill={Q.s}>
              furthest
            </text>
          </>
        )}
        {focus2 && o.e > 0.05 && <circle cx={focus2.x} cy={focus2.y} r={3} fill="none" stroke="var(--text-3)" />}
        <circle cx={sunX} cy={sunY} r={8} fill="#f2b84b" />
        {/* Earth's orbit for reference */}
        <circle cx={sunX} cy={sunY} r={k} fill="none" stroke="#2f6fa3" strokeOpacity={0.45} strokeDasharray="2 4" />
        <Vec x1={launch.x} y1={launch.y} x2={launch.x + Math.cos(al) * 40} y2={launch.y - Math.sin(al) * 40} color={Q.v} width={2} head={7} opacity={0.5} />
        <circle cx={P.x} cy={P.y} r={5.5} fill="#cfe0ff" stroke="#fff" />
        {o.bound && <line x1={sunX} y1={sunY} x2={P.x} y2={P.y} stroke={Q.s} strokeWidth={1} opacity={0.6} />}
      </SpacePanel>
    </div>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <div className="ctl-title">Launch from the Earth's distance (1 AU)</div>
        <Slider label="launch speed" tex="\qv{v}" tip={`circular speed here is ${VC.toFixed(1)} km/s; escape speed is ${(VC * Math.SQRT2).toFixed(1)} km/s`} value={v} min={12} max={45} step={0.1} unit="km/s" onChange={setV} />
        <Slider label="launch angle" tip="0° = at right angles to the line to the Sun; positive tilts outwards" value={tilt} min={-60} max={60} step={1} unit="°" onChange={setTilt} />
        <Toggle checked={wedges} onChange={setWedges} label="Shade 12 slices of equal time" />
      </div>
      <div className="ctl-group">
        <Readouts>
          <Readout tex="\qs{a}" tip="semi-major axis: half the longest width; the orbit's average distance" value={o.bound ? o.a : NaN} unit="AU" sig={3} />
          <Readout tex="e" tip="eccentricity: 0 = circle, close to 1 = very stretched" value={o.e} sig={3} />
          <Readout label="closest" tip="perihelion distance" value={o.q} unit="AU" sig={3} />
          <Readout label="furthest" tip="aphelion distance" value={o.bound ? o.Qa : NaN} unit="AU" sig={3} />
          <Readout tex="\qt{T}" tip="time for one orbit" value={o.bound ? o.T : NaN} unit="years" sig={3} />
          <Readout tex="\qv{v}" tip="speed right now" value={vNow} unit="km/s" sig={3} />
        </Readouts>
        {!o.bound && <div className="note">Faster than escape speed: the orbit opens out and the planet never returns.</div>}
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="Speed and size: the vis-viva law"
          tex="\qv{v}^{2} = G\qm{M}\left(\frac{2}{\qs{r}} - \frac{1}{\qs{a}}\right)"
          say="Your speed anywhere on an orbit depends only on how far you are from the Sun, $r$, and on the orbit's size, $a$. Closer in, faster. The circle is the special case $r = a$, where it becomes $v^2 = GM/r$."
          where={[
            ['\\qv{v}', 'speed at that point (m/s)'],
            ['G\\qm{M}', "the Sun's mass times G"],
            ['\\qs{r}', 'distance from the Sun at that point'],
            ['\\qs{a}', 'semi-major axis: half the ellipse’s longest width, the average of closest and furthest'],
          ]}
          live={o.bound ? `\\qs{a} = \\frac{\\qs{${num(o.q, 3)}} + \\qs{${num(o.Qa, 3)}}}{2} = \\qs{${num(o.a, 3)}}\\ \\text{AU} \\qquad \\qv{v}_{\\text{now}} = \\qv{${num(vNow, 1)}}\\ \\text{km/s}` : `\\qs{a} \\to \\infty:\\ \\text{the orbit never closes}`}
        />
        <Formula
          title="Equal areas in equal times"
          tex="\qs{r}\,\qv{v_\perp} = \text{constant}"
          say="Kepler's second law. The line from the Sun to the planet sweeps out equal areas in equal times, so the planet must race when close and crawl when far. In Newton's terms: the planet's sideways speed times its distance never changes (its angular momentum is conserved)."
          where={[
            ['\\qs{r}', 'distance from the Sun'],
            ['\\qv{v_\\perp}', 'the part of the velocity at right angles to the line to the Sun'],
          ]}
          live={o.bound ? `\\qs{${num(o.q, 3)}} \\times \\qv{${num(Math.sqrt(MU * (2 / o.q - 1 / o.a)) * KMS, 1)}} = \\qs{${num(o.Qa, 3)}} \\times \\qv{${num(Math.sqrt(MU * (2 / o.Qa - 1 / o.a)) * KMS, 1)}}` : null}
          liveNote={o.bound ? 'Closest × speed there = furthest × speed there (AU × km/s).' : undefined}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="el-faster"
          question="Launch sideways a little faster than circular speed. Where on the new orbit is the launch point?"
          options={['It becomes the closest point to the Sun', 'It becomes the furthest point', 'Halfway between', 'The orbit stays a circle, just bigger']}
          answer={0}
          explain="Extra speed makes the planet climb away from the Sun, swinging out to a far point on the opposite side and coming back to where it started. The launch point is now the bottom of the swing: the closest point. Launch *slower* than circular and it becomes the furthest point instead."
          tryIt="launch speed 33 km/s, angle 0°."
          onApply={() => {
            setV(33);
            setTilt(0);
            setT(0);
          }}
        />
        <WhatIf
          id="el-comet"
          question="A comet on a very stretched orbit (like Halley's, $e \approx 0.97$). Where does it spend most of its time?"
          options={['Far out, crawling around the far end', 'Close to the Sun', 'Evenly spread around the orbit', 'Halfway out']}
          answer={0}
          explain="Equal areas in equal times: near the Sun the slices are short and fat, far out they are long and thin, so the comet whips past the Sun in a few months and spends decades out in the cold. Halley's comet spends about 74 of its 76 years beyond Jupiter's orbit."
          tryIt="launch at 41.8 km/s and look at the equal-time slices."
          onApply={() => {
            setV(41.8);
            setTilt(0);
            setWedges(true);
            setT(0);
          }}
        />
        <WhatIf
          id="el-escape"
          question="How much faster than circular speed must you launch to escape the Sun completely?"
          options={['About 1.41 times (√2)', 'Twice as fast', 'About 1.1 times', 'Any extra speed will do']}
          answer={0}
          fixedOrder
          explain="At $v = \sqrt{2}\,v_{\text{circle}}$, about 42.1 km/s here, the ellipse stretches to infinite length and becomes an open curve (a parabola): the planet leaves and never returns. Any faster and the path is a hyperbola. Ellipse, parabola, hyperbola: all three are *conic sections*, slices through a cone."
          tryIt="push the launch speed past 42.1 km/s."
          onApply={() => {
            setV(43);
            setTilt(0);
            setT(0);
          }}
        />
        <Challenge
          goal="Launch onto an orbit whose closest point is the Earth (1 AU) and whose furthest point just reaches **Mars** (1.52 AU)."
          done={marsDone}
          hint="To make the launch point the closest point, launch at right angles (0°). Then only the speed decides how far out the orbit swings."
          success={`That's a **transfer orbit** to Mars: launch at ${num(v, 1)} km/s and you coast out to Mars's distance in ${num(o.T / 2, 2)} years. Real Mars missions fly exactly this, coming up in "To catch up, slow down".`}
        />
      </WhatIfs>
    </>
  );
}

export const ellipses: BlockDef = {
  id: 'ellipses',
  title: 'Orbits are ellipses',
  hook: 'Why are orbits stretched loops rather than circles, and what decides the stretch?',
  explain: `A circle needs exactly the right speed, at exactly right angles to the pull. Anything else, and gravity and motion strike a different bargain. Launch a bit faster and the planet climbs outwards, slowing as it goes, until gravity turns it round; it swings back, speeding up, and passes its starting point again. The result is an **ellipse**, with the Sun not at the centre but at one **focus**.

Two numbers describe the shape: the **semi-major axis** $a$, half the longest width (the orbit's size), and the **eccentricity** $e$, how stretched it is (0 is a circle). Kepler found both of his other laws in these shapes: the Sun sits at a focus, and the line to the planet sweeps out **equal areas in equal times**. Push the speed far enough and the ellipse never closes: the planet escapes.`,
  Sim: EllipsesSim,
  maths: [
    {
      title: 'What an ellipse is',
      body: `Pin a loop of string at two points (the **foci**) and run a pencil around it, keeping the string tight: that's an ellipse. The two distances from any point to the foci always add up to the same total, $2a$. Move the pins together and you get a circle; pull them apart and it stretches. The eccentricity is the distance between the pins divided by $2a$. The small circle in the picture marks the empty focus.`,
    },
  ],
  deeper: `**Kepler's struggle.** Kepler spent six years trying to fit Mars to circles and combinations of circles. His best circle model missed by 8 arcminutes (a quarter of the Moon's width), and he trusted Tycho Brahe's data enough to throw it out. The ellipse fitted perfectly (1609).

**The Earth's orbit is nearly a circle**, $e = 0.017$: it is about 5 million km closer to the Sun in early January than in early July. That's not why we have seasons (the tilt of the Earth's axis is); the southern summer is just a little warmer for it.

**Real orbits aren't perfect ellipses.** The other planets tug, so ellipses slowly turn. Mercury's turns a tiny bit too much, by 43 arcseconds per century, and Newton couldn't explain it. Einstein's general relativity did, in 1915, its first triumph.`,
  next: 'So far the Sun has sat still in the middle. But the Sun is pulled by the planets too. Who is really orbiting whom?',
};
