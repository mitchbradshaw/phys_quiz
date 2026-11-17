// Pieces every block uses: the formula shown three ways, tags on a visual, the what-if grid and the challenge.
import { Fragment, type ReactNode } from 'react';
import { Rich, TeX } from './Rich';
import { Callout, More } from './kit';

export interface FormulaProps {
  /** Small caps label, e.g. "Speed after t seconds". */
  title?: string;
  /** The formula in symbols; colour-link symbols with \ca{} ... \cf{}. */
  tex: string;
  /** The same formula read out in plain English (Rich). */
  say: string;
  /** The formula with the current numbers plugged in (TeX), recalculated as the sliders move. */
  live?: string | null;
  /** A short note under the live line (Rich). */
  liveNote?: string;
  /** What each symbol means: [symbol in TeX, meaning in Rich]. Every symbol in the formula should appear once. */
  where?: [string, string][];
}

export function Formula({ title, tex, say, live, liveNote, where }: FormulaProps) {
  return (
    <div className="formula">
      {title && <div className="formula-title">{title}</div>}
      <div className="formula-tex">
        <TeX display>{tex}</TeX>
      </div>
      <Rich className="formula-say" text={say} />
      {where && where.length > 0 && (
        <dl className="formula-where">
          {where.map(([sym, text]) => (
            <Fragment key={sym}>
              <dt>
                <TeX>{sym}</TeX>
              </dt>
              <dd>
                <Rich inline text={text} />
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
      {live && (
        <div className="formula-live">
          <span className="formula-live-tag">With your numbers</span>
          <TeX display>{live}</TeX>
          {liveNote && <Rich className="note" text={liveNote} />}
        </div>
      )}
    </div>
  );
}

export function Formulas({ children }: { children: ReactNode }) {
  return <div className="formulas">{children}</div>;
}

/** Small honest labels on a visual: "Sizes not to scale", "1 s here = 10 min". */
export function SimTags({ items }: { items: (string | false | null | undefined)[] }) {
  return (
    <div className="sim-tags">
      {items.filter(Boolean).map((t) => (
        <span key={t as string} className="sim-tag">
          {t}
        </span>
      ))}
    </div>
  );
}

export function WhatIfs({ children }: { children: ReactNode }) {
  return <div className="whatifs">{children}</div>;
}

/** "Can you…?": a goal the simulation checks for itself. Nothing is scored or saved. */
export function Challenge({ goal, done, hint, success }: { goal: string; done: boolean; hint?: string; success?: string }) {
  return (
    <div className={`challenge ${done ? 'is-done' : ''}`} aria-live="polite">
      <div className="challenge-tag">{done ? '✓ Done' : 'Can you…?'}</div>
      <Rich text={goal} />
      {done
        ? success && (
            <Callout kind="ok" title="Nailed it">
              <Rich text={success} />
            </Callout>
          )
        : hint && (
            <More label="Hint">
              <Rich text={hint} />
            </More>
          )}
    </div>
  );
}

/** Format a number for live TeX: fixed decimals, a real minus sign, brackets when negative (for products). */
export function num(x: number, dp = 1, bracketNeg = false): string {
  const v = Math.abs(x) < 0.5 * Math.pow(10, -dp) ? 0 : x;
  const s = v.toFixed(dp);
  return v < 0 && bracketNeg ? `(${s})` : s;
}

/** Scientific notation for TeX: 6.67 \times 10^{-11}. */
export function sci(x: number, sig = 3): string {
  if (x === 0 || !Number.isFinite(x)) return String(x);
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / Math.pow(10, e);
  const ms = Number(m.toPrecision(sig)).toString();
  if (e === 0) return ms;
  return `${ms} \\times 10^{${e}}`;
}
