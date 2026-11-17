// The three levels and their blocks, in story order. Blocks without a Sim show as "being built".
import { anatomy } from '../blocks/advanced/Anatomy';
import { arrows } from '../blocks/beginner/Arrows';
import { circles } from '../blocks/beginner/Circles';
import { energy } from '../blocks/beginner/Energy';
import { forces } from '../blocks/beginner/Forces';
import { kepler } from '../blocks/beginner/Kepler';
import { motionGraphs } from '../blocks/beginner/MotionGraphs';
import { powersOfTen } from '../blocks/beginner/PowersOfTen';
import { projectiles } from '../blocks/beginner/Projectiles';
import { strandedAstronaut } from '../blocks/beginner/StrandedAstronaut';
import { dancingPartners } from '../blocks/medium/DancingPartners';
import { ellipses } from '../blocks/medium/Ellipses';
import { gravityAssist } from '../blocks/medium/GravityAssist';
import { gravityWells } from '../blocks/medium/GravityWells';
import { lightClock } from '../blocks/medium/LightClock';
import { spacetime } from '../blocks/medium/Spacetime';
import { hohmann } from '../blocks/medium/Hohmann';
import { tides } from '../blocks/medium/Tides';
import { tinySteps } from '../blocks/medium/TinySteps';
import { newtonsCannon } from '../blocks/beginner/NewtonsCannon';
import { newtonsGravity } from '../blocks/beginner/NewtonsGravity';
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
      circles,
      newtonsGravity,
      newtonsCannon,
      kepler,
    ],
  },
  {
    id: 'medium',
    title: 'Medium',
    subtitle: 'orbits, escape and relativity',
    where: 'First-year university physics and introductory astrophysics.',
    blocks: [
      tinySteps,
      ellipses,
      dancingPartners,
      hohmann,
      gravityAssist,
      tides,
      gravityWells,
      lightClock,
      spacetime,
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced',
    subtitle: 'black holes',
    where: 'Postgraduate territory: general relativity and quantum effects near black holes, kept to what you can see and measure.',
    blocks: [
      anatomy,
      soon('falling-in', 'Falling in', 'What would you see, and feel, falling into a black hole, and what would someone watching from far away see?'),
      soon('hawking-radiation', "Black holes aren't black", 'How can something nothing escapes from slowly evaporate?'),
    ],
  },
];
