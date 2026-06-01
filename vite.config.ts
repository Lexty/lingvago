/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaOptions } from './src/pwa-config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Read package.json `version` for the telemetry bundle's `appVersion` (SPEC
// §13.3). Read via fs (not a JSON import) so no tsconfig `resolveJsonModule`
// change is needed and the value stays a build-time constant.
const pkgVersion = (
  JSON.parse(
    readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
  ) as { version: string }
).version;

// https://vite.dev/config/
export default defineConfig({
  // Expose the package.json version to the app. Stringified so it inlines as a
  // literal; declared in src/vite-env.d.ts. vitest reads the same define, so
  // tests see a real value too.
  define: {
    __APP_VERSION__: JSON.stringify(pkgVersion),
  },
  plugins: [react(), VitePWA(pwaOptions)],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    passWithNoTests: true,
    css: true,
  },
});
