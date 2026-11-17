// Beginner 7: Projectiles on other worlds. Launch a ball from a cliff on Earth, the Moon or Mars. The sideways and
// up-down motions are independent: steady across, accelerating down. Dots mark the ball every half second; an
// optional second ball, dropped at the same instant, keeps level with it all the way down.
// Colours: velocity blue, g orange, distances gold, time purple.
import { useMemo, useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { Challenge, Formula, Formulas, num, WhatIfs } from '../../ui/blockkit';
import { Q, TRAIL } from '../../ui/colors';
import { Button, Readout, Readouts, Segmented, SimLayout, Slider, Toggle } from '../../ui/kit';
import { SpacePanel, Vec } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const WORLDS = [
  { id: 'earth', name: 'Earth', g: 9.8, ground: '#3d5a3a' },
  { id: 'moon', name: 'Moon', g: 1.62, ground: '#5d6066' },
  { id: 'mars', name: 'Mars', g: 3.71, ground: '#7a3b22' },
] as const;
type WorldId = (typeof WORLDS)[number]['id'];
const W = 560;
const H = 340;
const L = 46; // px left margin (x = 0)
const B = 300; // px of the ground
const TARGET = 120; // m, on Mars
const STROBE = 0.5; // s between dots

interface Shot {
  T: number;
  R: number;
  Hmax: number;
  ux: number;
  uy: number;
}
function shot(u: number, deg: number, h0: number, g: number): Shot {
  const ux = u * Math.cos((deg * Math.PI) / 180);
  const uy = u * Math.sin((deg * Math.PI) / 180);
  const T = (uy + Math.sqrt(uy * uy + 2 * g * h0)) / g;
  return { T, R: ux * T, Hmax: h0 + (uy > 0 ? (uy * uy) / (2 * g) : 0), ux, uy };
}
function niceStep(span: number) {
  const raw = span / 6;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}

function ProjectilesSim() {
  const [world, setWorld] = useState<WorldId>('earth');
  const [u, setU] = useState(20);
  const [deg, setDeg] = useState(40);
  const [h0, setH0] = useState(10);
  const [drop, setDrop] = useState(false);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const visRef = useRef<HTMLDivElement>(null);
  const wd = WORLDS.find((w) => w.id === world) ?? WORLDS[0];
  const g = wd.g;
  const s = shot(u, deg, h0, g);
  const sE = shot(u, deg, h0, 9.8);

  useRaf(
    (dt) =>
      setT((cur) => {
        const nt = Math.min(s.T, cur + dt);
        if (nt >= s.T) setPlaying(false);
        return nt;
      }),
    playing,
    visRef
  );

  // one scale for everything drawn, so worlds compare honestly
  const xMax = Math.max(s.R, world !== 'earth' ? sE.R : 0, world === 'mars' ? TARGET + 10 : 0, 10) * 1.08;
  const yMax = Math.max(s.Hmax, h0, 5) * 1.15;
  const k = Math.min((W - L - 16) / xMax, (B - 30) / yMax);
  const px = (x: number) => L + x * k;
  const py = (y: number) => B - y * k;
  const step = niceStep(Math.max(xMax, yMax));

  const pathOf = (sh: Shot, gg: number) => {
    let d = '';
    for (let i = 0; i <= 120; i++) {
      const tt = (sh.T * i) / 120;
      d += `${i ? 'L' : 'M'}${px(sh.ux * tt).toFixed(1)},${py(h0 + sh.uy * tt - 0.5 * gg * tt * tt).toFixed(1)}`;
    }
    return d;
  };
  const d = useMemo(() => pathOf(s, g), [u, deg, h0, g, k]); // eslint-disable-line react-hooks/exhaustive-deps
  const dE = useMemo(() => (world !== 'earth' ? pathOf(sE, 9.8) : ''), [u, deg, h0, world, k]); // eslint-disable-line react-hooks/exhaustive-deps

  const bx = s.ux * t;
  const by = h0 + s.uy * t - 0.5 * g * t * t;
  const vy = s.uy - g * t;
  const dropT = Math.sqrt((2 * h0) / g);
  const dy = Math.max(0, h0 - 0.5 * g * Math.min(t, dropT) ** 2);
  const KV = 2.2; // px per m/s for arrows
  const landed = Math.abs(s.R - TARGET) <= 2 && world === 'mars' && h0 === 0;

  const visual = (
    <div ref={visRef}>
      <SpacePanel w={W} h={H} ariaLabel={`Launch at ${u} m/s and ${deg}° on ${wd.name}: lands ${s.R.toFixed(0)} m away after ${s.T.toFixed(1)} s.`} tags={[wd.name, 'Real time', `Grid: ${step} m`]} tagsAt="tr" stars={world === 'earth' ? 0 : 60}>
        {world === 'earth' && <rect x={0} y={0} width={W} height={B} fill="#0b1a2e" />}
        {Array.from({ length: Math.ceil(xMax / step) + 1 }, (_, i) => i * step).map((x) => (
          <g key={`x${x}`}>
            <line x1={px(x)} x2={px(x)} y1={20} y2={B} stroke="rgba(255,255,255,0.06)" />
            <text x={px(x)} y={B + 16} textAnchor="middle" className="plot-note" fill="var(--text-3)">
              {x} m
            </text>
          </g>
        ))}
        {Array.from({ length: Math.floor(yMax / step) + 1 }, (_, i) => i * step).map((y) => (
          <line key={`y${y}`} x1={L} x2={W} y1={py(y)} y2={py(y)} stroke="rgba(255,255,255,0.06)" />
        ))}
        <rect x={0} y={B} width={W} height={H - B} fill={wd.ground} />
        <rect x={0} y={py(h0)} width={L} height={B - py(h0)} fill={wd.ground} stroke="rgba(255,255,255,0.2)" />
        {h0 > 0 && (
          <text x={L - 4} y={(py(h0) + B) / 2} textAnchor="end" className="plot-note" fill={Q.s} fontWeight={700}>
            {h0} m
          </text>
        )}
        {world === 'mars' && (
          <g>
            <line x1={px(TARGET)} x2={px(TARGET)} y1={B} y2={B - 26} stroke="#ffd28a" strokeWidth={2} />
            <polygon points={`${px(TARGET)},${B - 26} ${px(TARGET) + 14},${B - 21} ${px(TARGET)},${B - 16}`} fill="#ffd28a" />
            <text x={px(TARGET)} y={B - 30} textAnchor="middle" className="plot-note" fill="#ffd28a">
              target 120 m
            </text>
          </g>
        )}
        {dE && <path d={dE} fill="none" stroke={TRAIL} strokeWidth={1.4} strokeDasharray="4 4" opacity={0.45} />}
        {dE && (
          <text x={px(sE.R)} y={B - 6} textAnchor="middle" className="plot-note" fill="var(--text-3)">
            same throw on Earth
          </text>
        )}
        <path d={d} fill="none" stroke={TRAIL} strokeWidth={1.4} opacity={0.35} />
        {Array.from({ length: Math.floor(t / STROBE) + 1 }, (_, i) => i * STROBE).map((ts) => (
          <circle key={ts} cx={px(s.ux * ts)} cy={py(h0 + s.uy * ts - 0.5 * g * ts * ts)} r={3} fill={TRAIL} opacity={0.75} />
        ))}
        {drop &&
          Array.from({ length: Math.floor(Math.min(t, dropT) / STROBE) + 1 }, (_, i) => i * STROBE).map((ts) => (
            <circle key={`d${ts}`} cx={px(0) + 6} cy={py(h0 - 0.5 * g * ts * ts)} r={3} fill="var(--m3)" opacity={0.6} />
          ))}
        {drop && <circle cx={px(0) + 6} cy={py(dy)} r={6} fill="var(--m3)" stroke="#fff" />}
        {drop && t > 0 && t < Math.min(dropT, s.T) && <line x1={px(0) + 6} x2={px(bx)} y1={py(by)} y2={py(by)} stroke="var(--m3)" strokeDasharray="3 4" opacity={0.8} />}
        <Vec x1={px(bx)} y1={py(by)} x2={px(bx) + s.ux * KV} y2={py(by)} color={Q.v} width={2} head={7} dash="4 3" />
        <Vec x1={px(bx)} y1={py(by)} x2={px(bx)} y2={py(by) - vy * KV} color={Q.v} width={2} head={7} dash="4 3" />
        <Vec x1={px(bx)} y1={py(by)} x2={px(bx) + s.ux * KV} y2={py(by) - vy * KV} color={Q.v} width={3} head={9} label="v" />
        <circle cx={px(bx)} cy={py(by)} r={6} fill="#cfd5de" stroke="#fff" />
      </SpacePanel>
    </div>
  );

  const resetT = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPlaying(false);
    setT(0);
  };

  const controls = (
    <>
      <div className="ctl-group">
        <Segmented<WorldId> size="sm" label="World" value={world} onChange={resetT(setWorld)} options={WORLDS.map((w) => ({ value: w.id, label: w.name, title: `g = ${w.g} m/s²` }))} />
        <Slider label="launch speed" tex="\qv{u}" tip="speed the ball leaves at" value={u} min={0} max={50} step={0.5} unit="m/s" onChange={resetT(setU)} />
        <Slider label="launch angle" tex="\theta" tip="angle above the horizontal (negative = aimed downwards)" value={deg} min={-30} max={90} step={1} unit="°" onChange={resetT(setDeg)} />
        <Slider label="cliff height" tex="\qs{h_0}" tip="height the ball is launched from" value={h0} min={0} max={50} step={1} unit="m" onChange={resetT(setH0)} />
        <Toggle checked={drop} onChange={setDrop} label="Drop a second ball at the same moment" />
        <div className="row gap-s wrap">
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (playing) setPlaying(false);
              else {
                if (t >= s.T) setT(0);
                setPlaying(true);
              }
            }}
          >
            {playing ? 'Pause' : t >= s.T ? 'Launch again' : 'Launch'}
          </Button>
        </div>
      </div>
      <div className="ctl-group">
        <Readouts>
          <Readout tex="\qt{T}" tip="time in the air" value={s.T} unit="s" sig={3} />
          <Readout tex="\qs{R}" tip="how far it lands from the launch point (the range)" value={s.R} unit="m" sig={3} />
          <Readout tex="\qs{H}" tip="highest point above the ground" value={s.Hmax} unit="m" sig={3} />
          <Readout tex="\qt{t}" tip="time since launch" value={t} unit="s" sig={3} />
        </Readouts>
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="Two motions, one ball"
          tex="\qs{x} = \qv{u_x}\,\qt{t} \qquad \qs{y} = \qs{h_0} + \qv{u_y}\,\qt{t} - \tfrac{1}{2}\,\qa{g}\,\qt{t}^{2}"
          say="Across, nothing pushes, so the ball keeps a steady sideways speed. Up and down, gravity accelerates it exactly as if it had been dropped. The two never interfere."
          where={[
            ['\\qs{x},\\ \\qs{y}', 'how far across, and how high, after time $t$ (m)'],
            ['\\qv{u_x},\\ \\qv{u_y}', 'the across and up parts of the launch speed: $u\\cos\\theta$ and $u\\sin\\theta$'],
            ['\\qa{g}', "gravity's strength on this world (m/s²)"],
            ['\\qs{h_0}', 'launch height (m)'],
          ]}
          live={`\\qv{u_x} = \\qv{${num(s.ux, 1)}}\\ \\text{m/s} \\qquad \\qv{u_y} = \\qv{${num(s.uy, 1)}}\\ \\text{m/s} \\qquad \\qa{g} = \\qa{${g}}\\ \\text{m/s}^2`}
        />
        <Formula
          title="Range on level ground"
          tex="\qs{R} = \frac{\qv{u}^{2}\,\sin 2\theta}{\qa{g}}"
          say="How far a ball launched from ground level lands. Weaker gravity, longer flights: on the Moon everything goes six times as far. The furthest angle is 45°."
          where={[
            ['\\qs{R}', 'range: distance to where it lands (m)'],
            ['\\qv{u}', 'launch speed (m/s)'],
            ['\\theta', 'launch angle above the horizontal'],
          ]}
          live={`\\qs{R} = \\frac{(\\qv{${num(u, 1)}})^2 \\sin(${2 * deg}^\\circ)}{\\qa{${g}}} = \\qs{${num((u * u * Math.sin((2 * deg * Math.PI) / 180)) / g, 1)}}\\ \\text{m}`}
          liveNote={h0 > 0 ? `That's from ground level. From your ${h0} m cliff it goes a little further: ${num(s.R, 1)} m.` : undefined}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="pj-drop"
          question="From a 20 m cliff, fire one ball **sideways** at 15 m/s and simply **drop** another at the same instant. Which hits the ground first?"
          options={['Both at the same moment', 'The dropped one', 'The fired one', 'Depends how fast the fired one goes']}
          answer={0}
          explain="Gravity only acts downwards, so it can't tell (or care) that one ball is also moving sideways. Both start with no downward speed and gain it at exactly the same rate: watch the dashed line keep them level. The sideways motion just carries one ball further across while it falls."
          tryIt="angle 0°, cliff 20 m, tick 'Drop a second ball', and launch."
          onApply={() => {
            setDeg(0);
            setH0(20);
            setU(15);
            setDrop(true);
            setT(0);
            setPlaying(true);
          }}
        />
        <WhatIf
          id="pj-angle"
          question="From level ground, which launch angle sends the ball **furthest**?"
          options={['30°', '45°', '60°', '75°']}
          answer={1}
          fixedOrder
          explain="Steeper gives more time in the air but less speed across; flatter is the reverse. 45° is the best balance ($\sin 2\theta$ is largest when $2\theta = 90°$). Angles equally either side of 45°, like 30° and 60°, land in exactly the same place. (With air resistance, real throws do best a little lower.)"
          tryIt="cliff 0 m, then try 30°, 45° and 60°."
          onApply={() => {
            setH0(0);
            setDeg(45);
            setT(0);
            setPlaying(true);
          }}
        />
        <WhatIf
          id="pj-moon"
          question="The same throw on the Moon, where gravity is about a sixth of Earth's. How much further does it go?"
          options={['About 6 times as far', 'About 2.5 times as far', 'About 36 times as far', 'The same distance, just slower']}
          answer={0}
          explain="Gravity has a sixth of the grip, so the ball stays up six times as long and climbs six times as high, at the same speed across: six times the range. In 1971 Alan Shepard hit two golf balls on the Moon; swinging one-handed in a stiff spacesuit, his better shot went about 40 yards (37 m)."
          tryIt="pick the Moon and launch: the dashed path is the same throw on Earth."
          onApply={() => {
            setWorld('moon');
            setH0(0);
            setT(0);
            setPlaying(true);
          }}
        />
        <Challenge
          goal="On **Mars**, from ground level (cliff 0 m), land the ball within 2 m of the **target 120 m** away."
          done={landed}
          hint="Mars's gravity is 3.71 m/s². At 45°, the range is $u^2 / g$, so $u^2$ needs to be about $120 \times 3.71$."
          success={`Hit, at ${num(s.R, 1)} m. Any speed above about 21 m/s works with the right angle, and there are two angles for each speed (one steep, one flat): equally either side of 45°.`}
        />
      </WhatIfs>
    </>
  );
}

export const projectiles: BlockDef = {
  id: 'projectiles',
  title: 'Projectiles on other worlds',
  hook: 'Why do a dropped ball and a ball fired sideways hit the ground at the same moment?',
  explain: `Throw a ball and it moves across and up at the same time, along a curve. The trick to understanding that curve is to split the motion in two, because the two parts ignore each other.

**Across**, nothing pushes the ball (ignoring air), so its sideways speed never changes: equal distances every second. **Up and down**, gravity accelerates it steadily, exactly as if it had just been dropped: it slows on the way up, stops at the top, and speeds up on the way down. Put the steady across motion together with the accelerating up-down motion and you get a **parabola**.

Change the world and only one number changes: $g$, gravity's strength. On the Moon it is a sixth of Earth's, so the same throw stays up six times as long and lands six times as far.`,
  Sim: ProjectilesSim,
  maths: [
    {
      title: 'Where the range formula comes from',
      body: `From ground level, the ball lands when its height is back to zero: $u_y t - \\tfrac12 g t^2 = 0$, so the flight time is $t = 2u_y/g$. In that time it travels across $u_x t = 2u_x u_y / g$. With $u_x = u\\cos\\theta$ and $u_y = u\\sin\\theta$, and the identity $2\\sin\\theta\\cos\\theta = \\sin 2\\theta$, that's $R = u^2 \\sin 2\\theta / g$.`,
    },
  ],
  deeper: `**Galileo's insight.** Splitting motion into independent across and down parts was Galileo's idea (1638). Before him, people imagined a cannonball flying straight until its "impetus" ran out, then dropping.

**Bullets and the ground.** A bullet fired level and a bullet dropped from the same height hit the ground together, apart from small effects of the air and the Earth's curve. Fire it fast enough and the ground curves away beneath it before it lands: that's Newton's cannon, coming up shortly.

**Longest throws in the solar system.** On Ceres, gravity is 0.28 m/s², 35 times weaker than Earth's. A good 25 m/s throw there would stay up for about two minutes and land more than 2 km away.`,
  next: 'A curve in a constant downward pull is a parabola. A pull that always points at a centre gives a circle: and that is the shape of an orbit.',
};
