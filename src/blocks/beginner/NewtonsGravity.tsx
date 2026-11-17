// Beginner 9: Newton's gravity. Two bodies pull on each other with equal and opposite forces (Newton 3) that
// weaken with the square of the distance; equal forces give very unequal accelerations (Newton 2). A probe on the
// line between them feels both pulls; the challenge is to find where they balance.
// Colours: forces and accelerations orange, masses green, distances gold.
import { useState } from 'react';
import type { BlockDef } from '../../content/types';
import { G } from '../../physics/constants';
import { Challenge, Formula, Formulas, sci, WhatIfs } from '../../ui/blockkit';
import { Q } from '../../ui/colors';
import { Readout, Readouts, Segmented, SimLayout, Slider } from '../../ui/kit';
import { SpacePanel, useSvgDrag, Vec } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const PAIRS = [
  { id: 'em', a: 'Earth', b: 'Moon', ma: 5.97e24, mb: 7.35e22, d: 3.844e8, ca: '#2f6fa3', cb: '#8d8d8d', ra: 30, rb: 12, probe: true },
  { id: 'se', a: 'Sun', b: 'Earth', ma: 1.99e30, mb: 5.97e24, d: 1.496e11, ca: '#f2b84b', cb: '#2f6fa3', ra: 40, rb: 12, probe: true },
  { id: 'ey', a: 'Earth', b: 'you', ma: 5.97e24, mb: 70, d: 6.37e6, ca: '#2f6fa3', cb: '#e8ebf0', ra: 40, rb: 6, probe: false },
] as const;
type PairId = (typeof PAIRS)[number]['id'];
const W = 560;
const H = 300;
const AX = 80;
const BX = 480;
const LY = 140;

/** Superscript-style text for a number in scientific notation, e.g. 1.98 × 10²⁰. */
function sciText(x: number, sig = 3): string {
  if (x === 0 || !Number.isFinite(x)) return String(x);
  const e = Math.floor(Math.log10(Math.abs(x)));
  if (e >= -2 && e <= 3) return Number(x.toPrecision(sig)).toString();
  const m = Number((x / Math.pow(10, e)).toPrecision(sig));
  const sup = String(e)
    .split('')
    .map((c) => ({ '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' })[c] ?? c)
    .join('');
  return `${m} × 10${sup}`;
}

function GravitySim() {
  const [pairId, setPair] = useState<PairId>('em');
  const [kA, setKA] = useState(1);
  const [kB, setKB] = useState(1);
  const [kD, setKD] = useState(1);
  const [f, setF] = useState(0.5); // probe position along the line, 0 = at A's centre
  const p = PAIRS.find((q) => q.id === pairId) ?? PAIRS[0];
  const mA = p.ma * kA;
  const mB = p.mb * kB;
  const d = p.d * kD;
  const F = (G * mA * mB) / (d * d);
  const aA = F / mA;
  const aB = F / mB;
  const x = f * d;
  const gA = (G * mA) / (x * x);
  const gB = (G * mB) / ((d - x) * (d - x));
  const gMax = Math.max(gA, gB);
  const net = gB - gA; // towards B is positive
  const fBal = 1 / (1 + Math.sqrt(mB / mA));
  const balanced = p.probe && Math.abs(gA - gB) / gMax < 0.01;
  const px = AX + f * (BX - AX);
  const drag = useSvgDrag((pt, phase) => {
    if (phase === 'end' || !p.probe) return;
    setF(Math.min(0.97, Math.max(0.03, (pt.x - AX) / (BX - AX))));
  });

  const visual = (
    <SpacePanel w={W} h={H} ariaLabel={`${p.a} and ${p.b}, ${sciText(d / 1000)} km apart, pull each other with ${sciText(F)} N.`} tags={['Sizes not to scale']} tagsAt="tl" stars={70}>
      <line x1={AX} x2={BX} y1={LY} y2={LY} stroke={Q.s} strokeDasharray="4 5" opacity={0.7} />
      <text x={(AX + BX) / 2} y={LY + 34} textAnchor="middle" className="plot-note" fill={Q.s} fontWeight={700}>
        r = {sciText(d / 1000)} km
      </text>
      <circle cx={AX} cy={LY} r={p.ra} fill={p.ca} stroke="rgba(255,255,255,0.4)" />
      <circle cx={BX} cy={LY} r={p.rb} fill={p.cb} stroke="rgba(255,255,255,0.4)" />
      <text x={AX} y={LY - p.ra - 10} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--m3)">
        {p.a}
      </text>
      <text x={BX} y={LY - Math.max(p.rb, 14) - 10} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--m3)">
        {p.b}
      </text>
      {/* the pair of forces: always the same size */}
      <Vec x1={AX + p.ra + 4} y1={LY + 62} x2={AX + p.ra + 84} y2={LY + 62} color={Q.F} width={3.5} head={11} />
      <Vec x1={BX - p.rb - 4} y1={LY + 62} x2={BX - p.rb - 84} y2={LY + 62} color={Q.F} width={3.5} head={11} />
      <text x={AX + p.ra + 44} y={LY + 82} textAnchor="middle" className="plot-note" fill={Q.F} fontWeight={700}>
        pull on {p.a}: {sciText(F)} N
      </text>
      <text x={BX - p.rb - 44} y={LY + 82} textAnchor="middle" className="plot-note" fill={Q.F} fontWeight={700}>
        pull on {p.b}: {sciText(F)} N
      </text>
      <text x={AX} y={LY + 112} textAnchor="middle" className="plot-note" fill="var(--text-2)">
        a = {sciText(aA)} m/s²
      </text>
      <text x={BX} y={LY + 112} textAnchor="middle" className="plot-note" fill="var(--text-2)">
        a = {sciText(aB)} m/s²
      </text>
      {p.probe && (
        <g>
          <rect x={AX} y={LY - 40} width={BX - AX} height={80} fill="transparent" {...drag} />
          <Vec x1={px} y1={LY - 30} x2={px - (gA / gMax) * 100} y2={LY - 30} color={Q.F} width={2} head={8} opacity={0.8} />
          <Vec x1={px} y1={LY - 30} x2={px + (gB / gMax) * 100} y2={LY - 30} color={Q.F} width={2} head={8} opacity={0.8} />
          <Vec x1={px} y1={LY - 48} x2={px + (net / gMax) * 100} y2={LY - 48} color={Q.F} width={4} head={11} label={Math.abs(net) / gMax < 0.02 ? undefined : 'net'} labelOffset={16} />
          <rect x={px - 5} y={LY - 5} width={10} height={10} fill="#cfd5de" stroke="#fff" style={{ pointerEvents: 'none' }} />
          <text x={px} y={LY + 22} textAnchor="middle" className="plot-note" fill="var(--text-2)">
            probe (drag)
          </text>
        </g>
      )}
    </SpacePanel>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Segmented<PairId>
          size="sm"
          label="Pair"
          value={pairId}
          onChange={(v) => {
            setPair(v);
            setKA(1);
            setKB(1);
            setKD(1);
          }}
          options={PAIRS.map((q) => ({ value: q.id, label: `${q.a} & ${q.b}` }))}
        />
        <Slider label={`mass of ${p.a}`} tex="\qm{m_1}" tip="as a multiple of the real value" value={kA} min={0.1} max={10} log step={0.01} format={(v) => `× ${v.toPrecision(2)}`} onChange={setKA} />
        <Slider label={`mass of ${p.b}`} tex="\qm{m_2}" tip="as a multiple of the real value" value={kB} min={0.1} max={10} log step={0.01} format={(v) => `× ${v.toPrecision(2)}`} onChange={setKB} />
        <Slider label="distance between centres" tex="\qs{r}" tip="as a multiple of the real distance" value={kD} min={0.25} max={4} log step={0.01} format={(v) => `× ${v.toPrecision(2)}`} onChange={setKD} />
      </div>
      <div className="ctl-group">
        <Readouts min={150}>
          <Readout tex="\qa{F}" tip="the pull each body feels: the same size on both" value={F} unit="N" sig={3} />
          <Readout label={`a of ${p.a}`} tip="its acceleration: F divided by its mass" value={aA} unit="m/s²" sig={3} />
          <Readout label={`a of ${p.b}`} tip="its acceleration: F divided by its mass" value={aB} unit="m/s²" sig={3} />
          {p.probe && <Readout label="probe: net pull" tip={`per kilogram; positive = towards ${p.b}`} value={net} unit="N/kg" sig={3} tone={balanced ? 'ok' : undefined} />}
        </Readouts>
        {p.probe && <div className="note">The probe is {sciText((x / 1000) as number)} km from the centre of {p.a} ({Math.round(f * 100)} % of the way).</div>}
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="Newton's law of gravity"
          tex="\qa{F} = \frac{G\,\qm{m_1}\,\qm{m_2}}{\qs{r}^{2}}"
          say="Every mass pulls every other mass. The pull grows with both masses and weakens with the **square** of the distance: twice as far, a quarter of the pull."
          where={[
            ['\\qa{F}', 'the pull on **each** of the two bodies, in newtons (N)'],
            ['G', 'the gravitational constant, $6.67 \\times 10^{-11}$ N m²/kg²: one number for any two masses, anywhere'],
            ['\\qm{m_1},\\ \\qm{m_2}', 'the two masses (kg)'],
            ['\\qs{r}', 'the distance between their centres (m)'],
          ]}
          live={`\\qa{F} = \\frac{${sci(G)} \\times \\qm{${sci(mA)}} \\times \\qm{${sci(mB)}}}{(\\qs{${sci(d)}})^2} = \\qa{${sci(F)}}\\ \\text{N}`}
        />
        <Formula
          title="Same pull, different effects"
          tex="\qa{a_1} = \frac{\qa{F}}{\qm{m_1}} \qquad \qa{a_2} = \frac{\qa{F}}{\qm{m_2}}"
          say="Newton's third law: the two pulls are equal and opposite, always. Newton's second law: the same pull moves a light body far more than a heavy one."
          where={[['\\qa{a_1},\\ \\qa{a_2}', 'the acceleration each body gets from the pull (m/s²)']]}
          live={`\\qa{a_1} = \\qa{${sci(aA)}}\\ \\text{m/s}^2 \\qquad \\qa{a_2} = \\qa{${sci(aB)}}\\ \\text{m/s}^2`}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="ng-jump"
          question="You jump. Does the Earth move?"
          options={['Yes, by far less than the width of an atom', 'No: it is too heavy to move at all', 'Yes, about as much as you do', 'Only if lots of people jump together']}
          answer={0}
          explain="You and the Earth pull each other with exactly the same force, about 690 N for a 70 kg person. That gives you an acceleration of 9.8 m/s², and the Earth about $10^{-22}$ m/s². While you rise half a metre, the Earth moves the other way by about $6 \times 10^{-24}$ m: hundreds of millions of times smaller than a proton. But it does move, and that's the point."
          tryIt="pick 'Earth & you' and compare the two accelerations."
          onApply={() => {
            setPair('ey');
            setKA(1);
            setKB(1);
            setKD(1);
          }}
        />
        <WhatIf
          id="ng-double"
          question="Move the Moon to twice its distance. What happens to the pull between it and the Earth?"
          options={['It falls to a quarter', 'It halves', 'It stays the same', 'It falls to an eighth']}
          answer={0}
          fixedOrder
          explain="Gravity weakens with the **square** of the distance: $2^2 = 4$, so a quarter of the pull. Three times as far gives a ninth. Picture the pull spreading out over the surface of an ever-bigger sphere: double the radius and the same pull is shared over four times the area."
          tryIt="Earth & Moon, distance × 2."
          onApply={() => {
            setPair('em');
            setKA(1);
            setKB(1);
            setKD(2);
          }}
        />
        <WhatIf
          id="ng-neutral"
          question="A probe flies from the Earth to the Moon. Where does the Moon's pull start to win over the Earth's?"
          options={['About 90 % of the way to the Moon', 'About halfway', 'Just above the Moon’s surface', "Nowhere: the Earth's pull always wins"]}
          answer={0}
          explain="The Earth is 81 times heavier, so the probe has to be 9 times closer to the Moon ($\sqrt{81} = 9$) for the pulls to match: about 346 000 km out of 384 000 km. Past that point, the probe 'falls' towards the Moon. Apollo crews crossed it about three days into their trip."
          tryIt="drag the probe until the net arrow vanishes."
          onApply={() => {
            setPair('em');
            setKA(1);
            setKB(1);
            setKD(1);
            setF(1 / (1 + Math.sqrt(7.35e22 / 5.97e24)));
          }}
        />
        <Challenge
          goal="Drag the probe to the point where it feels **no net pull** at all (within 1 %)."
          done={balanced}
          hint="Near the heavier body its pull dominates. The balance point is where both pulls are equal, which is closer to the lighter body."
          success={`Balanced, ${Math.round(fBal * 100)} % of the way from ${p.a} to ${p.b}. Here the two pulls cancel exactly; that's why the balance point is so much closer to the lighter body.`}
        />
      </WhatIfs>
    </>
  );
}

export const newtonsGravity: BlockDef = {
  id: 'newtons-gravity',
  title: "Newton's gravity",
  hook: 'When you jump, does the Earth move too?',
  explain: `Newton's great leap was to say that the pull that drops an apple is the same pull that holds the Moon in its orbit, and that **every** mass pulls on **every** other mass. The pull grows with both masses and weakens with the square of the distance between their centres.

It is always a pair. The Earth pulls the Moon, and the Moon pulls the Earth back exactly as hard, in the opposite direction (Newton's third law again). So why does the Moon do all the moving? Because the same force on a body 81 times heavier gives it 81 times less acceleration. When you jump, the Earth really does move, by an amount far too small ever to measure.`,
  Sim: GravitySim,
  maths: [
    {
      title: 'Why the square of the distance',
      body: `Imagine gravity spreading out from a body in all directions, like light from a bulb. At distance $r$ it is shared over the surface of a sphere, of area $4\\pi r^2$. Twice as far, that area is four times bigger, so each square metre gets a quarter as much. That's an *inverse-square law*, and light, sound and electric forces all spread out the same way.`,
    },
  ],
  deeper: `**Weighing the Earth.** Newton knew the law but not the number $G$. In 1798 Henry Cavendish measured the tiny pull between lead balls in a shed, using a twisting wire. With $G$ known, the Earth's mass followed from the strength of gravity at its surface: he had "weighed the world". $G$ is still the least precisely known of the fundamental constants.

**Who orbits whom?** Since the Earth is pulled too, the Earth and the Moon both circle their shared balance point (the centre of mass), about 4 700 km from the Earth's centre: still inside the Earth. The Medium level's "Dancing partners" makes this visible.

**The probe's balance point** isn't a place to park: the slightest nudge either way and one pull wins. (The real "Lagrange points" also account for the Moon's orbital motion, which shifts the balance point to about 326 000 km.)`,
  next: 'Gravity pulls; sideways speed keeps missing. Put the two together and you get Newton’s most famous thought experiment.',
};
