import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config (SPEC §10.5): tests run against the BUILT PWA, not dev mode, so the
 * real offline / service-worker path is exercised — not bare Vite HMR.
 *
 * `webServer` is `vite preview` serving the `dist/` produced by the prior
 * `build` gate (the `pnpm check` order builds first). It deliberately does NOT
 * rebuild here — keeping the e2e gate fast and deterministic. `reuseExistingServer`
 * lets a locally-running `vite preview` be reused.
 *
 * Single Chromium project, headless, fully serial / no retries → deterministic.
 * SW-dependent specs await `serviceWorker.ready` (not `networkidle`) to avoid flake.
 */
const PORT = 4317;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Use a `.e2e.ts` suffix (not `.spec.ts`/`.test.ts`) so Vitest's default
  // include never collects these Playwright files — the two runners coexist
  // without touching the prod Vitest config.
  testMatch: '**/*.e2e.ts',
  // Determinism over speed: no parallelism, no retries, fail fast on accidental .only.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Serve the already-built dist/ (built by the `build` gate before `e2e`).
    // NOT a rebuild — `vite preview` only previews existing dist/.
    command: `pnpm exec vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
