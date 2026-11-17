// "What if…?": commit to a prediction, then watch the simulation do it. Nothing is scored or saved.
import { useMemo, useState } from 'react';
import { hashString, makeRng } from '../engine/rng';
import { Rich } from './Rich';
import { Button, Callout } from './kit';

export interface WhatIfProps {
  id: string;
  question: string;
  options: string[];
  /** Index of the correct option. */
  answer: number;
  explain: string;
  /** What to do in the sim to check it yourself. */
  tryIt?: string;
  /** Puts the simulation into the scenario ("Show me"). */
  onApply?: () => void;
  /** Keep the written option order (e.g. ordered numbers). Default: a shuffle seeded by id. */
  fixedOrder?: boolean;
}

export function WhatIf({ id, question, options, answer, explain, tryIt, onApply, fixedOrder }: WhatIfProps) {
  const order = useMemo(
    () => (fixedOrder ? options.map((_, i) => i) : makeRng(hashString(id)).shuffle(options.map((_, i) => i))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, options.length, fixedOrder]
  );
  const [pick, setPick] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="predict" aria-live="polite">
      <div className="predict-tag">What if…?</div>
      <Rich text={question} />
      <div className="predict-options" role="radiogroup" aria-label="Your prediction">
        {order.map((i) => {
          const state = revealed ? (i === answer ? 'is-right' : i === pick ? 'is-wrong' : '') : i === pick ? 'is-picked' : '';
          return (
            <button key={i} type="button" role="radio" aria-checked={pick === i} disabled={locked} className={`predict-opt ${state}`} onClick={() => setPick(i)}>
              <Rich text={options[i]} inline />
            </button>
          );
        })}
      </div>
      {!locked ? (
        <div className="row gap-s wrap">
          <Button variant="primary" size="sm" disabled={pick === null} onClick={() => setLocked(true)}>
            Lock in my guess
          </Button>
          {pick === null && <span className="muted small">Guess first, then watch it happen.</span>}
        </div>
      ) : !revealed ? (
        <div className="predict-next">
          {tryIt && <Rich text={`**Try it:** ${tryIt}`} />}
          <div className="row gap-s">
            {onApply && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  onApply();
                  setRevealed(true);
                }}
              >
                Show me
              </Button>
            )}
            <Button size="sm" onClick={() => setRevealed(true)}>
              Just tell me
            </Button>
          </div>
        </div>
      ) : (
        <Callout kind={pick === answer ? 'ok' : 'note'} title={pick === answer ? 'Spot on' : 'Not quite, and that’s the interesting part'}>
          <Rich text={explain} />
        </Callout>
      )}
    </div>
  );
}
