import type { Page } from '@playwright/test';

/**
 * E2E helpers (SPEC §10.5). All specs run against the BUILT PWA served by
 * `vite preview` (see playwright.config.ts) — never dev mode — so the real
 * service-worker / offline path is exercised.
 */

/**
 * Storage keys owned by prod code. Intentionally RE-DECLARED rather than imported
 * from src: importing `THEME_STORAGE_KEY` from src/styles/useTheme pulls React into
 * the Playwright Node process, and `LANG_STORAGE_KEY` from src/i18n/config pulls
 * i18next + the locale JSON (which Node's ESM loader rejects without an import
 * attribute) — both drag prod runtime into the e2e harness. The duplicated literals
 * are two trivial strings ('lg.*'); a prod rename would surface immediately in the
 * theme/i18n e2e specs (persistence assertions would fail). Re-extracting them into a
 * shared, dependency-free module would be a prod-src change outside this task's scope.
 */
export const THEME_STORAGE_KEY = 'lg.theme';
export const LANG_STORAGE_KEY = 'lg.lang';

/** Read the persisted theme preference from the page's localStorage. */
export function readStoredTheme(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY);
}

/** Read the persisted UI language from the page's localStorage. */
export function readStoredLang(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), LANG_STORAGE_KEY);
}

/**
 * Wait until the page has a controlling, ACTIVATED service worker.
 *
 * Anti-flake (plan note 1): SW-dependent specs must await the real activated
 * state rather than `networkidle`. The vite-plugin-pwa SW uses skipWaiting +
 * clientsClaim, so after first load it becomes the controller; we resolve once
 * `navigator.serviceWorker.ready` settles AND a controller exists.
 */
export async function waitForServiceWorkerActive(page: Page): Promise<void> {
  await page.waitForFunction(async () => {
    if (!('serviceWorker' in navigator)) {
      return false;
    }
    const reg = await navigator.serviceWorker.ready;
    return Boolean(reg.active) && navigator.serviceWorker.controller != null;
  }, { timeout: 30_000 });
}
