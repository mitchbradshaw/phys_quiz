// Medium 6: Tides and the Roche limit. Gravity pulls the near side of a body harder than its far side; what's left
// after removing the average pull is a stretch along the line and a squeeze across it. Mode 1: the Earth's ocean
// bulges (two high tides a day). Mode 2: a rubble moon on a circular orbit; inside the Roche limit its loose pieces
// peel off and Keplerian shear (inner pieces orbit faster) spreads them into a ring.
// Colours: forces/accelerations orange, distances gold, masses green.
import { useMemo, useRef, useState } from 'react';
import { useRaf } from '../../anim/hooks';
import type { BlockDef } from '../../content/types';
import { makeRng } from '../../engine/rng';
import { Challenge, Formula, Formulas, num, WhatIfs } from '../../ui/blockkit';
import { Q, TRAIL } from '../../ui/colors';
import { Button, Readout, Readouts, Segmented, SimLayout, Slider, Toggle } from '../../ui/kit';
import { SpacePanel, Vec } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

type Mode = 'tides' | 'roche';
const W = 560;
const H = 380;

const PIECES = (() => {
  const r = makeRng(7);
  const out: { x: number; y: number }[] = [];
  while (out.length < 70) {
    const x = r.uniform(-1, 1);
    const y = r.uniform(-1, 1);
    if (x * x + y * y <= 1) out.push({ x, y });
  }
  return out;
})();

function TidesSim() {
  const [mode, setMode] = useState<Mode>('tides');
  const [dE, setDE] = useState(60); // Moon distance, Earth radii
  const [arrows, setArrows] = useState(true);
  const [d, setD] = useState(3.2); // moon orbit, planet radii
  const [rho, setRho] = useState(1); // moon density ÷ planet density
  const [t, setT] = useState(0);
  const [shredT, setShredT] = useState<number | null>(null);
  const visRef = useRef<HTMLDivElement>(null);
  useRaf((dt) => setT((c) => c + dt), true, visRef);

  const dRoche = 2.44 * Math.pow(1 / rho, 1 / 3);
  const inside = d < dRoche;

  // ---------------- tides
  const tideScale = Math.pow(60 / dE, 3); // relative to today's Moon
  const ER = 70;
  const ex = 170;
  const ey = 190;
  const moonX = Math.min(W - 30, ex + 90 + (dE - 10) * 5.4);
  const bulge = Math.min(46, 9 * tideScale);
  const spin = (t * 2 * Math.PI) / 8; // one "day" every 8 s
  const townAng = spin;
  const tideAt = (ang: number) => Math.cos(2 * ang); // +1 at the two bulges
  const highs = 2;

  // ---------------- roche
  const PR = 40; // planet radius, px
  const px0 = 280;
  const py0 = 190;
  const KR = PR; // px per planet radius
  const om = (r: number) => Math.pow(r, -1.5); // angular speed (G M = 1, R_p = 1), per time unit
  const TU = 1.4; // time units per real second
  const tu = t * TU;
  const moonAng = om(d) * tu;
  const rMoon = 0.22; // moon radius in planet radii (exaggerated for visibility)
  const pieces = useMemo(() => {
    return PIECES.map((p, i) => {
      // position in the moon's frame (x towards the planet... radial outward), in planet radii
      const rx = p.x * rMoon;
      const ry = p.y * rMoon;
      // pieces furthest along the planet line go first
      const order = 1 - Math.abs(p.x);
      return { rx, ry, delay: order * 6 + (i % 5) * 0.3 };
    });
  }, []);

  const resetShred = () => setShredT(null);
  if (mode === 'roche' && inside && shredT === null) setShredT(tu);
  if (mode === 'roche' && !inside && shredT !== null) setShredT(null);

  const tideVis = (
    <SpacePanel w={W} h={H} ariaLabel={`Tides raised by a moon ${dE} Earth radii away.`} tags={['Tide height hugely exaggerated', 'One day every 8 s']} tagsAt="tl" stars={70}>
      <line x1={ex} x2={moonX} y1={ey} y2={ey} stroke={Q.s} strokeDasharray="3 5" opacity={0.5} />
      <text x={(ex + moonX) / 2} y={ey - 8} textAnchor="middle" className="plot-note" fill={Q.s}>
        {dE} Earth radii
      </text>
      <ellipse cx={ex} cy={ey} rx={ER + bulge} ry={ER - bulge / 2} fill="rgba(80,150,230,0.35)" stroke="#7fb0e6" />
      <circle cx={ex} cy={ey} r={ER - 4} fill="#2a5a3a" stroke="#4d8a5e" />
      <circle cx={moonX} cy={ey} r={10} fill="#bdbdbd" />
      <text x={moonX} y={ey + 26} textAnchor="middle" className="plot-note" fill="var(--text-2)">
        Moon
      </text>
      {arrows &&
        Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * 2 * Math.PI;
          const sx = ex + ER * Math.cos(a);
          const sy = ey - ER * Math.sin(a);
          // tidal acceleration ∝ (2 cos a, −sin a) in the Moon-aligned frame
          const k = 22 * Math.min(2.5, tideScale);
          return <Vec key={i} x1={sx} y1={sy} x2={sx + 2 * Math.cos(a) * k} y2={sy + Math.sin(a) * k} color={Q.F} width={2} head={7} />;
        })}
      {/* a town on the rotating Earth */}
      <circle cx={ex + (ER + 2) * Math.cos(townAng)} cy={ey - (ER + 2) * Math.sin(townAng)} r={5} fill="#ffd28a" stroke="#fff" />
      <g transform={`translate(${W - 200} ${H - 70})`}>
        <rect x={0} y={-30} width={185} height={60} rx={6} fill="rgba(5,7,11,0.75)" stroke="rgba(255,255,255,0.12)" />
        <text x={8} y={-14} className="plot-note" fill="var(--text-2)">
          sea level at the town, over a day
        </text>
        <path d={Array.from({ length: 61 }, (_, i) => `${i ? 'L' : 'M'}${8 + i * 2.8},${12 - 12 * tideAt((i / 60) * 2 * Math.PI)}`).join('')} fill="none" stroke="#7fb0e6" strokeWidth={1.6} />
        <circle cx={8 + ((((townAng % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI)) * 168} cy={12 - 12 * tideAt(townAng)} r={4} fill="#ffd28a" />
      </g>
    </SpacePanel>
  );

  const since = shredT === null ? 0 : tu - shredT;
  const rocheVis = (
    <SpacePanel w={W} h={H} ariaLabel={inside ? 'Inside the Roche limit: the moon is coming apart.' : 'Outside the Roche limit: the moon holds together.'} tags={['Moon drawn 5× too big', inside ? 'Inside the Roche limit' : 'Outside the Roche limit']} tagsAt="tl" stars={70}>
      <circle cx={px0} cy={py0} r={dRoche * KR} fill="rgba(242,201,76,0.05)" stroke={Q.s} strokeDasharray="5 5" opacity={0.8} />
      <text x={px0 + dRoche * KR * 0.71 + 4} y={py0 - dRoche * KR * 0.71 - 4} className="plot-note" fill={Q.s}>
        Roche limit
      </text>
      <circle cx={px0} cy={py0} r={d * KR} fill="none" stroke={TRAIL} strokeOpacity={0.25} />
      <circle cx={px0} cy={py0} r={PR} fill="#c9a27a" stroke="#e3cf8f" />
      <text x={px0} y={py0 + 4} textAnchor="middle" className="plot-note" fill="#3a2a1a" fontWeight={700}>
        planet
      </text>
      {pieces.map((p, i) => {
        const released = inside && since > p.delay;
        // radial distance and angle of this piece about the planet
        const r = d + p.rx;
        let ang = moonAng + p.ry / d;
        if (released && shredT !== null) {
          const tRel = shredT + p.delay;
          ang = om(d) * tRel + p.ry / d + om(r) * (tu - tRel);
        }
        const x = px0 + r * KR * Math.cos(ang);
        const y = py0 - r * KR * Math.sin(ang);
        return <circle key={i} cx={x} cy={y} r={2.6} fill={released ? '#bdbdbd' : '#d8d8d8'} opacity={released ? 0.85 : 1} />;
      })}
      {!inside &&
        arrows &&
        [0, Math.PI].map((a) => {
          const cx = px0 + d * KR * Math.cos(moonAng);
          const cy = py0 - d * KR * Math.sin(moonAng);
          const dir = moonAng + a;
          const L = 30 * Math.min(2, Math.pow(3 / d, 3));
          const sx = cx + rMoon * KR * Math.cos(dir);
          const sy = cy - rMoon * KR * Math.sin(dir);
          return <Vec key={a} x1={sx} y1={sy} x2={sx + L * Math.cos(dir)} y2={sy - L * Math.sin(dir)} color={Q.F} width={2.2} head={7} />;
        })}
    </SpacePanel>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Segmented<Mode>
          size="sm"
          label="Show"
          value={mode}
          onChange={(m) => {
            setMode(m);
            resetShred();
          }}
          options={[
            { value: 'tides', label: "The Earth's tides" },
            { value: 'roche', label: 'A moon too close' },
          ]}
        />
        {mode === 'tides' ? (
          <Slider label="Moon's distance" tex="\qs{d}" tip="in Earth radii; today it is about 60" value={dE} min={20} max={120} step={1} format={(v) => `${v} Earth radii`} onChange={setDE} />
        ) : (
          <>
            <Slider label="moon's orbit" tex="\qs{d}" tip="distance from the planet's centre, in planet radii" value={d} min={1.3} max={4.5} step={0.01} format={(v) => `${v.toFixed(2)} radii`} onChange={setD} />
            <Slider label="moon's density ÷ planet's" tex="\rho_m/\rho_P" tip="denser moons hold together closer in" value={rho} min={0.3} max={3} step={0.01} sig={3} onChange={setRho} />
            <Button size="sm" onClick={() => { setD(3.2); resetShred(); }}>
              Rebuild the moon
            </Button>
          </>
        )}
        <Toggle checked={arrows} onChange={setArrows} label="Show the stretching (tidal) force" />
      </div>
      <div className="ctl-group">
        <Readouts min={140}>
          {mode === 'tides' ? (
            <>
              <Readout label="tide strength" tip="compared with today's Moon" value={tideScale} unit="× today" sig={3} />
              <Readout label="high tides per day" value={highs} sig={1} />
            </>
          ) : (
            <>
              <Readout tex="\qs{d_R}" tip="Roche limit for a fluid moon of this density" value={dRoche} unit="radii" sig={3} />
              <Readout label="the moon" text={inside ? 'breaking up' : 'holding together'} tone={inside ? 'bad' : 'ok'} />
            </>
          )}
        </Readouts>
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="The stretch: a difference in pulls"
          tex="\Delta\qa{a} \approx \frac{2\,G\qm{M}\,\qs{r}}{\qs{d}^{3}}"
          say="The pull on the near side minus the pull on the centre. It grows with the size of the body being stretched and falls off with the **cube** of the distance: twice as far, an eighth of the tide."
          where={[
            ['\\Delta\\qa{a}', 'the stretching acceleration across the body (m/s²)'],
            ['\\qm{M}', 'mass of the body doing the pulling'],
            ['\\qs{r}', 'radius of the body being stretched'],
            ['\\qs{d}', 'distance between their centres'],
          ]}
          live={mode === 'tides' ? `\\text{Moon at } \\qs{${dE}} \\text{ Earth radii:}\\ ${num(tideScale, 2)} \\times \\text{today's tides}` : null}
        />
        <Formula
          title="The Roche limit"
          tex="\qs{d_R} \approx 2.44\,\qs{R_P}\left(\frac{\rho_P}{\rho_m}\right)^{1/3}"
          say="Closer than this, the planet's stretch beats a loose moon's own gravity and it comes apart. Denser moons can survive closer in. (Solid rock, held together by its own strength, can survive a little inside.)"
          where={[
            ['\\qs{d_R}', 'the Roche limit, measured from the planet’s centre'],
            ['\\qs{R_P}', 'the planet’s radius'],
            ['\\rho_P,\\ \\rho_m', 'the densities (mass per volume) of the planet and the moon'],
          ]}
          live={mode === 'roche' ? `\\qs{d_R} = 2.44 \\times (1/${num(rho, 2)})^{1/3} = \\qs{${num(dRoche, 2)}}\\ \\text{planet radii}` : null}
        />
      </Formulas>
      <SimLayout visual={<div ref={visRef}>{mode === 'tides' ? tideVis : rocheVis}</div>} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="td-far"
          question="Why is there a high tide on the side of the Earth facing **away** from the Moon?"
          options={['The Moon pulls the far side least, so it gets left behind as the Earth is pulled towards the Moon', 'The Earth spins so fast the water is flung out', 'The Sun pulls that side', "There isn't one; it's the same bulge seen twice"]}
          answer={0}
          explain="The Moon pulls the near ocean most, the Earth's centre less, and the far ocean least. Relative to the centre, the near water is pulled towards the Moon and the far water is *left behind*: two bulges, on opposite sides. The Earth turns under both every day, so most coasts get two high tides about 12 h 25 min apart."
          tryIt="show the stretching force and look at the far side."
          onApply={() => {
            setMode('tides');
            setArrows(true);
          }}
        />
        <WhatIf
          id="td-sun"
          question="The Sun pulls on the Earth about 180 times harder than the Moon does. Whose tides are bigger?"
          options={["The Moon's, about twice the Sun's", "The Sun's, 180 times bigger", 'Equal', "The Sun's, about twice as big"]}
          answer={0}
          explain="Tides come from the *difference* in pull across the Earth, which falls with the cube of distance. The Sun is 390 times further away; $390^3$ outweighs its extra mass, leaving solar tides about 46 % of lunar ones. When Sun and Moon line up (full and new Moon) their tides add: **spring tides**. At right angles they partly cancel: **neap tides**."
        />
        <WhatIf
          id="td-ring"
          question="A rubble moon drifts inside the Roche limit. What becomes of it?"
          options={['It is pulled apart and smeared into a ring', 'It crashes straight into the planet', 'It speeds up and escapes', 'Nothing: gravity holds it together']}
          answer={0}
          explain="Loose pieces on its near and far sides are stretched away faster than the moon's gravity can hold them. Once free, each piece orbits at its own distance, and inner pieces go round faster than outer ones, so the debris shears out into a ring. Saturn's rings lie inside its Roche limit; its moons all orbit outside. Mars's moon Phobos is spiralling inwards and in about 30 to 50 million years should become a ring."
          tryIt="'A moon too close', then slide its orbit inside the dashed circle."
          onApply={() => {
            setMode('roche');
            setRho(1);
            setD(2.1);
          }}
        />
        <Challenge
          goal="With a moon **as dense as its planet** (ratio 1.00), find the closest orbit where it still holds together, within 0.05 planet radii of the limit."
          done={mode === 'roche' && Math.abs(rho - 1) < 0.02 && !inside && d - dRoche < 0.05}
          hint="Set the density ratio to 1, then creep the orbit inwards until the moon is just about to come apart."
          success={`${num(d, 2)} planet radii. Equal densities put the Roche limit at 2.44 planet radii: anything with the planet's density closer than that, and not held together by solid strength, becomes a ring.`}
        />
      </WhatIfs>
    </>
  );
}

export const tides: BlockDef = {
  id: 'tides',
  title: 'Tides and the Roche limit',
  hook: 'Why are there two high tides a day, and why do moons that wander too close get shredded into rings?',
  explain: `Gravity weakens with distance, so a moon pulls the near side of the Earth a little harder than the centre, and the centre harder than the far side. Take away the average pull (which just keeps the Earth in its orbit) and what's left is a **stretch** along the line to the Moon and a squeeze across it. The oceans respond: two bulges, one facing the Moon and one facing away, and the Earth turns under both every day.

The same stretch can destroy a moon. A moon held together only by its own gravity has a closest safe distance from its planet, the **Roche limit**. Inside it, the stretch beats the moon's self-gravity: loose rock is pulled off, and because inner pieces orbit faster than outer ones, the debris smears out into a **ring**.`,
  Sim: TidesSim,
  maths: [
    {
      title: 'Why the cube of the distance',
      body: `Gravity goes as $1/d^2$. The tide is the *difference* between the pull at $d - r$ and at $d$, over a short distance $r$: how fast $1/d^2$ changes with distance, times $r$. The rate of change of $1/d^2$ is $-2/d^3$ (a derivative, the slope from Medium's first block), so the difference is about $2GMr/d^3$. One extra power of distance, because a tide is a *change* in gravity rather than gravity itself.`,
    },
  ],
  deeper: `**Tides shape the Earth–Moon system.** Friction drags the tidal bulges slightly ahead of the Moon. Their pull speeds the Moon up, so it spirals outwards by 3.8 cm a year (measured with lasers bounced off mirrors left by Apollo crews), while the Earth's day lengthens by about 2 milliseconds per century.

**Shoemaker–Levy 9.** In 1992 a comet passed inside Jupiter's Roche limit and broke into more than 20 pieces strung out like pearls. Two years later they hit Jupiter one after another, leaving scars bigger than the Earth.

**Spaghettification.** Near a black hole the stretch can be enormous, because the tidal formula has a $d^3$ underneath and you can get very close to a very large mass. That's the next stop for tides, in Advanced.`,
  next: 'Gravity pulls, tides stretch. Now the biggest question of all about a gravity well: how fast must you go to never come back?',
};
