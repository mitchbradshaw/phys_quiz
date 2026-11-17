import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './styles/theme.css';
import './styles/kit.css';
import './styles/site.css';
import { App } from './App';

// The level page scrolls to the linked block itself; stop the browser restoring an old position on top of that.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
