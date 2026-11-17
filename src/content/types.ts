import type { ComponentType } from 'react';

export type LevelId = 'beginner' | 'medium' | 'advanced';

/** A collapsible extra under a block. Body is Rich text. */
export interface Extra {
  title: string;
  body: string;
}

/**
 * One block = one simulation, top to bottom:
 * hook → explanation → (Sim: formulas, simulation, what-ifs, challenge) → maths asides → go deeper → next.
 */
export interface BlockDef {
  /** Stable id, used in links: #/beginner/<id>. */
  id: string;
  title: string;
  /** The physicist's question this block answers (Rich). */
  hook: string;
  /** 3-6 plain sentences (Rich). */
  explain?: string;
  /** Formulas + simulation + what-ifs. Undefined while the block is still being built. */
  Sim?: ComponentType;
  /** "Maths aside" expanders, for the maths this block leans on. */
  maths?: Extra[];
  /** "Go deeper": history, real numbers, where the idea leads (Rich). */
  deeper?: string;
  /** Closing line that hands over to the next block (Rich). */
  next?: string;
}

export interface LevelDef {
  id: LevelId;
  title: string;
  /** Short description, e.g. "Motion and gravity". */
  subtitle: string;
  /** Where this sits in real study. */
  where: string;
  blocks: BlockDef[];
}
