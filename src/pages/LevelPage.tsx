// One level = one scrolling page of blocks in story order, with a contents list that stays in view.
import { useEffect, useState } from 'react';
import { href } from '../app/router';
import { LEVELS } from '../content/levels';
import type { BlockDef, LevelDef } from '../content/types';
import { More } from '../ui/kit';
import { Rich } from '../ui/Rich';

function scrollToBlock(id: string | null) {
  if (!id) {
    window.scrollTo({ top: 0 });
    return;
  }
  document.getElementById(`b-${id}`)?.scrollIntoView({ block: 'start' });
}

function Block({ level, block, n, nextBlock }: { level: LevelDef; block: BlockDef; n: number; nextBlock?: BlockDef }) {
  const Sim = block.Sim;
  return (
    <section className="block" id={`b-${block.id}`} data-block={block.id} aria-labelledby={`h-${block.id}`}>
      <div className="block-kicker">
        {level.title} · {n}
      </div>
      <h2 id={`h-${block.id}`}>{block.title}</h2>
      <Rich className="hook" text={block.hook} />
      {Sim ? (
        <>
          {block.explain && <Rich className="block-explain" text={block.explain} />}
          <Sim />
          {(block.maths?.length || block.deeper) && (
            <div className="block-extras">
              {block.maths?.map((m) => (
                <More
                  key={m.title}
                  label={
                    <>
                      <span className="more-kind">Maths aside</span>
                      {m.title}
                    </>
                  }
                >
                  <Rich text={m.body} />
                </More>
              ))}
              {block.deeper && (
                <More
                  label={
                    <>
                      <span className="more-kind">Go deeper</span>
                      where this leads
                    </>
                  }
                >
                  <Rich text={block.deeper} />
                </More>
              )}
            </div>
          )}
          {(block.next || nextBlock) && (
            <div className="block-next">
              {block.next && <Rich text={block.next} inline />}
              {nextBlock && <a href={href(level.id, nextBlock.id)}>Next: {nextBlock.title} →</a>}
            </div>
          )}
        </>
      ) : (
        <div className="block-soon">This block is still being built.</div>
      )}
    </section>
  );
}

export function LevelPage({ level, blockId }: { level: LevelDef; blockId: string | null }) {
  const [active, setActive] = useState<string | null>(blockId);

  useEffect(() => {
    scrollToBlock(blockId);
  }, [level.id, blockId]);

  // Highlight the block being read: the last one whose top has scrolled past the header.
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        let cur: string | null = level.blocks[0]?.id ?? null;
        for (const b of level.blocks) {
          const el = document.getElementById(`b-${b.id}`);
          if (el && el.getBoundingClientRect().top < 160) cur = b.id;
        }
        setActive(cur);
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => {
      window.removeEventListener('scroll', on);
      cancelAnimationFrame(raf);
    };
  }, [level]);

  const others = LEVELS.filter((l) => l.id !== level.id);
  return (
    <div className="level">
      <nav className="toc" aria-label={`${level.title} blocks`}>
        <h4>{level.title}</h4>
        <ol>
          {level.blocks.map((b) => (
            <li key={b.id}>
              <a
                href={href(level.id, b.id)}
                className={`${active === b.id ? 'is-on' : ''} ${b.Sim ? '' : 'is-soon'}`}
                onClick={() => {
                  if (blockId === b.id) scrollToBlock(b.id);
                }}
              >
                <span>{b.title}</span>
              </a>
            </li>
          ))}
        </ol>
        <div className="toc-levels">
          {others.map((l) => (
            <a key={l.id} href={href(l.id)}>
              {l.title} →
            </a>
          ))}
        </div>
      </nav>
      <div>
        <header className="level-head">
          <h1>
            {level.title}: {level.subtitle}
          </h1>
          <div className="where">{level.where}</div>
        </header>
        {level.blocks.map((b, i) => (
          <Block key={b.id} level={level} block={b} n={i + 1} nextBlock={level.blocks[i + 1]} />
        ))}
      </div>
    </div>
  );
}
