// Advanced 3: Black holes aren't black. Hawking radiation: a black hole glows like a hot body at a temperature that
// rises as its mass falls, so small ones blaze and evaporate while big ones are colder than the cosmic background.
// Temperature, peak wavelength, power and lifetime (photons-only estimate), with the 2.7 K microwave background
// and the age of the universe as yardsticks. Colours: mass green, time purple, energy/temperature pink.
import { useState } from 'react';
import type { BlockDef } from '../../content/types';
import { c, G } from '../../physics/constants';
import { MSUN, schwarzschild } from '../../physics/blackhole';
import { Dot, HLine, Line, Plot, sample } from '../../plot/Plot';
import { Challenge, Formula, Formulas, num, sci, WhatIfs } from '../../ui/blockkit';
import { Q } from '../../ui/colors';
import { Readout, Readouts, Segmented, SimLayout, Slider } from '../../ui/kit';
import { SpacePanel } from '../../ui/svg';
import { WhatIf } from '../../ui/WhatIf';

const HBAR = 1.0546e-34;
const KB = 1.381e-23;
const WIEN = 2.898e-3;
const YEAR = 3.156e7;
const AGE = 13.8e9; // years
const T_CMB = 2.725;
const tempOf = (M: number) => (HBAR * c ** 3) / (8 * Math.PI * G * M * KB);
const powerOf = (M: number) => (HBAR * c ** 6) / (15360 * Math.PI * G * G * M * M);
const lifeYears = (M: number) => (5120 * Math.PI * G * G * M ** 3) / (HBAR * c ** 4) / YEAR;
const L_MIN = 8;
const L_MAX = 40;

const PRESETS = [
  { id: 'mountain', label: 'A mountain', M: 1e12 },
  { id: 'moon', label: 'The Moon', M: 7.35e22 },
  { id: 'sun', label: 'The Sun', M: MSUN },
  { id: 'sgr', label: 'Sgr A*', M: 4.3e6 * MSUN },
] as const;
type PresetId = (typeof PRESETS)[number]['id'];

function band(lam: number) {
  if (lam > 1e-3) return 'radio waves';
  if (lam > 7e-7) return 'infrared';
  if (lam > 4e-7) return 'visible light';
  if (lam > 1e-8) return 'ultraviolet';
  if (lam > 1e-11) return 'X-rays';
  return 'gamma rays';
}
/**
 * Temperature-scale colour, like a thermal camera (not the colour you'd actually see): blue when colder than the
 * 2.7 K microwave sky, white near it, red when hotter, deeper the further from 2.7 K.
 */
const heatPos = (T: number) => Math.max(-1, Math.min(1, Math.log10(T / T_CMB) / 14));
function heat(T: number) {
  const p = heatPos(T);
  const k = Math.abs(p);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * k);
  return p < 0 ? `rgb(${mix(235, 61)},${mix(240, 123)},${mix(255, 255)})` : `rgb(${mix(255, 255)},${mix(240, 59)},${mix(235, 47)})`;
}
const fmtYears = (y: number) => (y < 1 / YEAR ? `${sci(y * YEAR, 2)}\\ \\text{s}` : y < 1 ? `${num(y * 365.25, 1)}\\ \\text{days}` : `${sci(y, 2)}\\ \\text{years}`);
const plain = (texSci: string) => texSci.replace(' \\times 10^{', ' × 10^').replace('}', '').replace(/\\ \\text\{([^}]*)\}/, ' $1');

function HawkingSim() {
  const [lm, setLm] = useState(Math.log10(MSUN));
  const M = Math.pow(10, lm);
  const T = tempOf(M);
  const lam = WIEN / T;
  const P = powerOf(M);
  const life = lifeYears(M);
  const rs = schwarzschild(M);
  const growing = T < T_CMB;
  const tempLine = sample((l) => Math.log10(tempOf(Math.pow(10, l))), L_MIN, L_MAX, 2);
  const lifeLine = sample((l) => Math.log10(lifeYears(Math.pow(10, l))), L_MIN, L_MAX, 2);
  const now = Math.abs(Math.log10(life / AGE)) < Math.log10(1.5);

  const visual = (
    <div className="plot-stack">
      <SpacePanel w={560} h={190} ariaLabel={`Black hole of ${M.toExponential(2)} kg at ${T.toExponential(2)} K.`} tags={['Size not to scale']} tagsAt="tr" stars={70}>
        <defs>
          <linearGradient id="hawking-heat" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgb(61,123,255)" />
            <stop offset="50%" stopColor="rgb(235,240,255)" />
            <stop offset="100%" stopColor="rgb(255,59,47)" />
          </linearGradient>
        </defs>
        <circle cx={130} cy={100} r={70} fill={heat(T)} opacity={0.35} />
        <circle cx={130} cy={100} r={52} fill={heat(T)} opacity={0.7} />
        <circle cx={130} cy={100} r={40} fill="#000" />
        <text x={230} y={56} fontSize={13} fontWeight={700} fill="var(--text)">
          {T >= 1e4 || T < 1e-2 ? `${plain(sci(T, 3))} K` : `${num(T, T < 10 ? 2 : 0)} K`}
        </text>
        <text x={230} y={76} className="plot-note" fill="var(--text-2)">
          peak glow: {band(lam)} ({lam > 1 ? `${num(lam / 1000 >= 1 ? lam / 1000 : lam, 1)} ${lam / 1000 >= 1 ? 'km' : 'm'}` : `${plain(sci(lam, 2))} m`} wavelength)
        </text>
        <text x={230} y={96} className="plot-note" fill="var(--text-2)">
          horizon radius: {rs < 1e-6 ? `${plain(sci(rs, 2))} m` : rs < 1 ? `${num(rs * 1000, 2)} mm` : rs < 1e4 ? `${num(rs, 1)} m` : `${num(rs / 1000, 0)} km`}
        </text>
        <text x={230} y={124} className="plot-note" fill={growing ? '#7fb0e6' : '#ffb46b'} fontWeight={700}>
          {growing ? 'colder than the 2.7 K microwave sky: it absorbs more than it emits, and grows' : 'hotter than the microwave sky: it is slowly evaporating'}
        </text>
        <rect x={230} y={146} width={300} height={10} rx={3} fill="url(#hawking-heat)" />
        <line x1={380 + heatPos(T) * 150} x2={380 + heatPos(T) * 150} y1={141} y2={161} stroke="#fff" strokeWidth={2} />
        <text x={230} y={174} className="plot-note" fill="rgb(120,160,255)">
          colder
        </text>
        <text x={380} y={174} textAnchor="middle" className="plot-note" fill="var(--text-2)">
          2.7 K
        </text>
        <text x={530} y={174} textAnchor="end" className="plot-note" fill="rgb(255,110,100)">
          hotter
        </text>
        <text x={230} y={138} className="plot-note" fill="var(--text-3)">
          colour = temperature scale (like a thermal camera)
        </text>
      </SpacePanel>
      <div className="plot-caption">
        <b style={{ color: Q.E }}>Temperature</b> against <b style={{ color: Q.m }}>mass</b> (both on powers-of-ten scales). Dashed: the microwave background, 2.7 K.
      </div>
      <Plot x={{ min: L_MIN, max: L_MAX, label: 'mass (kg), as a power of ten', format: (v) => `10^${v}` }} y={{ min: -18, max: 16, label: 'temperature (K), power of ten', format: (v) => `${v}` }} height={150} ariaLabel="Hawking temperature against mass">
        <HLine y={Math.log10(T_CMB)} label="2.7 K" />
        <Line points={tempLine} color={Q.E} width={2.5} />
        <Dot x={lm} y={Math.log10(T)} color={Q.E} />
      </Plot>
      <div className="plot-caption">
        <b style={{ color: Q.t }}>Lifetime</b> before evaporating, in years. Dashed: the age of the universe.
      </div>
      <Plot x={{ min: L_MIN, max: L_MAX, label: 'mass (kg), as a power of ten', format: (v) => `10^${v}` }} y={{ min: -5, max: 105, label: 'lifetime (years), power of ten', format: (v) => `${v}` }} height={150} ariaLabel="Evaporation time against mass">
        <HLine y={Math.log10(AGE)} label="age of the universe" />
        <Line points={lifeLine} color={Q.t} width={2.5} />
        <Dot x={lm} y={Math.log10(life)} color={Q.t} />
      </Plot>
    </div>
  );

  const controls = (
    <>
      <div className="ctl-group">
        <Segmented<PresetId>
          size="sm"
          label="Mass of"
          value={(PRESETS.find((p) => Math.abs(Math.log10(p.M) - lm) < 0.01)?.id ?? 'sun') as PresetId}
          onChange={(id) => setLm(Math.log10(PRESETS.find((p) => p.id === id)?.M ?? MSUN))}
          options={PRESETS.map((p) => ({ value: p.id, label: p.label }))}
        />
        <Slider label="black hole's mass" tex="\qm{M}" tip="from a large asteroid to a giant galaxy-centre black hole" value={lm} min={L_MIN} max={L_MAX} step={0.01} format={(v) => `${plain(sci(Math.pow(10, v), 2))} kg`} onChange={setLm} />
      </div>
      <div className="ctl-group">
        <Readouts min={150}>
          <Readout tex="\qe{T}" tip="Hawking temperature" value={T} unit="K" sig={3} />
          <Readout label="power given off" tip="as light (photons only)" value={P} unit="W" sig={3} />
          <Readout tex="\qt{t_{\text{life}}}" tip="time to evaporate completely (photons-only estimate)" value={life} unit="years" sig={3} tone={now ? 'ok' : undefined} />
          <Readout label="lifetime ÷ age of universe" value={life / AGE} sig={3} />
        </Readouts>
      </div>
    </>
  );

  return (
    <>
      <Formulas>
        <Formula
          title="Hawking temperature"
          tex="\qe{T} = \frac{\hbar\,c^{3}}{8\pi\,G\,\qm{M}\,k_B}"
          say="A black hole glows as if it were a hot object at this temperature. Note $M$ is on the *bottom*: the lighter the black hole, the hotter it is. This formula contains $\hbar$ (quantum mechanics), $c$ (relativity), $G$ (gravity) and $k_B$ (heat): all of physics at once."
          where={[
            ['\\qe{T}', 'the temperature of the glow (kelvin)'],
            ['\\hbar', "the reduced Planck constant, $1.05 \\times 10^{-34}$ J s: the scale of quantum effects"],
            ['k_B', "Boltzmann's constant, $1.38 \\times 10^{-23}$ J/K: converts energy to temperature"],
            ['\\qm{M}', "the black hole's mass"],
          ]}
          live={`\\qe{T} = \\qe{${sci(T, 3)}}\\ \\text{K}`}
          liveNote={`Its glow peaks in ${band(lam)}.`}
        />
        <Formula
          title="Evaporation time"
          tex="\qt{t_{\text{life}}} \approx \frac{5120\,\pi\,G^{2}\qm{M}^{3}}{\hbar\,c^{4}}"
          say="Losing energy means losing mass, which makes it hotter, which makes it lose energy faster: a runaway that ends in a final flash. The lifetime grows as mass **cubed**: double the mass, eight times as long."
          where={[['\\qt{t_{\\text{life}}}', 'time to evaporate completely, if nothing falls in (counting light only; other particles shorten it a little)']]}
          live={`\\qt{t_{\\text{life}}} \\approx \\qt{${fmtYears(life)}}`}
        />
      </Formulas>
      <SimLayout visual={visual} controls={controls} />
      <WhatIfs>
        <WhatIf
          id="hr-sun"
          question="A black hole with the Sun's mass: how hot is its Hawking glow?"
          options={['About 60 billionths of a degree above absolute zero', 'About as hot as the Sun', 'Millions of degrees', 'Exactly absolute zero']}
          answer={0}
          explain="About $6 \times 10^{-8}$ K, far colder than the 2.7 K microwave glow left over from the Big Bang. So today it absorbs more than it emits: every real black hole in the sky is growing, not shrinking. Hawking radiation only wins once the universe has cooled far below the black hole's own temperature, many billions of years from now."
          tryIt="pick 'The Sun'."
          onApply={() => setLm(Math.log10(MSUN))}
        />
        <WhatIf
          id="hr-small"
          question="As a black hole evaporates and shrinks, what happens to its temperature?"
          options={['It rises, faster and faster, ending in a flash', 'It falls, until it fades out', 'It stays the same', 'It drops to absolute zero']}
          answer={0}
          explain="Temperature goes as $1/M$, so losing mass heats it up, which speeds up the loss. In the last second of its life, a black hole radiates with the power of millions of hydrogen bombs. Hawking titled his 1974 paper 'Black hole explosions?'."
          tryIt="slide the mass down from a mountain towards the left edge."
          onApply={() => setLm(12)}
        />
        <WhatIf
          id="hr-primordial"
          question="Could tiny black holes, made in the Big Bang, be exploding right now?"
          options={['Possibly: ones born with about a mountain’s mass would be ending about now, but no flash has been seen yet', 'No: black holes never evaporate', 'Yes, we see them every day', 'Only if they collide']}
          answer={0}
          explain="A black hole starting near $10^{11}$ to $10^{12}$ kg (a mountain's mass, packed into less than an atomic nucleus) would take about the age of the universe to evaporate. Gamma-ray telescopes have searched for the final flashes and found none so far, which limits how many such 'primordial' black holes there can be."
          tryIt="find the mass whose lifetime crosses the dashed line."
          onApply={() => setLm(11.3)}
        />
        <Challenge
          goal="Find the mass of a black hole that would be **finishing its evaporation right now**, 13.8 billion years after the Big Bang (lifetime within 50 % of that)."
          done={now}
          hint="Watch 'lifetime ÷ age of universe' and aim for 1.00. Lifetime grows as mass cubed, so you need a delicate touch: click the value to type a mass."
          success={`About ${plain(sci(M, 2))} kg, a little less than a mountain, in a horizon ${plain(sci(rs, 2))} m across, about a tenth of the size of a proton. (Counting the other particles it can emit, the real answer is about 5 × 10^11 kg.)`}
        />
      </WhatIfs>
    </>
  );
}

export const hawkingRadiation: BlockDef = {
  id: 'hawking-radiation',
  title: "Black holes aren't black",
  hook: 'How can something nothing escapes from slowly evaporate?',
  explain: `General relativity says nothing comes out of a black hole. In 1974 Stephen Hawking added quantum mechanics and found that something does: a black hole glows, like any warm object, with a temperature set by its mass. Heavier black holes are *colder*. One with the Sun's mass sits at 60 billionths of a degree above absolute zero; one with a mountain's mass, packed into a region smaller than a proton, blazes at a hundred billion degrees.

The glow carries away energy, and energy is mass ($E = mc^2$), so the black hole slowly shrinks, gets hotter and shrinks faster, ending in a burst. For any black hole we know of, this takes unimaginably long: about $10^{67}$ years for a Sun-mass one, far beyond today's age of the universe, 13.8 billion years. But it means black holes, like everything else, don't last forever.`,
  Sim: HawkingSim,
  maths: [
    {
      title: 'Why smaller means hotter',
      body: `Hawking radiation is made of waves whose size is set by the horizon: roughly, the typical wavelength is a few times $r_s$. A smaller horizon means shorter wavelengths, which means more energetic light: a hotter glow. Since $r_s \\propto M$, the temperature goes as $1/M$. And the power (energy per second) from a glowing surface goes as $T^4 \\times$ area $\\propto M^{-4} \\times M^2 = M^{-2}$; the time to radiate away a mass $M$ is then $\\propto M / M^{-2} = M^3$.`,
    },
  ],
  deeper: `**The popular picture, and its limits.** Hawking himself described it this way: empty space constantly produces pairs of "virtual" particles that briefly appear and annihilate; at the horizon, one may fall in while its partner escapes, carrying energy away. It's a useful image, but the real derivation is about how quantum fields behave in curved space-time, and the "pairs" shouldn't be taken literally.

**Entropy and the information paradox.** Jacob Bekenstein had argued (1972) that a black hole must have entropy proportional to its horizon's *area*; Hawking's temperature made it precise. That raises the deepest open question about black holes: if a black hole evaporates into featureless heat, what happened to all the information about what fell in? Quantum mechanics says information is never destroyed. Resolving this "information paradox" is a driving problem for theories of quantum gravity today.

**Hawking radiation has never been observed** from a real black hole: those we know of are far too cold. Physicists have seen analogous effects in lab "sonic black holes" made of flowing fluids and ultracold atoms.`,
  next: "That's the end of the road for now: from an apple's fall to a black hole's last flash, with the same handful of ideas. Each block's 'Go deeper' points to where they lead next.",
};
