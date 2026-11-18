// Medium 3: Dancing partners. Two bodies orbit their shared centre of mass; watch from that centre (two ellipses),
// riding with one body (the other circles it), or drifting through the galaxy (the trails become corkscrews).
// A solar-system preset uses the real tilt (~60° between the planets' plane and the Sun's direction of travel) and,
// on request, the real drift speed, which stretches the corkscrews about 50:1. 3D by projection; drag to turn it.
// Body colours are the bodies' own; the centre of mass is green (mass).
import { useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { Formula, Formulas, num, WhatIfs } from '../../ui/blockkit';
import { Q } from '../../ui/colors';
import { Button, Readout, Readouts, Segmented, SimLayout, Slider } from '../../ui/kit';
import { SpacePanel, useSvgDrag } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

type PresetId = 'binary' | 'earthmoon' | 'pluto' | 'jupiter' | 'solar';
type View = 'com' | 'ride' | 'drift';
interface Pair {
  id: PresetId;
  label: string;
  a: string;
  b: string;
  m1: number;
  m2: number;
  dKm: number;
  r1Km: number;
  e: number;
  period: string;
  colA: string;
  colB: string;
  sizeA: number;
  sizeB: number;
}
const PAIRS: Pair[] = [
  { id: 'binary', label: 'Twin stars', a: 'star A', b: 'star B', m1: 1, m2: 1, dKm: 0, r1Km: 0, e: 0.3, period: '', colA: '#ffd28a', colB: '#9cc3ff', sizeA: 8, sizeB: 8 },
  { id: 'earthmoon', label: 'Earth & Moon', a: 'Earth', b: 'Moon', m1: 5.97e24, m2: 7.35e22, dKm: 384400, r1Km: 6371, e: 0.055, period: '27.3 days', colA: '#4f8fd6', colB: '#bdbdbd', sizeA: 8, sizeB: 4 },
  { id: 'pluto', label: 'Pluto & Charon', a: 'Pluto', b: 'Charon', m1: 1.303e22, m2: 1.586e21, dKm: 19596, r1Km: 1188, e: 0, period: '6.4 days', colA: '#d8c3a5', colB: '#9a9a9a', sizeA: 7, sizeB: 5 },
  { id: 'jupiter', label: 'Sun & Jupiter', a: 'Sun', b: 'Jupiter', m1: 1.989e30, m2: 1.898e27, dKm: 778.5e6, r1Km: 696000, e: 0.049, period: '11.9 years', colA: '#f2b84b', colB: '#d9a066', sizeA: 9, sizeB: 6 },
];
const PLANETS = [
  { name: 'Mercury', a: 0.387, T: 0.2408, col: '#b7aa9a' },
  { name: 'Venus', a: 0.723, T: 0.6152, col: '#e8c27a' },
  { name: 'Earth', a: 1, T: 1, col: '#4f8fd6' },
  { name: 'Mars', a: 1.524, T: 1.881, col: '#d0623c' },
];
const PERIOD_DAYS: Record<string, number> = { earthmoon: 27.32, pluto: 6.387, jupiter: 4332.6 };
/** Period with the current partner mass, from the real period and Kepler's third law (T ∝ 1/√(m1 + m2)). */
function periodNow(p: Pair, m2: number) {
  const d = (PERIOD_DAYS[p.id] ?? 0) * Math.sqrt((p.m1 + p.m2) / (p.m1 + m2));
  return d < 60 ? `${num(d, 1)}\\ \\text{days}` : `${num(d / 365.25, 2)}\\ \\text{years}`;
}
const W = 560;
const H = 400;
const TRAIL_N = 220;
const REAL_DRIFT = 230 / 29.8; // the Sun's galactic speed ÷ the Earth's orbital speed

function solveE(M: number, e: number) {
  let E = M;
  for (let i = 0; i < 20; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}
/** Relative orbit in its plane (separation units, G(m1+m2) = 1, period 2π). */
function rel(t: number, e: number): [number, number] {
  const E = solveE(t, e);
  return [Math.cos(E) - e, Math.sqrt(1 - e * e) * Math.sin(E)];
}

type V3 = [number, number, number];

function DancingSim() {
  const [preset, setPreset] = useState<PresetId>('binary');
  const [kB, setKB] = useState(1);
  const [e, setE] = useState(0.3);
  const [view, setView] = useState<View>('com');
  const [drift, setDrift] = useState(0.6);
  const [tiltDeg, setTilt] = useState(60);
  const [yaw, setYaw] = useState(-0.55);
  const [pitch, setPitch] = useState(0.45);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const visRef = useRef<HTMLDivElement>(null);
  const solar = preset === 'solar';
  const pair = PAIRS.find((p) => p.id === preset) ?? PAIRS[0];
  // animation clock: one partner-orbit (or one Earth year) every 4 s
  useRaf((dt) => setT((c) => c + (dt * 2 * Math.PI) / 4), playing, visRef);

  const m1 = solar ? 1 : pair.m1;
  const m2 = solar ? 0 : pair.m2 * kB;
  const f2 = m1 / (m1 + m2); // B's share of the separation
  const f1 = m2 / (m1 + m2); // A's share
  const beta = (tiltDeg * Math.PI) / 180;
  // orbital-plane basis in world coordinates; the drift is along +x
  const u1: V3 = [0, 1, 0];
  const u2: V3 = [-Math.cos(beta), 0, Math.sin(beta)];
  const toWorld = (p: number, q: number): V3 => [p * u1[0] + q * u2[0], p * u1[1] + q * u2[1], p * u1[2] + q * u2[2]];

  /** Bodies' in-plane positions at time tt (orbit phase), relative to the centre of mass. */
  const bodiesAt = (tt: number): [number, number][] => {
    if (solar) return [[0, 0], ...PLANETS.map((pl) => [pl.a * Math.cos(tt / pl.T), pl.a * Math.sin(tt / pl.T)] as [number, number])];
    const [x, y] = rel(tt, e);
    return [
      [-f1 * x, -f1 * y],
      [f2 * x, f2 * y],
    ];
  };
  const rideIdx = solar ? 3 : 0; // ride with the Earth (solar) or with body A
  const driftV = view === 'drift' ? drift : 0; // in units of orbital speed (separation per radian of phase)
  const span = solar ? 1.7 : 1.05;
  const trailPhase = view === 'drift' ? 2 * Math.PI * (solar ? 1.5 : 2.2) : 2 * Math.PI * (solar ? 2.2 : 1.1);

  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const scale = (view === 'ride' && solar ? 0.55 : 1) * (170 / span);
  const CX = view === 'drift' ? W * 0.62 : W / 2;
  const CY = H / 2;
  const project = (v: V3) => {
    const x1 = v[0] * cy - v[1] * sy;
    const y1 = v[0] * sy + v[1] * cy;
    const z2 = y1 * sp + v[2] * cp;
    const depth = y1 * cp - v[2] * sp;
    return { x: CX + x1 * scale, y: CY - z2 * scale, depth };
  };
  /** World position of body i at phase tt, in the current view, relative to the camera centre at phase t. */
  const worldAt = (i: number, tt: number, all?: [number, number][]): V3 => {
    const bs = all ?? bodiesAt(tt);
    let [p, q] = bs[i];
    if (view === 'ride') {
      p -= bs[rideIdx][0];
      q -= bs[rideIdx][1];
    }
    const w = toWorld(p, q);
    w[0] += driftV * (tt - t);
    return w;
  };

  const nBodies = solar ? 1 + PLANETS.length : 2;
  const trails = (() => {
    const out: string[] = Array.from({ length: nBodies }, () => '');
    for (let j = 0; j <= TRAIL_N; j++) {
      const tt = t - trailPhase * (1 - j / TRAIL_N);
      const bs = bodiesAt(tt);
      for (let i = 0; i < nBodies; i++) {
        const pt = project(worldAt(i, tt, bs));
        out[i] += `${j ? 'L' : 'M'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
      }
    }
    return out;
  })(); // recomputed every frame
  const nowBodies = bodiesAt(t);
  const pts = Array.from({ length: nBodies }, (_, i) => project(worldAt(i, t, nowBodies)));
  const com = project(view === 'ride' ? toWorld(-nowBodies[rideIdx][0], -nowBodies[rideIdx][1]) : [0, 0, 0]);
  const cols = solar ? ['#f2b84b', ...PLANETS.map((p) => p.col)] : [pair.colA, pair.colB];
  const sizes = solar ? [9, 3, 4, 4.5, 4] : [pair.sizeA, pair.sizeB];
  const names = solar ? ['Sun', ...PLANETS.map((p) => p.name)] : [pair.a, pair.b];

  const start = useRef({ x: 0, y: 0, yaw: 0, pitch: 0 });
  const drag = useSvgDrag((p, phase) => {
    if (phase === 'start') start.current = { x: p.x, y: p.y, yaw, pitch };
    else if (phase === 'move') {
      setYaw(start.current.yaw + (p.x - start.current.x) * 0.01);
      setPitch(Math.max(-1.5, Math.min(1.5, start.current.pitch + (p.y - start.current.y) * 0.01)));
    }
  });

  const comKm = pair.dKm * f1;
  const inside = pair.r1Km > 0 && comKm < pair.r1Km;
  const choose = (p: PresetId) => {
    setPreset(p);
    setKB(1);
    const pr = PAIRS.find((q) => q.id === p);
    if (pr) setE(pr.e);
    if (p === 'solar') {
      setTilt(60);
      setDrift(2);
    }
  };

  const visual = (
    <div ref={visRef}>
      <SpacePanel
        w={W}
        h={H}
        ariaLabel={`${solar ? 'The inner solar system' : `${pair.a} and ${pair.b}`}, watched ${view === 'com' ? 'from the centre of mass' : view === 'ride' ? `riding with ${names[rideIdx]}` : 'drifting through the galaxy'}.`}
        tags={[view === 'drift' ? (solar && Math.abs(drift - REAL_DRIFT) < 0.05 ? 'Real drift speed' : 'Drift slowed for clarity') : 'Drag to turn the view', 'Sizes not to scale']}
        tagsAt="tl"
        stars={110}
      >
        {trails.map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke={cols[i]} strokeWidth={7} opacity={0.12} strokeLinecap="round" />
            <path d={d} fill="none" stroke={cols[i]} strokeWidth={1.7} opacity={0.9} />
          </g>
        ))}
        {!solar && view !== 'drift' && (
          <g>
            <line x1={com.x - 6} x2={com.x + 6} y1={com.y} y2={com.y} stroke={Q.m} strokeWidth={2} />
            <line x1={com.x} x2={com.x} y1={com.y - 6} y2={com.y + 6} stroke={Q.m} strokeWidth={2} />
          </g>
        )}
        {pts
          .map((p, i) => ({ p, i }))
          .sort((a, b) => b.p.depth - a.p.depth)
          .map(({ p, i }) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={sizes[i] * 2.2} fill={cols[i]} opacity={0.18} />
              <circle cx={p.x} cy={p.y} r={sizes[i]} fill={cols[i]} />
              {(!solar || i === 0 || i === 3 || i === 4) && (
                <text x={p.x + sizes[i] + 5} y={p.y - sizes[i] - 2} className="plot-note" fill="var(--text-2)">
                  {names[i]}
                </text>
              )}
            </g>
          ))}
        <rect x={0} y={0} width={W} height={H} fill="transparent" {...drag} style={{ cursor: 'grab', touchAction: 'none' }} />
      </SpacePanel>
    </div>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Segmented<PresetId>
          size="sm"
          label="Who is dancing"
          value={preset}
          onChange={choose}
          options={[...PAIRS.map((p) => ({ value: p.id, label: p.label })), { value: 'solar' as PresetId, label: 'Sun & planets' }]}
        />
        <Segmented<View>
          size="sm"
          label="Watch from"
          value={view}
          onChange={setView}
          options={[
            { value: 'com', label: 'the centre of mass' },
            { value: 'ride', label: `riding with ${solar ? 'the Earth' : pair.a}` },
            { value: 'drift', label: 'drifting through the galaxy' },
          ]}
        />
        {!solar && (
          <>
            <Slider label={`mass of ${pair.b}`} tex="\qm{m_2}" tip="as a multiple of its real mass" value={kB} min={0.1} max={pair.id === 'binary' ? 1 : 100} log step={0.01} format={(v) => `× ${v.toPrecision(2)}`} onChange={setKB} />
            <Slider label="stretch of the orbit" tex="e" tip="eccentricity: 0 = circles" value={e} min={0} max={0.8} step={0.01} sig={2} onChange={setE} />
          </>
        )}
        {view === 'drift' && (
          <>
            <Slider label="drift speed" tip={solar ? `the Sun moves through the galaxy about ${num(REAL_DRIFT, 1)} times faster than the Earth goes round the Sun` : "the pair's speed through the galaxy, compared with their orbital speed"} value={drift} min={0} max={solar ? 8 : 3} step={0.05} sig={3} format={(v) => `× ${v.toFixed(2)}`} onChange={setDrift} />
            <Slider label="angle between travel and the orbit's plane" tip="90° = travelling straight 'up' out of the plane (the viral animation); about 60° for the real solar system" value={tiltDeg} min={0} max={90} step={1} unit="°" onChange={setTilt} />
            {solar && (
              <Button
                size="sm"
                onClick={() => {
                  setDrift(REAL_DRIFT);
                  setTilt(60);
                }}
              >
                Make it real: 230 km/s at 60°
              </Button>
            )}
          </>
        )}
        <div className="row gap-s wrap">
          <Button size="sm" variant="primary" onClick={() => setPlaying((p) => !p)}>
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setYaw(-0.55);
              setPitch(0.45);
            }}
          >
            Reset the view
          </Button>
        </div>
      </div>
      {!solar && (
        <div className="ctl-group">
          <Readouts min={150}>
            <Readout label="mass ratio" tip={`${pair.a} ÷ ${pair.b}`} value={m1 / m2} sig={3} />
            <Readout label={`${pair.a}'s share of the dance`} tip="how far the centre of mass is from its centre, as a fraction of the separation" value={f1 * 100} unit="%" sig={3} />
            {pair.dKm > 0 && <Readout label={`centre of mass from ${pair.a}'s centre`} value={comKm} unit="km" sig={3} tone={inside ? undefined : 'm3'} />}
            {pair.r1Km > 0 && <Readout label={`${pair.a}'s radius`} value={pair.r1Km} unit="km" sig={3} />}
          </Readouts>
          {pair.r1Km > 0 && <div className="note">The balance point is {inside ? `inside ${pair.a}` : `outside ${pair.a}, in empty space`}.</div>}
        </div>
      )}
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="The balance point"
          tex="\qm{m_1}\,\qs{r_1} = \qm{m_2}\,\qs{r_2}"
          say="Both bodies circle their **centre of mass**, the point where they would balance on a see-saw. The heavier partner sits closer to it and moves less; the lighter one swings wide."
          where={[
            ['\\qm{m_1},\\ \\qm{m_2}', 'the two masses'],
            ['\\qs{r_1},\\ \\qs{r_2}', 'their distances from the centre of mass; together they add up to the separation $d$'],
          ]}
          live={solar ? null : pair.dKm > 0 ? `\\qs{r_1} = d\\,\\frac{\\qm{m_2}}{\\qm{m_1} + \\qm{m_2}} = \\qs{${num(comKm, 0)}}\\ \\text{km}` : `\\frac{\\qs{r_1}}{\\qs{d}} = \\frac{\\qm{m_2}}{\\qm{m_1} + \\qm{m_2}} = ${num(f1, 3)}`}
          liveNote={!solar && pair.r1Km > 0 ? `${pair.a}'s radius is ${num(pair.r1Km, 0)} km, so the balance point is ${inside ? 'inside it' : 'outside it'}.` : undefined}
        />
        <Formula
          title="One rhythm for both"
          tex="\qt{T} = 2\pi\sqrt{\frac{\qs{d}^{3}}{G\,(\qm{m_1} + \qm{m_2})}}"
          say="Kepler's third law again, now with the **total** mass. Both partners go round in the same time, always on opposite sides of the balance point."
          where={[
            ['\\qt{T}', 'the time for one full dance (s)'],
            ['\\qs{d}', 'the distance between the two centres (m)'],
          ]}
          live={solar ? null : pair.id === 'binary' ? `\\qt{T} = ${num(Math.sqrt(2 / (1 + kB)), 3)} \\times \\qt{T_{\\text{equal twins}}}` : `\\qt{T} = \\qt{${periodNow(pair, m2)}}`}
          liveNote={!solar && pair.id !== 'binary' ? `With the real masses: ${pair.period}. More total mass makes a faster dance.` : undefined}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="dp-twins"
          question="Two stars of exactly equal mass. Watched from their balance point, what do they do?"
          options={['Trace identical ellipses, always on opposite sides of the midpoint', 'One sits still while the other circles it', 'They spiral into each other', 'They take turns orbiting']}
          answer={0}
          explain="With equal masses the balance point is exactly halfway, so each star mirrors the other: same size, same shape, half a turn apart. Many stars have partners: about half of Sun-like stars live in pairs or larger groups."
          tryIt="'Twin stars', watched from the centre of mass."
          onApply={() => {
            choose('binary');
            setView('com');
          }}
        />
        <WhatIf
          id="dp-sun"
          question="The Sun is a thousand times heavier than Jupiter. Does Jupiter make the Sun move?"
          options={['Yes: the Sun circles a point just outside its own surface, every 12 years', 'No: the Sun is far too heavy to move', 'Only a few metres', 'Only when Jupiter is closest']}
          answer={0}
          explain="The balance point is a thousandth of the way from the Sun to Jupiter: about 742 000 km from the Sun's centre, just outside its 696 000 km radius. The Sun wobbles around it at about 13 m/s. Astronomers find planets around other stars by measuring exactly this kind of wobble in the star's light."
          tryIt="'Sun & Jupiter' and read the balance point."
          onApply={() => {
            choose('jupiter');
            setView('com');
          }}
        />
        <WhatIf
          id="dp-gif"
          question="A famous animation shows the planets corkscrewing behind the Sun as it races through the galaxy, its orbits at right angles to the direction of travel. What does it get wrong?"
          options={['The tilt and the stretch: the real angle is about 60°, and real corkscrews are stretched about 50 times longer', 'Nothing, it is accurate', 'The planets actually lead the Sun', "The Sun doesn't move through the galaxy"]}
          answer={0}
          explain="The planets really do trace corkscrews, because the whole solar system moves through the galaxy at about 230 km/s. But the plane of their orbits is tilted about 60° to that motion, not 90°. And the Sun moves 7.7 times faster than the Earth orbits, so each loop is stretched along the path: in one year the Earth circles 1 AU from the Sun while the Sun travels about 48 AU. The animation also claimed the Sun drags the planets like a 'vortex'. Gravity simply carries them along: the planets move with the Sun, not behind it."
          tryIt="'Sun & planets', drifting, then 'Make it real'."
          onApply={() => {
            choose('solar');
            setView('drift');
            setDrift(REAL_DRIFT);
            setTilt(60);
          }}
        />
      </WhatIfs>
    </>
  );
}

export const dancingPartners: BlockDef = {
  id: 'dancing-partners',
  title: 'Dancing partners',
  hook: 'Does anything really orbit anything else?',
  explain: `Gravity pulls both ways, so nothing simply orbits something else. The Earth and the Moon both circle a shared balance point, their **centre of mass**; so do the Sun and Jupiter, and every pair of stars. The heavier partner moves less, sitting close to the balance point; the lighter one swings wide. They move like two dancers holding hands.

What you *see* depends on where you watch from. From the balance point: two ellipses. Riding on one partner: the other seems to orbit you (the view our ancestors had of the Sun). Drifting through the galaxy, as the whole solar system really does at about 230 km/s: the paths stretch into **corkscrews**. None of these views is "the true one". They're the same motion, described from different places.`,
  Sim: DancingSim,
  maths: [
    {
      title: 'The see-saw rule',
      body: `A see-saw balances when (mass × distance from the pivot) is the same on both sides: $m_1 r_1 = m_2 r_2$. With $r_1 + r_2 = d$, that gives $r_1 = d\\,\\frac{m_2}{m_1 + m_2}$. For the Earth and Moon, $\\frac{m_2}{m_1+m_2} = \\frac{1}{82}$, so the balance point is $384\\,400 / 82 \\approx 4700$ km from the Earth's centre: about three-quarters of the way to the surface.`,
    },
  ],
  deeper: `**Pluto and Charon** are the clearest dancing pair in the solar system: their balance point is about 900 km above Pluto's surface, in empty space. Both are tidally locked, always showing each other the same face.

**Riding with the Earth.** Pick 'Sun & planets', ride with the Earth, and watch Mars: every two years or so it loops backwards. Ancient astronomers saw exactly these *retrograde* loops and built elaborate machinery of circles on circles to explain them. From the Sun's point of view the loops vanish: the Earth is simply overtaking Mars on the inside lane.

**The viral helix animation (2012).** It was right that the planets trace corkscrews through the galaxy, but wrong about the angle (90° instead of about 60°), wrong that the Sun drags the planets in a "vortex", and badly out of proportion: real corkscrews are stretched about 50:1. And "moving at 230 km/s" is itself only relative to the galaxy's centre; there is no absolute standstill to measure from, a thought that leads to Einstein.`,
  next: 'If every orbit is a dance of moving bodies, how do you get from one to another? Spacecraft navigation is full of surprises.',
};
