// Beginner 10: Newton's cannon. Fire sideways from a (fantasy-tall) mountain on a to-scale planet: land, orbit or
// escape. Trajectories are integrated with real inverse-square gravity and played back at 1 s = 10 min.
// Colours: v blue (m1), gravity's pull F/g orange (m2), ball mass m green (m3), planet mass M purple (m4),
// distance r gold (m5).
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { makeRng } from '../../engine/rng';
import { EARTH, G, MARS, MOON, type Body } from '../../physics/constants';
import { circularSpeed, escapeSpeed, fieldAt, grazingSpeed, integrateLaunch, orbitPeriod, sampleIndexAt, type Trajectory } from '../../physics/gravity';
import { Challenge, Formula, Formulas, num, sci, SimTags, WhatIfs } from '../../ui/blockkit';
import { Button, Legend, Readout, Readouts, Segmented, SimLayout, Slider } from '../../ui/kit';
import { Rich } from '../../ui/Rich';
import { WhatIf } from '../../ui/WhatIf';

const WORLDS: Body[] = [EARTH, MOON, MARS];
const VMAX: Record<string, number> = { earth: 13, moon: 3, mars: 6 };
const W = 600;
const H = 440;
const CX = 300;
const CY = 226;
const RPX = { close: 104, wide: 34 };
const WARP = 600; // simulated seconds per real second: 1 s here = 10 min
const KV = 5.5; // px per km/s (velocity arrow)
const KG = 3.6; // px per m/s² (gravity arrow)
const MAX_TRAILS = 5;

const STARS = (() => {
  const r = makeRng(42);
  return Array.from({ length: 150 }, () => ({ x: r.uniform(0, W), y: r.uniform(0, H), r: r.uniform(0.3, 1.25), o: r.uniform(0.2, 0.85) }));
})();

interface Shot {
  id: number;
  tr: Trajectory;
  v: number; // km/s
}

interface Screen {
  xs: Float64Array;
  ys: Float64Array;
  step: number;
}

function toScreen(tr: Trajectory, k: number): Screen {
  const step = Math.max(1, Math.ceil(tr.n / 1500));
  const m = Math.floor((tr.n - 1) / step) + 2;
  const xs = new Float64Array(m);
  const ys = new Float64Array(m);
  let j = 0;
  for (let i = 0; i < tr.n; i += step, j++) {
    xs[j] = tr.x[i] * k;
    ys[j] = -tr.y[i] * k;
  }
  xs[j] = tr.x[tr.n - 1] * k;
  ys[j] = -tr.y[tr.n - 1] * k;
  return { xs: xs.subarray(0, j + 1), ys: ys.subarray(0, j + 1), step };
}

function pathD(s: Screen, count: number): string {
  let d = '';
  const n = Math.min(count, s.xs.length);
  for (let i = 0; i < n; i++) d += `${i ? 'L' : 'M'}${s.xs[i].toFixed(1)} ${s.ys[i].toFixed(1)}`;
  return d;
}

const fmtDuration = (sec: number) => (sec < 3 * 3600 ? `${Math.round(sec / 60)} min` : sec < 3 * 86400 ? `${(sec / 3600).toFixed(1)} h` : `${(sec / 86400).toFixed(1)} days`);

function describe(shot: Shot | undefined, body: Body): string {
  if (!shot) return 'Press **Fire!**';
  const tr = shot.tr;
  if (tr.outcome === 'impact') {
    const deg = ((tr.angle ?? 0) * 180) / Math.PI;
    const km = ((tr.angle ?? 0) * body.R) / 1000;
    return `**Landed** ${Math.round(km).toLocaleString('en-AU')} km round the surface (${deg.toFixed(0)}° of the way round), after ${fmtDuration(tr.t[tr.n - 1])} of falling.`;
  }
  if (tr.outcome === 'orbit') return `**Orbit!** One lap takes ${fmtDuration(tr.period ?? 0)}. It is falling the whole way round, and the ground keeps curving away beneath it.`;
  if (tr.bound) {
    const r0 = Math.hypot(tr.x[0], tr.y[0]);
    const v0 = Math.hypot(tr.vx[0], tr.vy[0]);
    const a = -1 / (v0 * v0 / (G * body.M) - 2 / r0);
    return `**A huge loop**, far beyond the edge of the view. It is still bound: it would come back after about ${fmtDuration(orbitPeriod(body.M, a))}.`;
  }
  return '**Escaped.** It is going too fast for gravity ever to pull it back.';
}

let nextShotId = 1;

function NewtonsCannonSim() {
  const [worldId, setWorldId] = useState('earth');
  const [h, setH] = useState(600); // km
  const [v, setV] = useState(6.5); // km/s
  const [m, setM] = useState(10); // kg
  const [view, setView] = useState<'close' | 'wide'>('close');
  const [shots, setShots] = useState<Shot[]>([]);
  const [animating, setAnimating] = useState(false);
  const [best, setBest] = useState<{ v: number; h: number; world: string } | null>(null);
  const uid = useId().replace(/:/g, '');

  const body = WORLDS.find((w) => w.id === worldId) ?? EARTH;
  const r0 = body.R + h * 1000;
  const vc = circularSpeed(body.M, r0);
  const ve = escapeSpeed(body.M, r0);
  const g = fieldAt(body.M, r0);
  const gSurf = fieldAt(body.M, body.R);
  const k = RPX[view] / body.R;
  const latest = shots[shots.length - 1];

  // ---- animation (refs only: React does not re-render per frame)
  const visRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const ballRef = useRef<SVGGElement>(null);
  const vArrowRef = useRef<SVGLineElement>(null);
  const gArrowRef = useRef<SVGLineElement>(null);
  const anim = useRef({ t: 0, looped: false, cnt: -1, done: true });
  const screen = useMemo(() => (latest ? toScreen(latest.tr, k) : null), [latest, k]);
  const live = useRef({ latest, screen, k, M: body.M });
  live.current = { latest, screen, k, M: body.M };

  const drawAt = (tt: number) => {
    const { latest: sh, screen: sc, k: kk, M } = live.current;
    const ball = ballRef.current;
    const path = pathRef.current;
    if (!ball || !path) return;
    if (!sh || !sc) {
      ball.setAttribute('visibility', 'hidden');
      path.setAttribute('d', '');
      return;
    }
    const tr = sh.tr;
    const a = anim.current;
    let t = tt;
    if (tr.outcome === 'orbit' && tr.period) {
      if (t >= tr.period) a.looped = true;
      t %= tr.period;
    } else t = Math.min(t, tr.t[tr.n - 1]);
    const i = sampleIndexAt(tr.t, t);
    const j = Math.min(i + 1, tr.n - 1);
    const f = j > i ? (t - tr.t[i]) / (tr.t[j] - tr.t[i]) : 0;
    const x = tr.x[i] + (tr.x[j] - tr.x[i]) * f;
    const y = tr.y[i] + (tr.y[j] - tr.y[i]) * f;
    const vx = tr.vx[i] + (tr.vx[j] - tr.vx[i]) * f;
    const vy = tr.vy[i] + (tr.vy[j] - tr.vy[i]) * f;
    const px = x * kk;
    const py = -y * kk;
    ball.setAttribute('visibility', 'visible');
    ball.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)})`);
    vArrowRef.current?.setAttribute('x2', ((vx / 1000) * KV).toFixed(1));
    vArrowRef.current?.setAttribute('y2', ((-vy / 1000) * KV).toFixed(1));
    const r = Math.hypot(x, y);
    const gl = fieldAt(M, r) * KG;
    gArrowRef.current?.setAttribute('x2', ((-x / r) * gl).toFixed(1));
    gArrowRef.current?.setAttribute('y2', ((y / r) * gl).toFixed(1));
    const cnt = a.looped ? sc.xs.length : Math.floor(i / sc.step) + 1;
    if (cnt !== a.cnt) {
      a.cnt = cnt;
      path.setAttribute('d', pathD(sc, cnt) + (a.looped ? '' : `L${px.toFixed(1)} ${py.toFixed(1)}`));
    }
  };

  useRaf(
    (dt) => {
      const a = anim.current;
      if (a.done) return;
      const tr = live.current.latest?.tr;
      a.t += dt * WARP;
      if (tr && tr.outcome !== 'orbit' && a.t >= tr.t[tr.n - 1]) {
        a.done = true;
        a.cnt = -1;
        setAnimating(false);
      }
      drawAt(a.t);
    },
    animating,
    visRef
  );

  // Redraw when the shot or the zoom changes (also while paused or finished).
  useEffect(() => {
    anim.current.cnt = -1;
    drawAt(anim.current.t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const fire = (o: { world?: string; h?: number; v?: number } = {}) => {
    const w = WORLDS.find((x) => x.id === (o.world ?? worldId)) ?? EARTH;
    const hh = o.h ?? h;
    const vv = o.v ?? v;
    const rr = w.R + hh * 1000;
    const bound = vv * 1000 < escapeSpeed(w.M, rr);
    const tr = integrateLaunch(w.M, w.R, 0, rr, vv * 1000, 0, bound ? Infinity : 8 * w.R);
    setShots((prev) => [...prev.slice(-(MAX_TRAILS - 1)), { id: nextShotId++, tr, v: vv }]);
    anim.current = { t: 0, looped: false, cnt: -1, done: false };
    setAnimating(true);
    if (tr.rMax > 2.05 * w.R) setView('wide');
    if (tr.outcome === 'orbit') setBest((b) => (b && b.world === w.id && b.h === hh && b.v <= vv ? b : { v: vv, h: hh, world: w.id }));
  };

  const clearShots = () => {
    setShots([]);
    anim.current = { t: 0, looped: false, cnt: -1, done: true };
    setAnimating(false);
  };

  // Fire once at the start so there is something to look at; it plays when scrolled into view.
  useEffect(() => {
    fire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeWorld = (id: string) => {
    const w = WORLDS.find((x) => x.id === id) ?? EARTH;
    const frac = v / (vc / 1000);
    clearShots();
    setWorldId(id);
    setView('close');
    setV(Number(Math.min(VMAX[id], frac * (circularSpeed(w.M, w.R + h * 1000) / 1000)).toFixed(2)));
  };

  const vcK = vc / 1000;
  const pct = (100 * v) / vcK;
  const Rk = body.R * k;
  const r0k = r0 * k;
  const hpx = r0k - Rk;
  const halfBase = Math.max(5, Math.min(38, hpx * 0.6));
  const phi = halfBase / Rk;
  const mountain = `${(-Rk * Math.sin(phi)).toFixed(1)},${(-Rk * Math.cos(phi) + 3).toFixed(1)} 0,${(-r0k).toFixed(1)} ${(Rk * Math.sin(phi)).toFixed(1)},${(-Rk * Math.cos(phi) + 3).toFixed(1)}`;
  const olderScreens = useMemo(() => shots.slice(0, -1).map((s) => ({ id: s.id, d: pathD(toScreen(s.tr, k), Infinity) })), [shots, k]);
  const bestBody = best ? (WORLDS.find((w) => w.id === best.world) ?? EARTH) : null;
  const minOrbit = best && bestBody ? grazingSpeed(bestBody.M, bestBody.R, bestBody.R + best.h * 1000) / 1000 : 0;

  const visual = (
    <div ref={visRef}>
      <div className="space" style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="anim" role="img" aria-label={`Cannon on a ${h} km mountain on ${body.name}, firing sideways at ${v.toFixed(2)} km/s.`}>
          <defs>
            <radialGradient id={`${uid}-planet`} cx="40%" cy="35%" r="75%">
              <stop offset="0%" stopColor={body.color} stopOpacity={1} />
              <stop offset="100%" stopColor="#05070b" stopOpacity={1} />
            </radialGradient>
            <marker id={`${uid}-hv`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--m1)" />
            </marker>
            <marker id={`${uid}-hg`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--m2)" />
            </marker>
          </defs>
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--star)" opacity={s.o} />
          ))}
          <g transform={`translate(${CX} ${CY})`}>
            <circle r={Rk} fill={`url(#${uid}-planet)`} stroke={body.color} strokeOpacity={0.6} />
            <text x={Rk * 0.32} y={Rk * 0.38} className="plot-note" fill="var(--m4)" fontWeight={700} fontSize={view === 'close' ? 15 : 11}>
              M
            </text>
            <line x1={0} y1={0} x2={0} y2={-r0k} stroke="var(--m5)" strokeWidth={1.4} strokeDasharray="4 4" />
            <text x={-8} y={-r0k * 0.5} textAnchor="end" className="plot-note" fill="var(--m5)" fontWeight={700}>
              r
            </text>
            <polygon points={mountain} fill="#4a5262" stroke="#6d7689" strokeWidth={1} />
            <g transform={`translate(0 ${(-r0k).toFixed(1)})`}>
              <rect x={-4} y={-7} width={17} height={5} rx={1.5} fill="#cfd5de" />
              <circle cx={0} cy={-2} r={3} fill="#8f98a8" />
            </g>
            {olderScreens.map((s, i) => (
              <path key={s.id} d={s.d} fill="none" stroke="var(--m3)" strokeWidth={1.4} opacity={0.18 + (0.3 * (i + 1)) / Math.max(1, olderScreens.length)} />
            ))}
            <path ref={pathRef} fill="none" stroke="var(--m3)" strokeWidth={2.2} />
            <g ref={ballRef} visibility="hidden">
              <line ref={gArrowRef} x1={0} y1={0} x2={0} y2={0} stroke="var(--m2)" strokeWidth={2.5} markerEnd={`url(#${uid}-hg)`} />
              <line ref={vArrowRef} x1={0} y1={0} x2={0} y2={0} stroke="var(--m1)" strokeWidth={2.5} markerEnd={`url(#${uid}-hv)`} />
              <circle r={5} fill="var(--m3)" stroke="#fff" strokeWidth={1} />
            </g>
          </g>
        </svg>
        <div style={{ position: 'absolute', left: 8, top: 8 }}>
          <SimTags items={['Planet to scale; the mountain is fantasy-tall', '1 s here = 10 min']} />
        </div>
      </div>
      <Legend
        items={[
          { label: 'velocity v', color: 'var(--m1)' },
          { label: "gravity's pull", color: 'var(--m2)' },
          { label: 'distance r from the centre', color: 'var(--m5)', dash: '4 4' },
          { label: 'cannonball path', color: 'var(--m3)' },
        ]}
      />
    </div>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <div className="row gap-s wrap">
          <Segmented
            size="sm"
            label="World"
            value={worldId}
            onChange={changeWorld}
            options={WORLDS.map((w) => ({ value: w.id, label: w.name, title: `${w.name}: M = ${w.M.toExponential(2)} kg, R = ${(w.R / 1000).toFixed(0)} km` }))}
          />
          <Segmented
            size="sm"
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'close', label: 'close' },
              { value: 'wide', label: 'wide' },
            ]}
          />
        </div>
        <Slider
          label="mountain height"
          tex="\ce{h}"
          tip="height of the launch point above the surface (km); the distance from the centre is r = R + h"
          value={h}
          min={100}
          max={3000}
          step={10}
          unit="km"
          sig={4}
          onChange={(x) => {
            clearShots();
            setH(x);
          }}
        />
        <Slider label="launch speed" tex="\ca{v}" tip="sideways speed out of the cannon (km/s)" value={v} min={0} max={VMAX[worldId]} step={VMAX[worldId] / 1000} unit="km/s" sig={3} onChange={setV} />
        <Slider label="cannonball mass" tex="\cc{m}" tip="mass of the cannonball (kg)" value={m} min={1} max={1000} log unit="kg" sig={3} onChange={setM} />
        <div className="row gap-s wrap">
          <Button variant="primary" onClick={() => fire()}>
            Fire!
          </Button>
          <Button size="sm" onClick={clearShots}>
            Clear paths
          </Button>
        </div>
        <Rich className="status" text={describe(latest, body)} />
      </div>
      <div className="ctl-group">
        <Readouts>
          <Readout tex="\ce{r}" tip="distance from the planet's centre, r = R + h" value={r0 / 1000} unit="km" sig={4} />
          <Readout tex="v_{\text{circle}}" tip="speed for a circular orbit at this height, √(GM/r)" value={vcK} unit="km/s" sig={3} tone="m1" />
          <Readout label="your speed" tip="your launch speed as a percentage of the circular-orbit speed" value={pct} unit="%" sig={3} tone={Math.abs(pct - 100) < 0.5 ? 'ok' : undefined} />
          <Readout tex="v_{\text{escape}}" tip="escape speed from this height, √(2GM/r)" value={ve / 1000} unit="km/s" sig={3} />
          <Readout tex="\cb{g}" tip="gravity's pull per kilogram at this height, GM/r²" value={g} unit="m/s²" sig={3} tone="m2" />
          <Readout tex="\cb{F}" tip="gravity's pull on the cannonball, F = mg" value={m * g} unit="N" sig={3} tone="m2" />
          <Readout tex="a = F/\cc{m}" tip="the cannonball's acceleration: pull divided by mass" value={(m * g) / m} unit="m/s²" sig={3} />
        </Readouts>
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="The speed that keeps missing the ground"
          tex="\frac{G\cd{M}\cc{m}}{\ce{r}^{2}} = \frac{\cc{m}\ca{v}^{2}}{\ce{r}} \;\Rightarrow\; \ca{v} = \sqrt{\frac{G\cd{M}}{\ce{r}}}"
          say="Gravity's pull on the ball (left) must be exactly the inward pull that a circle of radius $r$ needs (right). The ball's mass $m$ is on both sides, so it cancels: a pebble and a space station need the same speed."
          live={`\\ca{v} = \\sqrt{\\dfrac{${sci(G)} \\times \\cd{${sci(body.M)}}}{\\ce{${sci(r0)}}}} = \\ca{${num(vcK, 2)}}\\ \\text{km/s}`}
          liveNote={`Your cannon fires at **${v.toFixed(2)} km/s**: ${pct.toFixed(0)} % of that.`}
        />
        <Formula
          title="How hard gravity pulls up there"
          tex="\cb{g} = \frac{G\cd{M}}{\ce{r}^{2}}"
          say="The pull on each kilogram at distance $r$ from the planet's centre. Double the distance and it drops to a quarter: that's what the square on the bottom does."
          live={`\\cb{g} = \\dfrac{${sci(G)} \\times \\cd{${sci(body.M)}}}{(\\ce{${sci(r0)}})^{2}} = \\cb{${num(g, 2)}}\\ \\text{m/s}^2`}
          liveNote={`That's ${((100 * g) / gSurf).toFixed(0)} % of gravity at the surface. On a ${num(m, m < 10 ? 1 : 0)} kg ball it is a pull of ${num(m * g, 0)} N.`}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="nc-heavy"
          question="Make the cannonball **100 times heavier**. What launch speed does it need for a circular orbit?"
          options={['100 times faster', '10 times faster', 'Exactly the same speed', 'Slower, because it falls harder']}
          answer={2}
          explain="Gravity pulls the heavier ball 100 times harder, but it is also 100 times harder to turn: that is what mass *means*. Newton's second law, $a = F/m$, says the two effects cancel exactly, so everything at the same place falls with the same acceleration (watch $F$ jump and $a$ stay put) and needs the same orbital speed. Galileo saw the same thing dropping balls."
          tryIt="slide the mass up and watch F and a, then fire at the circular speed."
          onApply={() => {
            setM(1000);
            const vv = Number(vcK.toFixed(3));
            setV(vv);
            fire({ v: vv });
          }}
        />
        <WhatIf
          id="nc-iss"
          question="The International Space Station orbits about **400 km** up. How strong is gravity there, compared with on the ground?"
          options={['Zero: that is why astronauts float', 'About 10 %', 'About half', 'About 90 %']}
          answer={3}
          fixedOrder
          explain="At 400 km, $g$ is about 8.7 m/s², roughly **89 %** of its strength on the ground: 400 km is small next to Earth's 6370 km radius. Astronauts float because they and the station are falling *together*, all the time, at the same rate. The station is a Newton's cannonball. Nothing pushes up on their feet, so they feel weightless."
          tryIt="Earth, mountain 400 km, and read g."
          onApply={() => {
            changeWorld('earth');
            setH(400);
            const vv = Number((circularSpeed(EARTH.M, EARTH.R + 4e5) / 1000).toFixed(3));
            setV(vv);
            fire({ world: 'earth', h: 400, v: vv });
          }}
        />
        <WhatIf
          id="nc-escape"
          question="Fire at **1.5 times** the circular-orbit speed. What happens?"
          options={['A bigger circle', 'A long, stretched loop that comes back', 'It lands on the far side', 'It leaves and never comes back']}
          answer={3}
          explain="There is a speed above which gravity, weakening with distance, can never pull the ball back: the **escape speed**, exactly $\sqrt{2} \approx 1.41$ times the circular speed. Between 1 and 1.41 times you get ever longer loops (ellipses) that do come back; at 1.5 it is gone for good. Why $\sqrt2$? That's an energy story, coming in Medium."
          tryIt="set the speed to 1.5 × the circle speed and fire (switch to the wide view)."
          onApply={() => {
            const vv = Number(Math.min(VMAX[worldId], 1.5 * vcK).toFixed(3));
            setV(vv);
            setView('wide');
            fire({ v: vv });
          }}
        />
        <Challenge
          goal="Get the cannonball **all the way round and back to the mountain** without touching the ground, using the **slowest launch** you can find."
          done={!!best}
          hint="Faster than any shot that landed, but not so fast that it leaves. Then creep the speed down: type an exact value by clicking the number next to the slider."
          success={
            best
              ? `Your slowest orbit: **${best.v.toFixed(2)} km/s** from ${best.h} km up. The slowest possible from there is **${minOrbit.toFixed(2)} km/s**: any slower and it clips the ground on the far side, exactly halfway round.`
              : ''
          }
        />
      </WhatIfs>
    </>
  );
}

export const newtonsCannon: BlockDef = {
  id: 'newtons-cannon',
  title: "Newton's cannon",
  hook: "Why don't bodies always collapse into each other?",
  explain: `Gravity pulls every mass towards every other mass, and it never switches off. So why hasn't the Moon fallen into the Earth, or the Earth into the Sun?

Isaac Newton answered with a thought experiment. Put a cannon on a mountain so tall it pokes out of the air, and fire sideways. The ball curves down and lands. Fire faster and it lands further away, because the ground curves away beneath it. Fire fast enough and the ground curves away exactly as fast as the ball falls, so it never lands: that's an **orbit**. The Moon *is* falling, all the time. Its sideways speed is what keeps it missing.`,
  Sim: NewtonsCannonSim,
  maths: [
    {
      title: 'Square roots',
      body: `$\\sqrt{x}$ asks: *which number, multiplied by itself, gives $x$?* So $\\sqrt{49} = 7$, because $7 \\times 7 = 49$. It undoes squaring. In the orbit formula it means the speed you need grows more slowly than the planet's mass: a planet 4 times heavier needs only 2 times the speed.`,
    },
    {
      title: 'Cancelling things out of an equation',
      body: `An equation is a balance: do the same thing to both sides and it stays true. In $\\dfrac{GMm}{r^2} = \\dfrac{mv^2}{r}$ both sides are multiplied by the ball's mass $m$, so dividing both sides by $m$ removes it. Multiply both sides by $r$ to get $\\dfrac{GM}{r} = v^2$, then take the square root of both sides: $v = \\sqrt{GM/r}$.`,
    },
    {
      title: 'Numbers like 6.67 × 10⁻¹¹',
      body: `$10^{24}$ is 1 followed by 24 zeros; $10^{-11}$ is 1 divided by $10^{11}$, a decimal point followed by 10 zeros and then a 1. So $5.97 \\times 10^{24}$ kg (Earth's mass) is 597 followed by 22 zeros. To multiply such numbers, multiply the front parts and **add** the powers: $10^{-11} \\times 10^{24} = 10^{13}$.`,
    },
  ],
  deeper: `**Newton's Moon test.** The Moon is about 60 Earth radii away. If gravity weakens as $1/r^2$, its pull out there should be $60^2 = 3600$ times weaker than at the surface: $9.8 / 3600 \\approx 0.0027$ m/s². The Moon's actual orbit (384 000 km, once every 27.3 days) needs an inward acceleration of $v^2/r \\approx 0.0027$ m/s². They match. Each second the Moon falls about 1.4 mm towards us while travelling 1 km sideways, so it keeps missing. That was the moment gravity became *universal*: one law for apples and moons.

**Thrown balls trace ellipses, not parabolas.** The parabola you learn for a thrown ball assumes flat ground and gravity pointing straight down everywhere. Zoom out and the true path is part of an ellipse with the planet's centre at one focus: the same curves the cannon draws here.

**Tiny worlds.** On a small enough asteroid you could throw a ball into orbit by hand. On Mars's little moon Deimos the escape speed is only about 5.6 m/s, slower than a sprinter.`,
  next: 'A circle is the special case. Change the height and the time for one lap changes too, in a very particular pattern: one that lets you weigh the Sun.',
};
