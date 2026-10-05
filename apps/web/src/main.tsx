import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Self-hosted (bundled by Vite, no external font request at runtime —
// this app is meant to work on a LAN with no internet dependency).
// Inter: UI chrome (nav, labels, buttons, tables). Literata: the writing
// boxes and the exported decision text — a text face built for sustained
// on-screen reading (Google Play Books), not a display/UI font, chosen
// because these boxes are where the judge reads and writes the most.
import '@fontsource-variable/inter';
import '@fontsource-variable/literata';
import '@fontsource-variable/literata/wght-italic.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
