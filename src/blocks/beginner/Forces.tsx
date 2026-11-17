// Beginner 4: Forces. Three thrusters push a small probe in deep space, far from any star. Forces are arrows: put
// them head to tail for the net force. The net force sets the acceleration (a = F/m), which changes the velocity
// arrow in its own direction: along the motion speeds it up, against it slows it, sideways turns it.
// Colours follow the site scheme (ui/colors.ts): velocity blue, forces and acceleration orange, mass green.
import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { Challenge, Formula, Formulas, num, WhatIfs } from '../../ui/blockkit';
import { Q, TRAIL } from '../../ui/colors';
import { Button, Legend, Readout, Readouts, Segmented, SimLayout, Slider, Toggle } from '../../ui/kit';
import { SpacePanel, useSvgDrag, Vec } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const T_END = 20; // s of probe time
const SPEED = 2; // probe seconds per real second
const DT = 0.01;
const NS = Math.round(T_END / DT);
const SAMPLE = 4; // draw every 4th step
const W = 560;
const H = 360;
const FB = { x: 6, y: 6, w: 210, h: 348, cx: 111, cy: 200, k: 9 }; // free-body panel; k = px per newton
const FMAX = 10;
const PV = { x0: 224, x1: 554, y0: 6, y1: 354, k: 2.4 }; // path panel; k = px per metre
const START = { x: 22, y: 50 }; // m from the path panel's bottom-left corner
const KV = 6; // px per m/s on the path
const KF = 7; // px per N on the path
const NAMES = ['A', 'B', 'C'];

interface Thruster {
  n: number; // size, N
  deg: number; // direction, degrees anticlockwise from "right"
}
type V2 = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const fixedVec = (f: Thruster): V2 => [f.n * Math.cos(rad(f.deg)), f.n * Math.sin(rad(f.deg))];
const degOf = (v: V2) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;
const total = (fs: V2[]): V2 => fs.reduce<V2>((s, f) => [s[0] + f[0], s[1] + f[1]], [0, 0]);
const sx = (x: number) => PV.x0 + x * PV.k;
const sy = (y: number) => PV.y1 - y * PV.k;

/** Each thruster's force for a given velocity. A steering thruster A pushes 90° to the left of the motion. */
function forcesAt(th: Thruster[], steer: boolean, vx: number, vy: number): V2[] {
  return th.map((f, i) => {
    if (i === 0 && steer) {
      const sp = Math.hypot(vx, vy);
      if (sp > 1e-9) return [(-vy / sp) * f.n, (vx / sp) * f.n];
    }
    return fixedVec(f);
  });
}

interface Run {
  xs: Float64Array;
  ys: Float64Array;
  vxs: Float64Array;
  vys: Float64Array;
  /** On-screen length of the path up to each drawn sample, px. */
  len: Float64Array;
  d: string;
}

function simulate(th: Thruster[], m: number, u: number, steer: boolean): Run {
  const xs = new Float64Array(NS + 1);
  const ys = new Float64Array(NS + 1);
  const vxs = new Float64Array(NS + 1);
  const vys = new Float64Array(NS + 1);
  const acc = (vx: number, vy: number): V2 => {
    const f = total(forcesAt(th, steer, vx, vy));
    return [f[0] / m, f[1] / m];
  };
  let x = START.x;
  let y = START.y;
  let vx = u;
  let vy = 0;
  for (let i = 0; ; i++) {
    xs[i] = x;
    ys[i] = y;
    vxs[i] = vx;
    vys[i] = vy;
    if (i === NS) break;
    // RK4 (the steering force depends on the velocity)
    const a1 = acc(vx, vy);
    const a2 = acc(vx + 0.5 * DT * a1[0], vy + 0.5 * DT * a1[1]);
    const a3 = acc(vx + 0.5 * DT * a2[0], vy + 0.5 * DT * a2[1]);
    const a4 = acc(vx + DT * a3[0], vy + DT * a3[1]);
    x += (DT / 6) * (6 * vx + DT * (a1[0] + a2[0] + a3[0]));
    y += (DT / 6) * (6 * vy + DT * (a1[1] + a2[1] + a3[1]));
    vx += (DT / 6) * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]);
    vy += (DT / 6) * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]);
  }
  const nS = NS / SAMPLE + 1;
  const len = new Float64Array(nS);
  let d = '';
  let L = 0;
  let px0 = 0;
  let py0 = 0;
  for (let j = 0; j < nS; j++) {
    const px = sx(xs[j * SAMPLE]);
    const py = sy(ys[j * SAMPLE]);
    if (j > 0) L += Math.hypot(px - px0, py - py0);
    len[j] = L;
    px0 = px;
    py0 = py;
    d += `${j === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`;
  }
  return { xs, ys, vxs, vys, len, d };
}

const off = (deg: number): Thruster => ({ n: 0, deg });
const START_THRUSTERS: Thruster[] = [{ n: 1, deg: 90 }, off(0), off(180)];

function Probe({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-31} y={-5} width={18} height={10} fill="#1f3d6b" stroke="#7fa6e0" strokeWidth={0.8} />
      <rect x={13} y={-5} width={18} height={10} fill="#1f3d6b" stroke="#7fa6e0" strokeWidth={0.8} />
      <rect x={-12} y={-12} width={24} height={24} rx={3} fill="#cfd5de" stroke="#8f98a8" strokeWidth={1.2} />
    </g>
  );
}

function ForcesSim() {
  const uid = useId();
  const [th, setTh] = useState<Thruster[]>(START_THRUSTERS);
  const [sel, setSel] = useState(0);
  const [m, setM] = useState(4);
  const [u, setU] = useState(3);
  const [steer, setSteer] = useState(false);
  const [chain, setChain] = useState(false);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const visRef = useRef<HTMLDivElement>(null);

  useRaf(
    (dt) =>
      setT((cur) => {
        const nt = Math.min(T_END, cur + dt * SPEED);
        if (nt >= T_END) setPlaying(false);
        return nt;
      }),
    playing,
    visRef
  );

  const run = useMemo(() => simulate(th, m, u, steer), [th, m, u, steer]);
  const i = Math.min(NS, Math.round(t / DT));
  const vx = run.vxs[i];
  const vy = run.vys[i];
  const fs = forcesAt(th, steer, vx, vy);
  const net = total(fs);
  const fNet = Math.hypot(net[0], net[1]);
  const acc = fNet / m;
  const speed = Math.hypot(vx, vy);
  const px = sx(run.xs[i]);
  const py = sy(run.ys[i]);
  const inView = px >= PV.x0 && px <= PV.x1 && py >= PV.y0 && py <= PV.y1;

  const setThruster = (k: number, patch: Partial<Thruster>) => setTh((cur) => cur.map((f, j) => (j === k ? { ...f, ...patch } : f)));

  // Drag on the free-body diagram: grab the nearest arrow tip, or aim the selected thruster at the pointer.
  const tips: V2[] = fs.map(([fx, fy]) => [FB.cx + fx * FB.k, FB.cy - fy * FB.k]);
  const target = useRef(0);
  const drag = useSvgDrag((p, phase) => {
    if (phase === 'end') return;
    if (phase === 'start') {
      const dist = (k: number) => Math.hypot(p.x - tips[k][0], p.y - tips[k][1]);
      let best = dist(sel) < 22 ? sel : -1;
      if (best < 0) {
        let bd = 22;
        tips.forEach((_, k) => {
          if (dist(k) < bd) {
            bd = dist(k);
            best = k;
          }
        });
      }
      target.current = best >= 0 ? best : sel;
      if (target.current !== sel) setSel(target.current);
    }
    const k = target.current;
    const fx = (p.x - FB.cx) / FB.k;
    const fy = (FB.cy - p.y) / FB.k;
    const n = Math.min(FMAX, Math.round(Math.hypot(fx, fy) * 10) / 10);
    if (k === 0 && steer) setThruster(0, { n });
    else setThruster(k, { n, deg: Math.round(degOf([fx, fy])) });
  });

  // Velocity arrows left behind every 2 s, so you can watch the arrow change.
  const ghosts: ReactNode[] = [];
  for (let q = 0; q <= i; q += 200) {
    const gx = sx(run.xs[q]);
    const gy = sy(run.ys[q]);
    const sp = Math.hypot(run.vxs[q], run.vys[q]);
    const L = Math.min(110, sp * KV);
    ghosts.push(<circle key={`d${q}`} cx={gx} cy={gy} r={2.2} fill={TRAIL} opacity={0.7} />);
    if (sp > 1e-6 && q !== i) ghosts.push(<Vec key={q} x1={gx} y1={gy} x2={gx + (run.vxs[q] / sp) * L} y2={gy - (run.vys[q] / sp) * L} color={Q.v} width={1.6} head={6} opacity={0.45} />);
  }
  const j = Math.floor(i / SAMPLE);
  const lenNow = j + 1 < run.len.length ? run.len[j] + ((i - j * SAMPLE) / SAMPLE) * (run.len[j + 1] - run.len[j]) : run.len[run.len.length - 1];

  // Head-to-tail copies of the three forces.
  const chainEls: ReactNode[] = [];
  if (chain) {
    let cx = FB.cx;
    let cy = FB.cy;
    fs.forEach(([fx, fy], k) => {
      const x2 = cx + fx * FB.k;
      const y2 = cy - fy * FB.k;
      chainEls.push(<Vec key={k} x1={cx} y1={cy} x2={x2} y2={y2} color={Q.F} width={1.8} head={7} dash="5 3" opacity={0.75} />);
      cx = x2;
      cy = y2;
    });
  }

  const vLen = Math.min(100, speed * 9);
  const netTip: V2 = [FB.cx + net[0] * FB.k, FB.cy - net[1] * FB.k];
  const fLen = Math.min(90, fNet * KF);

  const visual = (
    <div ref={visRef} className="plot-stack">
      <SpacePanel w={W} h={H} ariaLabel={`Probe of mass ${m} kg pushed by three thrusters; net force ${fNet.toFixed(1)} N.`} tags={['Plays at 2× speed']} tagsAt="br" stars={90}>
        <defs>
          <clipPath id={`${uid}-fb`}>
            <rect x={FB.x} y={FB.y} width={FB.w} height={FB.h} rx={10} />
          </clipPath>
          <clipPath id={`${uid}-pv`}>
            <rect x={PV.x0} y={PV.y0} width={PV.x1 - PV.x0} height={PV.y1 - PV.y0} rx={10} />
          </clipPath>
        </defs>

        {/* free-body diagram */}
        <rect x={FB.x} y={FB.y} width={FB.w} height={FB.h} rx={10} fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.14)" />
        <text x={FB.x + 10} y={FB.y + 20} fontSize={13} fill="var(--text)" fontWeight={700}>
          Forces on the probe
        </text>
        <text x={FB.x + 10} y={FB.y + 35} className="plot-note" fill="var(--text-2)">
          drag an arrow tip to aim a thruster
        </text>
        <g clipPath={`url(#${uid}-fb)`}>
          {[5, 10].map((n) => (
            <g key={n}>
              <circle cx={FB.cx} cy={FB.cy} r={n * FB.k} fill="none" stroke="rgba(255,255,255,0.1)" strokeDasharray="3 4" />
              <text x={FB.cx + n * FB.k * 0.71 + 3} y={FB.cy - n * FB.k * 0.71 - 3} className="plot-note" fill="var(--text-3)">
                {n} N
              </text>
            </g>
          ))}
          {fs.map(([fx, fy], k) => {
            const n = Math.hypot(fx, fy);
            if (n < 0.05) return null;
            const ux = fx / n;
            const uy = -fy / n;
            const bx = FB.cx - ux * 14;
            const by = FB.cy - uy * 14;
            const L = 6 + n * 2.6;
            return <polygon key={k} points={`${bx - uy * 4},${by + ux * 4} ${bx - ux * L},${by - uy * L} ${bx + uy * 4},${by - ux * 4}`} fill="#ffd28a" opacity={0.7} />;
          })}
          {chainEls}
          <Probe x={FB.cx} y={FB.cy} />
          <Vec x1={FB.cx} y1={FB.cy} x2={FB.cx + (vx / (speed || 1)) * vLen} y2={FB.cy - (vy / (speed || 1)) * vLen} color={Q.v} width={1.6} head={7} dash="4 4" opacity={0.7} label="v" />
          {fs.map(([fx, fy], k) => {
            const n = Math.hypot(fx, fy);
            // label beside the tip (to the arrow's left), so it never sits on the net force's label
            const lx = tips[k][0] + (n > 0 ? (-fy / n) * 12 + (fx / n) * 3 : 0);
            const ly = tips[k][1] + (n > 0 ? (-fx / n) * 12 - (fy / n) * 3 : 0) + 4;
            return (
              <g key={k}>
                <Vec x1={FB.cx} y1={FB.cy} x2={tips[k][0]} y2={tips[k][1]} color={Q.F} width={k === sel ? 2.8 : 2} opacity={k === sel ? 1 : 0.7} />
                {n >= 0.3 && (
                  <text x={lx} y={ly} textAnchor="middle" className="plot-note" fill={Q.F} fontWeight={700}>
                    {NAMES[k]}
                  </text>
                )}
              </g>
            );
          })}
          <Vec x1={FB.cx} y1={FB.cy} x2={netTip[0]} y2={netTip[1]} color={Q.F} width={5} head={14} label="net" labelOffset={16} />
          {tips.map(([tx, ty], k) => (
            <circle key={k} cx={tx} cy={ty} r={k === sel ? 7 : 5} fill="none" stroke={Q.F} strokeWidth={1.4} opacity={k === sel ? 0.9 : 0.45} />
          ))}
          <rect x={FB.x} y={FB.y} width={FB.w} height={FB.h} fill="transparent" {...drag} />
        </g>

        {/* path */}
        <rect x={PV.x0} y={PV.y0} width={PV.x1 - PV.x0} height={PV.y1 - PV.y0} rx={10} fill="none" stroke="rgba(255,255,255,0.14)" />
        <g clipPath={`url(#${uid}-pv)`}>
          {Array.from({ length: 14 }, (_, q) => (
            <line key={`x${q}`} x1={sx(q * 10)} x2={sx(q * 10)} y1={PV.y0} y2={PV.y1} stroke="rgba(255,255,255,0.06)" />
          ))}
          {Array.from({ length: 15 }, (_, q) => (
            <line key={`y${q}`} x1={PV.x0} x2={PV.x1} y1={sy(q * 10)} y2={sy(q * 10)} stroke="rgba(255,255,255,0.06)" />
          ))}
          <path d={run.d} fill="none" stroke={TRAIL} strokeWidth={1.2} opacity={0.22} strokeDasharray="3 4" />
          <path d={run.d} fill="none" stroke={TRAIL} strokeWidth={2} strokeDasharray={`${lenNow.toFixed(1)} 1000000`} />
          {ghosts}
          {inView && (
            <>
              <Vec x1={px} y1={py} x2={px + (net[0] / (fNet || 1)) * fLen} y2={py - (net[1] / (fNet || 1)) * fLen} color={Q.F} width={3} head={10} />
              <Vec x1={px} y1={py} x2={px + (vx / (speed || 1)) * Math.min(110, speed * KV)} y2={py - (vy / (speed || 1)) * Math.min(110, speed * KV)} color={Q.v} width={3} head={10} label="v" />
              <circle cx={px} cy={py} r={5.5} fill="#cfd5de" stroke="#fff" strokeWidth={1} />
            </>
          )}
        </g>
        <text x={PV.x0 + 10} y={PV.y0 + 20} fontSize={13} fill="var(--text)" fontWeight={700}>
          Its path
        </text>
        <text x={PV.x0 + 10} y={PV.y0 + 35} className="plot-note" fill="var(--text-2)">
          grid squares are 10 m · a velocity arrow is left every 2 s
        </text>
      </SpacePanel>
      <Legend
        items={[
          { label: 'velocity v', color: Q.v },
          { label: 'forces (thick: the net force)', color: Q.F },
          { label: 'path', color: TRAIL },
        ]}
      />
    </div>
  );

  const thrusterLocked = sel === 0 && steer;
  const controls = (
    <>
      <div className="ctl-group">
        <div className="ctl-title">Thrusters: drag the arrow tips, or set them here</div>
        <Segmented<number> size="sm" label="Thruster to adjust" value={sel} onChange={setSel} options={NAMES.map((nm, k) => ({ value: k, label: `${nm}: ${num(th[k].n)} N` }))} />
        <Slider
          label={`thruster ${NAMES[sel]}: size`}
          tex={`\\qa{F_${NAMES[sel]}}`}
          tip="how hard this thruster pushes, in newtons (N)"
          value={th[sel].n}
          min={0}
          max={FMAX}
          step={0.1}
          unit="N"
          onChange={(n) => setThruster(sel, { n })}
        />
        <Slider
          label={`thruster ${NAMES[sel]}: direction`}
          tip="the way it pushes: 0° is to the right, 90° is up, 180° is to the left"
          value={th[sel].deg}
          min={-180}
          max={180}
          step={5}
          unit="°"
          onChange={(deg) => setThruster(sel, { deg })}
          disabled={thrusterLocked}
        />
        <Toggle checked={steer} onChange={setSteer} label="Thruster A steers: it always pushes at right angles to the motion" />
        <Toggle checked={chain} onChange={setChain} label="Show the forces head to tail" />
      </div>
      <div className="ctl-group">
        <Slider label="mass of the probe" tex="\qm{m}" tip="how much stuff the probe is made of, in kilograms: the harder it is to change its motion" value={m} min={1} max={20} step={0.5} unit="kg" onChange={setM} />
        <Slider label="starting speed, to the right" tex="\qv{u}" tip="how fast the probe is already moving at t = 0" value={u} min={0} max={8} step={0.5} unit="m/s" onChange={setU} />
        <Slider
          label="time"
          tex="\qt{t}"
          tip="seconds since the start"
          value={t}
          min={0}
          max={T_END}
          step={0.05}
          unit="s"
          onChange={(x) => {
            setPlaying(false);
            setT(x);
          }}
        />
        <div className="row gap-s wrap">
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (playing) setPlaying(false);
              else {
                if (t >= T_END) setT(0);
                setPlaying(true);
              }
            }}
          >
            {playing ? 'Pause' : t >= T_END ? 'Play again' : 'Play'}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setPlaying(false);
              setT(0);
            }}
          >
            Back to t = 0
          </Button>
        </div>
      </div>
      <div className="ctl-group">
        <Readouts>
          <Readout tex="\qa{F_{\text{net}}}" tip="size of the net force: all the pushes added as arrows" value={fNet} unit="N" sig={3} />
          <Readout label="pointing" tip="direction of the net force (0° right, 90° up)" text={fNet < 0.005 ? 'nowhere' : `${Math.round(degOf(net))}°`} />
          <Readout tex="\qa{a}" tip="acceleration = net force ÷ mass" value={acc} unit="m/s²" sig={3} />
          <Readout tex="\qv{v}" tip="speed right now" value={speed} unit="m/s" sig={3} />
        </Readouts>
        {!inView && <div className="note">The probe has left the picture. It is still going: out here, nothing slows it down.</div>}
      </div>
    </>
  );

  const parts = (c: 0 | 1) => fs.map((f) => `\\qa{${num(f[c], 1, true)}}`).join(' + ');
  const apply = (nth: Thruster[], nu: number, nsteer: boolean, nm = 4) => {
    setTh(nth);
    setU(nu);
    setSteer(nsteer);
    setM(nm);
    setSel(0);
    setT(0);
    setPlaying(true);
  };
  const balanced = !steer && th.every((f) => f.n >= 3) && fNet < 0.15;

  return (
    <>
      <Formulas>
        <Formula
          title="Adding forces"
          tex="\qa{\vec F_{\text{net}}} = \qa{\vec F_A} + \qa{\vec F_B} + \qa{\vec F_C}"
          say="Place the arrows head to tail: the net force is the single arrow from the first tail to the last head. Two equal forces pointing opposite ways add up to nothing."
          where={[
            ['\\qa{\\vec F_{\\text{net}}}', 'the **net force**: every force on the probe added together, in newtons (N)'],
            ['\\qa{\\vec F_A},\\ \\qa{\\vec F_B},\\ \\qa{\\vec F_C}', 'the push of each thruster'],
            ['\\vec{F}', 'the little arrow on top is a reminder that a force has a direction as well as a size, so forces add as arrows, not as plain numbers'],
          ]}
          live={`\\qa{F_{\\text{net}}} = \\qa{${num(fNet, 2)}}\\ \\text{N}${fNet >= 0.005 ? `\\ \\text{pointing}\\ ${Math.round(degOf(net))}^{\\circ}` : ''}`}
          liveNote={`Across: $${parts(0)} = \\qa{${num(net[0], 1, true)}}$ N. Up: $${parts(1)} = \\qa{${num(net[1], 1, true)}}$ N.`}
        />
        <Formula
          title="Newton's second law"
          tex="\qa{\vec a} = \dfrac{\qa{\vec F_{\text{net}}}}{\qm{m}}"
          say="Acceleration = net force ÷ mass, and it points the same way as the net force. The same push on twice the mass gives half the acceleration."
          where={[
            ['\\qa{\\vec a}', 'the acceleration: how much the velocity arrow changes each second (m/s²)'],
            ['\\qm{m}', 'the mass of the probe (kg)'],
            ['\\qa{\\vec F_{\\text{net}}}', 'the net force, from the first formula'],
          ]}
          live={`\\qa{a} = \\dfrac{\\qa{${num(fNet, 2)}}\\ \\text{N}}{\\qm{${num(m)}}\\ \\text{kg}} = \\qa{${num(acc, 3)}}\\ \\text{m/s}^2`}
          liveNote={
            acc < 1e-4
              ? 'No net force, no acceleration: the velocity arrow never changes.'
              : `Every second, the velocity arrow gains an extra **${num(acc, 2)} m/s** pointing the same way as the net force.`
          }
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="f-coast"
          question="Switch **every** thruster off while the probe is moving. What does it do next?"
          options={['Keeps going in a straight line at the same speed, forever', 'Gradually slows down and stops', 'Stops straight away', 'Slowly drifts off course']}
          answer={0}
          explain="With no net force there is no acceleration, so the velocity arrow never changes: same speed, same direction, for ever. That is **Newton's first law**. On Earth something always slows things down (friction, air), which is why it took until the 1600s to notice. Out here nothing does: Voyager 1's engines have been off for decades, and it is still coasting out of the solar system at about 17 km/s."
          tryIt="set all three thrusters to 0 N and press Play."
          onApply={() => apply([off(90), off(0), off(180)], 4, false)}
        />
        <WhatIf
          id="f-sideways"
          question="The probe is moving right. A steady push straight **up** (at right angles to the motion) comes on. What path does it follow?"
          options={['A curve that bends upwards more and more, but never points straight up', 'It turns to face up, then goes straight up', 'A circle', 'A straight line at 45°']}
          answer={0}
          explain="The push only ever adds **upward** velocity, a little more each second; nothing changes the sideways part, so the probe keeps drifting right just as fast as before. Sideways steady, upwards growing: the path bends more and more but never quite points up. It's a **parabola**, the same shape as a ball thrown across a field, and for the same reason. Watch the velocity arrows left behind: each one is the last plus a little arrow pointing up."
          tryIt="one thruster at 1 N pointing up (90°), starting speed 4 m/s."
          onApply={() => apply([{ n: 1, deg: 90 }, off(0), off(180)], 4, false)}
        />
        <WhatIf
          id="f-steer"
          question="Now thruster A **steers**: it keeps turning so it always pushes at right angles to the motion. What path does the probe follow?"
          options={['A circle, at a steady speed', 'A spiral inwards', 'A parabola, like before', 'A straight line']}
          answer={0}
          explain="A push at right angles to the motion can't speed the probe up or slow it down; it can only turn it. A steady sideways push turns it by the same amount every second, and a path that turns steadily is a **circle**. Nothing is pushing the probe *outwards*: the only force points to the centre. This is the whole secret of orbits. In Newton's cannon, gravity does the job of the steering thruster."
          tryIt="tick 'Thruster A steers', A at 8.5 N, starting speed 6 m/s."
          onApply={() => apply([{ n: 8.5, deg: 90 }, off(0), off(180)], 6, true)}
        />
        <Challenge
          goal="Balance the probe: make the **net force zero** while all three thrusters push at least **3 N** each (steering off)."
          done={balanced}
          hint="Turn on 'Show the forces head to tail'. For the forces to add up to nothing, the chain of three arrows must end exactly where it started: they have to form a closed triangle."
          success="Balanced: three real pushes, zero net force, and the probe carries on exactly as if nothing were pushing it at all. The head-to-tail arrows close into a triangle. Forces that cancel are everywhere: right now the floor pushes up on you exactly as hard as gravity pulls you down."
        />
      </WhatIfs>
    </>
  );
}

export const forces: BlockDef = {
  id: 'forces',
  title: 'Forces: arrows that change motion',
  hook: 'Why does motion need no cause, but every change in motion does?',
  explain: `A **force** is a push or a pull: one thing acting on another. A thruster's exhaust pushes a probe, a rope pulls, the Earth's gravity pulls you down and the floor pushes you up. Every force has a **size**, measured in newtons (N), and a **direction**, so we draw it as an arrow on the thing it acts on.

When several forces act at once, the object responds to just one thing: their total, the **net force**. Place the arrows head to tail and the net force is the arrow from start to finish. Forces pointing opposite ways cancel.

The net force doesn't set the velocity; it sets how the velocity **changes**. Each second, the velocity arrow gains a little extra arrow pointing the same way as the net force: that's the acceleration. Push along the motion and it speeds up, push against it and it slows, push sideways and it turns. With no net force at all nothing changes: it carries on in a straight line at a steady speed, forever. That's why motion needs no cause, but a change in motion always does.`,
  Sim: ForcesSim,
  maths: [
    {
      title: 'Adding arrows by their parts',
      body: `Every arrow can be split into an **across** part and an **up** part (pointing left or down makes that part negative). To add arrows, add all the across parts, then all the up parts: the live line under the first formula does exactly that. The length of the result comes from Pythagoras, because the across and up parts make a right-angled triangle: $\\text{length} = \\sqrt{\\text{across}^2 + \\text{up}^2}$.`,
    },
    {
      title: 'F = ma and a = F/m are the same law',
      body: `Newton's second law is usually written $F = ma$. Divide both sides by $m$ and you get $a = F/m$, the form used here, because it reads as cause and effect: the net force (cause) divided by the mass gives the acceleration (effect). An equation stays true whichever way round you arrange it, as long as you do the same thing to both sides.`,
    },
  ],
  deeper: `**Two thousand years of the wrong idea.** For Aristotle, and most people since, a moving thing needs a push to keep moving: stop pushing a cart and it stops. But the push was really fighting friction. Galileo noticed that balls rolling on smoother and smoother ramps kept going further, and guessed that with no friction at all they would never stop. Newton made that his first law.

**One newton is about the weight of an apple.** A 100 g apple is pulled down by Earth's gravity with about 1 N. A person weighs 600 to 900 N; the five engines of the Saturn V that launched Apollo pushed with about 35 million N.

**Every push and pull comes from one of four forces.** Gravity, electromagnetism, and two nuclear forces that act only inside atoms. The floor holding you up, a rope's tension, a thruster's exhaust: all electromagnetism, atoms pushing on atoms. Gravity is the odd one out, and Einstein's general relativity says it isn't a force at all. Someone falling freely feels no force, because they are following the straightest possible path through curved space-time. That idea comes back in a big way near black holes.`,
  next: 'Every force is one thing pushing on another, so forces always come in pairs. That turns out to be the only way to move when there is nothing to push against.',
};
