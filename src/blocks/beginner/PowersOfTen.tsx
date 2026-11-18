// Beginner 1: Powers of ten. Zoom from a proton to the observable universe, one factor of ten at a time. Every
// circle is drawn to scale against the others, all centred on one point. Compare any two sizes by subtracting
// their powers. Sizes are distances, so the highlighted pair is gold (Q.s); the rest are neutral.
import { useMemo, useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { Challenge, Formula, Formulas, num, sci, WhatIfs } from '../../ui/blockkit';
import { Q, TRAIL } from '../../ui/colors';
import { Button, Readout, Readouts, Select, SimLayout, Slider } from '../../ui/kit';
import { SpacePanel } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

interface Thing {
  id: string;
  name: string;
  /** Diameter of the circle drawn, m. */
  d: number;
}
const THINGS: Thing[] = [
  { id: 'proton', name: 'proton', d: 1.7e-15 },
  { id: 'atom', name: 'hydrogen atom', d: 1.06e-10 },
  { id: 'virus', name: 'flu virus', d: 1e-7 },
  { id: 'cell', name: 'red blood cell', d: 8e-6 },
  { id: 'hair', name: 'width of a hair', d: 8e-5 },
  { id: 'apple', name: 'apple', d: 0.08 },
  { id: 'person', name: 'person', d: 1.7 },
  { id: 'bh-sun', name: 'black hole with the Sun’s mass', d: 5.9e3 },
  { id: 'everest', name: 'height of Everest', d: 8.85e3 },
  { id: 'moon', name: 'the Moon', d: 3.47e6 },
  { id: 'earth', name: 'Earth', d: 1.27e7 },
  { id: 'jupiter', name: 'Jupiter', d: 1.4e8 },
  { id: 'moon-orbit', name: 'the Moon’s orbit', d: 7.69e8 },
  { id: 'sun', name: 'the Sun', d: 1.39e9 },
  { id: 'sgr', name: 'black hole at the galaxy’s centre', d: 2.5e10 },
  { id: 'earth-orbit', name: 'Earth’s orbit', d: 2.99e11 },
  { id: 'neptune-orbit', name: 'Neptune’s orbit', d: 9.0e12 },
  { id: 'proxima', name: 'circle reaching the nearest star', d: 8.0e16 },
  { id: 'galaxy', name: 'the Milky Way', d: 9.5e20 },
  { id: 'universe', name: 'observable universe', d: 8.8e26 },
];
const byId = (id: string) => THINGS.find((t) => t.id === id) ?? THINGS[0];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const LMIN = -15.5;
const LMAX = 27.5;
const W = 560;
const H = 400;
const CX = 280;
const CY = 168;
const FRAME = 440; // px across the window
const LAD = { x0: 34, x1: 526, y: 372 };
const ladX = (l: number) => LAD.x0 + ((l - LMIN) / (LMAX - LMIN)) * (LAD.x1 - LAD.x0);

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const pow10 = (k: number) => `10${String(k)
  .split('')
  .map((c) => SUP[c] ?? c)
  .join('')}`;

/** 10^k written out in full, digits grouped in threes. */
function longForm(k: number): string {
  if (k >= 0) {
    const s = '1' + '0'.repeat(k);
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  const frac = '0'.repeat(-k - 1) + '1';
  return '0.' + frac.replace(/(\d{3})(?=\d)/g, '$1 ');
}

/** A number written out in full to 3 significant figures, digits grouped in threes. */
function writtenOut(x: number): string {
  const e = Math.floor(Math.log10(x));
  const digits = Math.round(x / Math.pow(10, e - 2));
  if (e >= 2) return (String(digits) + '0'.repeat(e - 2)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (e >= 0) return x.toPrecision(3);
  const frac = '0'.repeat(-e - 1) + String(digits).replace(/0+$/, '');
  return '0.' + frac.replace(/(\d{3})(?=\d)/g, '$1 ');
}

/** "about the size of X", or "between X and Y". */
function sizeWords(l: number): string {
  let lo: Thing | null = null;
  let hi: Thing | null = null;
  for (const t of THINGS) {
    const lt = Math.log10(t.d);
    if (Math.abs(lt - l) < 0.35) return `about the size of ${t.name === 'person' ? 'a person' : t.name}`;
    if (lt < l) lo = t;
    else if (!hi) hi = t;
  }
  if (lo && hi) return `between ${lo.name} and ${hi.name}`;
  return lo ? `bigger than ${lo.name}` : `smaller than ${hi?.name ?? ''}`;
}

function PowersSim() {
  const [n, setN] = useState(7.4); // window width = 10^n m
  const [playing, setPlaying] = useState(false);
  const [aId, setA] = useState('earth');
  const [bId, setB] = useState('sun');
  const visRef = useRef<HTMLDivElement>(null);

  useRaf(
    (dt) =>
      setN((cur) => {
        const nn = Math.min(LMAX - 0.5, cur + dt * 1.6);
        if (nn >= LMAX - 0.5) setPlaying(false);
        return nn;
      }),
    playing,
    visRef
  );

  const A = byId(aId);
  const B = byId(bId);
  const lA = Math.log10(A.d);
  const lB = Math.log10(B.d);
  const pxPerM = FRAME / Math.pow(10, n);
  const k = Math.round(n);

  const circles = useMemo(
    () =>
      THINGS.map((t, i) => ({ t, i, r: (t.d / 2) * pxPerM }))
        .filter((c) => c.r > 0.5 && c.r < 3000)
        .sort((p, q) => q.r - p.r),
    [pxPerM]
  );

  const ratioL = lB - lA;
  const ratio = Math.pow(10, ratioL);
  const challengeDone = Math.abs(Math.abs(ratioL) - 9) <= 0.5;
  const thingOpts = THINGS.map((t) => ({ value: t.id, label: `${t.name} (${sci(t.d, 2).replace(' \\times 10^{', '×10^').replace('}', '')} m)` }));

  const visual = (
    <div ref={visRef}>
      <SpacePanel w={W} h={H} ariaLabel={`Window ${pow10(k)} metres across, ${sizeWords(n)}.`} tags={['Every circle to scale with the others', 'All centred on one point']} tagsAt="tr" stars={70}>
        {circles.map(({ t, i, r }) => {
          const hl = t.id === aId || t.id === bId;
          const ang = ((-38 - 30 * (i % 4)) * Math.PI) / 180;
          const lx = CX + r * Math.cos(ang);
          const ly = CY + r * Math.sin(ang);
          const showLabel = r >= 12 && r <= 330 && lx > 10 && lx < W - 10 && ly > 18 && ly < 340;
          return (
            <g key={t.id}>
              {r < 1.6 ? (
                <circle cx={CX} cy={CY} r={1.6} fill={hl ? Q.s : TRAIL} opacity={0.9} />
              ) : (
                <circle cx={CX} cy={CY} r={r} fill={hl ? 'rgba(242,201,76,0.06)' : 'none'} stroke={hl ? Q.s : TRAIL} strokeWidth={hl ? 2 : 1.1} opacity={hl ? 1 : 0.55} />
              )}
              {showLabel && (
                <text x={lx + (Math.cos(ang) >= 0 ? 6 : -6)} y={ly - 3} textAnchor={Math.cos(ang) >= 0 ? 'start' : 'end'} className="plot-note" fill={hl ? Q.s : 'var(--text-2)'} fontWeight={hl ? 700 : 500}>
                  {t.name}
                </text>
              )}
            </g>
          );
        })}
        <line x1={CX - FRAME / 2} x2={CX + FRAME / 2} y1={334} y2={334} stroke={Q.s} strokeWidth={1.5} />
        <line x1={CX - FRAME / 2} x2={CX - FRAME / 2} y1={328} y2={340} stroke={Q.s} strokeWidth={1.5} />
        <line x1={CX + FRAME / 2} x2={CX + FRAME / 2} y1={328} y2={340} stroke={Q.s} strokeWidth={1.5} />
        <text x={CX} y={328} textAnchor="middle" fontSize={13} fontWeight={700} fill={Q.s}>
          {pow10(k)} m: {sizeWords(n)}
        </text>
        {/* the ladder: every object on one line, a step per power of ten; click one to zoom to it */}
        <line x1={LAD.x0} x2={LAD.x1} y1={LAD.y} y2={LAD.y} stroke="rgba(255,255,255,0.35)" />
        {Array.from({ length: 43 }, (_, q) => q - 15).map((p) => (
          <g key={p}>
            <line x1={ladX(p)} x2={ladX(p)} y1={LAD.y - (p % 5 === 0 ? 5 : 3)} y2={LAD.y + (p % 5 === 0 ? 5 : 3)} stroke="rgba(255,255,255,0.35)" />
            {p % 5 === 0 && (
              <text x={ladX(p)} y={LAD.y + 18} textAnchor="middle" className="plot-note" fill="var(--text-3)">
                {pow10(p)}
              </text>
            )}
          </g>
        ))}
        <rect x={ladX(n - 0.5)} y={LAD.y - 9} width={ladX(n + 0.5) - ladX(n - 0.5)} height={18} rx={4} fill="rgba(242,201,76,0.18)" stroke={Q.s} />
        {THINGS.map((t) => {
          const hl = t.id === aId || t.id === bId;
          return (
            <circle
              key={t.id}
              cx={ladX(Math.log10(t.d))}
              cy={LAD.y}
              r={hl ? 4.5 : 3.2}
              fill={hl ? Q.s : TRAIL}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setPlaying(false);
                setN(Math.log10(t.d) + 0.12);
              }}
            >
              <title>{`${t.name}: ${t.d.toExponential(2)} m (click to zoom here)`}</title>
            </circle>
          );
        })}
      </SpacePanel>
    </div>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Slider
          label="zoom: the window is this wide"
          tip="each whole step on this slider makes the window ten times wider"
          value={n}
          min={LMIN}
          max={LMAX - 0.5}
          step={0.01}
          format={(v) => `${pow10(Math.round(v))} m`}
          onChange={(x) => {
            setPlaying(false);
            setN(x);
          }}
        />
        <div className="row gap-s wrap">
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (playing) setPlaying(false);
              else {
                if (n >= LMAX - 0.6) setN(LMIN + 0.3);
                setPlaying(true);
              }
            }}
          >
            {playing ? 'Pause' : n >= LMAX - 0.6 ? 'Again, from a proton' : 'Zoom out'}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setPlaying(false);
              setN(LMIN + 0.3);
            }}
          >
            Back to a proton
          </Button>
        </div>
        <div className="note">Written out in full, this window is {longForm(k)} m across. Click any dot on the line at the bottom to jump to it.</div>
      </div>
      <div className="ctl-group">
        <div className="ctl-title">Compare two sizes (gold in the picture)</div>
        <Select label="First size" value={aId} onChange={setA} options={thingOpts} />
        <Select label="Second size" value={bId} onChange={setB} options={thingOpts} />
        <Readouts min={150}>
          <Readout label="second ÷ first" tip="how many times bigger the second is than the first" value={ratio} sig={3} tone="m5" />
          <Readout label="powers apart" tip="the difference between the two powers of ten" value={ratioL} sig={3} />
        </Readouts>
      </div>
    </>
  );

  const ratioWords =
    Math.abs(ratioL) < 0.05
      ? 'They are about the same size.'
      : ratioL > 0
        ? `${cap(B.name)} is about **${ratio >= 1000 ? `$${sci(ratio, 2)}$` : num(ratio, ratio < 10 ? 1 : 0)}** times bigger than ${A.name}.`
        : `${cap(B.name)} is about **${1 / ratio >= 1000 ? `$${sci(1 / ratio, 2)}$` : num(1 / ratio, 1 / ratio < 10 ? 1 : 0)}** times smaller than ${A.name}.`;

  return (
    <>
      <Formulas>
        <Formula
          title="Scientific notation"
          tex="\qs{d} = a \times 10^{\,n}"
          say="A size written as an everyday number times a power of ten. Each step up in $n$ is ten times bigger; a negative $n$ means dividing by ten that many times."
          where={[
            ['\\qs{d}', 'a size or distance, in metres (m)'],
            ['a', 'the front part: a number from 1 up to (but not including) 10'],
            ['n', 'the **power**: how many times to multiply by ten (or, when negative, to divide by ten)'],
          ]}
          live={`\\text{this window:}\\ \\qs{d} = 10^{${k}}\\ \\text{m} \\qquad \\text{${A.name.replace(/’/g, "'")}:}\\ \\qs{${sci(A.d)}}\\ \\text{m}`}
          liveNote={`Written out, this window is ${longForm(k)} m across, and ${A.name} is ${writtenOut(A.d)} m.`}
        />
        <Formula
          title="Comparing sizes: subtract the powers"
          tex="\frac{10^{\,a}}{10^{\,b}} = 10^{\,a-b} \qquad 10^{\,a} \times 10^{\,b} = 10^{\,a+b}"
          say="To divide, subtract the powers; to multiply, add them. Comparing a star with an atom becomes a subtraction instead of a 20-digit sum."
          where={[['a,\\ b', 'two powers of ten']]}
          live={`\\frac{\\qs{${sci(B.d)}}}{\\qs{${sci(A.d)}}} \\approx 10^{\\,${ratioL.toFixed(1)}}`}
          liveNote={ratioWords}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="pt-atom"
          question="Blow a hydrogen atom up to the size of a football stadium (about 200 m across). How big is its **nucleus**, the proton at the centre?"
          options={['A peppercorn (a few millimetres)', 'A football', 'A car', 'A house']}
          answer={0}
          fixedOrder
          explain="The atom is about 60 000 times wider than its nucleus ($10^{-10}$ against about $10^{-15}$ m: almost five powers of ten). Shrink 200 m by 60 000 and you get about 3 mm. Nearly all of an atom is empty space, and since you are made of atoms, so are you. What makes a table feel solid is the electric push between the atoms' outer electrons, not stuff packed tight."
          tryIt="compare the proton with the hydrogen atom."
          onApply={() => {
            setPlaying(false);
            setA('proton');
            setB('atom');
            setN(-9.85);
          }}
        />
        <WhatIf
          id="pt-sun-moon"
          question="Put the Earth at the centre of the Sun. Would the Moon's whole orbit fit **inside** the Sun?"
          options={['Yes, with room to spare', 'Only just', 'No, it would poke out a little', 'No, it would be far outside']}
          answer={0}
          fixedOrder
          explain="The Sun is about 1.4 million km across; the Moon's orbit is about 770 000 km across. So the Sun is nearly **twice** as wide as the Moon's entire orbit. Pictures of the solar system can't show this: draw the Sun small enough to fit on the page and the Earth becomes an invisible speck."
          tryIt="compare the Moon's orbit with the Sun."
          onApply={() => {
            setPlaying(false);
            setA('moon-orbit');
            setB('sun');
            setN(9.3);
          }}
        />
        <WhatIf
          id="pt-steps"
          question="How many steps of ×10 does it take to get from a proton to the whole observable universe?"
          options={['About 12', 'About 25', 'About 42', 'About 100']}
          answer={2}
          fixedOrder
          explain="From about $10^{-15}$ m to about $10^{27}$ m is 42 powers of ten. You sit 15 steps up from a proton and 27 steps below the universe. Halfway, on the power scale, is about 1000 km: the size of a large country. Watch the zoom: most steps are empty, with the interesting things clumped together."
          tryIt="press 'Again, from a proton' and watch the whole zoom."
          onApply={() => {
            setA('proton');
            setB('universe');
            setN(LMIN + 0.3);
            setPlaying(true);
          }}
        />
        <Challenge
          goal="Find a pair of things where one is about a **billion** times bigger than the other ($10^9$, give or take a factor of 3)."
          done={challengeDone}
          hint="A billion is nine powers of ten. Pick a first size, then look along the line at the bottom for a dot about nine steps to the right of it."
          success={`Nine powers apart: ${A.name} and ${B.name}. A billion seconds is about 32 years; a billion of anything stops being a number you can picture, but as a power of ten it is just "9".`}
        />
      </WhatIfs>
    </>
  );
}

export const powersOfTen: BlockDef = {
  id: 'powers-of-ten',
  title: 'Powers of ten',
  hook: 'How do you hold numbers as big as a star and as small as an atom in your head at the same time?',
  explain: `Physics spans sizes that everyday numbers can't handle. A proton is about 0.000 000 000 000 001 7 m across; the observable universe is about 880 000 000 000 000 000 000 000 000 m. Instead of counting zeros, physicists count **powers of ten**: how many times you multiply (or divide) by ten. Those two sizes become $1.7 \\times 10^{-15}$ m and $8.8 \\times 10^{26}$ m.

The small number on top, the power, is what changes as you zoom: each step is ten times bigger than the last. It also makes huge comparisons easy, because dividing two such numbers means **subtracting** their powers. Zoom out from a proton below and feel how many steps there are, and how empty most of them are.`,
  Sim: PowersSim,
  maths: [
    {
      title: 'Why multiplying adds the powers',
      body: `A power just counts tens: $10^3 \\times 10^2 = (10 \\times 10 \\times 10) \\times (10 \\times 10)$, which is five tens multiplied together, $10^5$. Dividing cancels tens off the top and bottom, so the powers subtract: $10^5 / 10^2 = 10^3$. Follow the pattern downwards and $10^0 = 1$ (no tens at all), while $10^{-2} = 1/100$ (divide by ten twice).`,
    },
    {
      title: 'Orders of magnitude',
      body: `Physicists often care only about the power. Two things of "the same order of magnitude" are within about a factor of ten of each other. Quick estimates done this way are called **Fermi estimates**, after Enrico Fermi, who famously estimated the energy of the first atomic bomb test by dropping scraps of paper and watching how far the blast carried them.`,
    },
  ],
  deeper: `**Logarithms.** The power of ten that makes a number is called its **logarithm** (base 10): $\\log_{10} 1000 = 3$. The line along the bottom of the picture is a *logarithmic* scale: equal steps mean equal *multiplications*. Earthquake magnitudes, decibels and the brightness of stars all use the same trick.

**The emptiness of space.** Shrink the Sun to a 14 cm grapefruit. The Earth becomes a grain of sand 15 m away, Neptune a peppercorn half a kilometre out, and the nearest star another grapefruit about 4000 km away.

**Numbers you'll meet on this site.** Gravity's constant $G = 6.67 \\times 10^{-11}$, the Sun's mass $2 \\times 10^{30}$ kg, the speed of light $3 \\times 10^{8}$ m/s. None of them is scary once you read the power first.`,
  next: "Sizes are just numbers. Most things in physics also have a direction, and that changes how they add.",
};
