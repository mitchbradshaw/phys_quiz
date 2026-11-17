import { href } from '../app/router';
import { LEVELS } from '../content/levels';
import { Rich } from '../ui/Rich';

const HOW: [string, string][] = [
  ['A question', 'worth asking, at the top of every block.'],
  ['The idea', 'in a few plain sentences.'],
  ['The formula, three ways', 'in symbols, in words, and with your numbers in it. Each symbol has one colour everywhere.'],
  ['The simulation', 'drag the sliders and watch the maths and the motion change together.'],
  ['What if…?', 'make a guess first, then watch what really happens.'],
];

export function Home() {
  return (
    <div>
      <section className="hero">
        <h1>From Apples to Black Holes</h1>
        <Rich
          className="lede"
          text="Everything that moves, from a dropped apple to a star falling into a black hole, follows a handful of rules. Each block here takes one of those rules, writes it down the way physicists do, and then hands it to you to play with. No background needed: every bit of maths is explained the first time it turns up."
        />
      </section>
      <div className="how">
        {HOW.map(([t, d]) => (
          <div key={t} className="how-step">
            <strong>{t}</strong>
            {d}
          </div>
        ))}
      </div>
      <div className="levels">
        {LEVELS.map((l) => (
          <section key={l.id} className="level-card">
            <h2>
              <a href={href(l.id)}>{l.title}</a>
            </h2>
            <div>{l.subtitle}</div>
            <div className="where">{l.where}</div>
            <ol>
              {l.blocks.map((b) => (
                <li key={b.id} className={b.Sim ? '' : 'is-soon'}>
                  {b.Sim ? <a href={href(l.id, b.id)}>{b.title}</a> : b.title}
                  {!b.Sim && <span className="soon">soon</span>}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
