import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles/tokens.css';
import './styles/base.css';
import { initTheme } from './styles/useTheme.ts';
import { initI18n } from './i18n/config.ts';
import { registerPwa } from './pwa.ts';
import { bootstrapContent } from './content/index.ts';
import { db } from './db/index.ts';

// Apply the persisted (or default `auto`) theme before first paint.
initTheme();

// Initialize i18n with the persisted (or system → EN) language before render.
initI18n();

// Register the service worker (app-shell precache, offline after first load).
registerPwa();

// Load the versioned content bundle into IndexedDB (SPEC §7.3). Non-blocking:
// it runs alongside first paint, and a fetch/load failure must not crash the
// shell (progress is untouched on failure).
void bootstrapContent(db).catch((err: unknown) => {
  console.error('content bootstrap failed', err);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
