// The three levels and their blocks, in story order. Blocks without a Sim show as "being built".
import { arrows } from '../blocks/beginner/Arrows';
import { energy } from '../blocks/beginner/Energy';
import { forces } from '../blocks/beginner/Forces';
import { motionGraphs } from '../blocks/beginner/MotionGraphs';
import { powersOfTen } from '../blocks/beginner/PowersOfTen';
import { projectiles } from '../blocks/beginner/Projectiles';
import { strandedAstronaut } from '../blocks/beginner/StrandedAstronaut';
import { newtonsCannon } from '../blocks/beginner/NewtonsCannon';
import type { BlockDef, LevelDef } from './types';

const soon = (id: string, title: string, hook: string): BlockDef => ({ id, title, hook });

export const LEVELS: LevelDef[] = [
  {
    id: 'beginner',
    title: 'Beginner',
    subtitle: 'motion and gravity',
    where: 'Senior high-school physics (the QCAA formula sheet’s “Linear motion and force” and “Gravity and motion”).',
    blocks: [
      powersOfTen,
      arrows,
      motionGraphs,
      forces,
      strandedAstronaut,
      energy,
      projectiles,
      soon('circles', 'Going in circles', 'If nothing is pushing a spinning thing outwards, what does the string actually do?'),
      soon('newtons-gravity', "Newton's gravity", 'When you jump, does the Earth move too?'),
      newtonsCannon,
      soon('kepler-three', "Kepler's third law: weighing the Sun", 'How can a stopwatch weigh a star?'),
    ],
  },
  {
    id: 'medium',
    title: 'Medium',
    subtitle: 'orbits, escape and relativity',
    where: 'First-year university physics and introductory astrophysics.',
    blocks: [
      soon('tiny-steps', 'How computers predict orbits', 'If gravity changes at every point of an orbit, how can anyone predict where a planet will be in a hundred years?'),
      soon('ellipses', 'Orbits are ellipses', 'Why are orbits stretched loops rather than circles, and what decides the stretch?'),
      soon('dancing-partners', 'Dancing partners', 'Does anything really orbit anything else?'),
      soon('hohmann', 'To catch up, slow down', 'Why does a spacecraft chasing another one in orbit have to brake to catch it?'),
      soon('gravity-assist', 'Gravity assists', 'How does a spacecraft steal speed from a planet, and who pays for it?'),
      soon('tides', 'Tides and the Roche limit', 'Why are there two high tides a day, and why do moons that wander too close get shredded into rings?'),
      soon('gravity-wells', 'Gravity wells and dark stars', 'How fast must you go to never come back, and what if the answer were the speed of light?'),
      soon('light-clock', 'The light clock', 'If everyone measures the same speed of light, whose clock is running slow?'),
      soon('spacetime', 'Space-time diagrams and the twin paradox', 'Why does the twin who travels come home younger, when each sees the other moving?'),
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced',
    subtitle: 'black holes',
    where: 'Postgraduate territory: general relativity and quantum effects near black holes, kept to what you can see and measure.',
    blocks: [
      soon('black-hole-anatomy', 'Anatomy of a black hole', 'What is actually at the edge of a black hole, and what happens to light that passes close by?'),
      soon('falling-in', 'Falling in', 'What would you see, and feel, falling into a black hole, and what would someone watching from far away see?'),
      soon('hawking-radiation', "Black holes aren't black", 'How can something nothing escapes from slowly evaporate?'),
    ],
  },
];
