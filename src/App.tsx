import { useEffect } from 'react';
import { href, useRoute } from './app/router';
import { setTheme, useTheme } from './app/settings';
import { LEVELS } from './content/levels';
import { Home } from './pages/Home';
import { LevelPage } from './pages/LevelPage';

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="10.5" ry="4" fill="none" stroke="var(--accent)" strokeWidth="1.4" transform="rotate(-24 12 12)" />
      <circle cx="12" cy="12" r="4.6" fill="var(--m2)" />
      <circle cx="20.6" cy="8.2" r="1.6" fill="var(--text)" />
    </svg>
  );
}

export function App() {
  const route = useRoute();
  const theme = useTheme();
  const level = LEVELS.find((l) => l.id === route.level);
  useEffect(() => {
    document.title = level ? `${level.title}: ${level.subtitle} · From Apples to Black Holes` : 'From Apples to Black Holes';
  }, [level]);
  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/">
          <BrandMark /> From Apples to Black Holes
        </a>
        <nav className="nav" aria-label="Levels">
          {LEVELS.map((l) => (
            <a key={l.id} className={`nav-link ${level?.id === l.id ? 'is-on' : ''}`} href={href(l.id)}>
              {l.title}
            </a>
          ))}
        </nav>
        <div className="topbar-right">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
            aria-label={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>
      <main className="main">{level ? <LevelPage level={level} blockId={route.block} /> : <Home />}</main>
      <footer className="footer">
        <p>Constants and notation follow the QCAA Physics 2025 formula and data book. The numbers are real; pictures say so when they are not to scale.</p>
      </footer>
    </>
  );
}
