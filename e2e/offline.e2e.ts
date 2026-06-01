import { expect, test } from '@playwright/test';
import { waitForServiceWorkerActive } from './helpers';

/**
 * E4 — Offline app-shell (SPEC §10.5 / src/pwa-config.ts).
 *
 * After the first load the service worker precaches the app-shell. A subsequent
 * visit while the network is offline must still serve the app-shell (HTML + JS +
 * rendered UI) from the SW cache.
 *
 * SCOPE (WP-A): E4 now asserts the app-shell AND the survival-kit PAGE offline
 * (route `/` content rendered from the SW cache), not just a bare shell.
 *
 * Anti-flake (plan note 1): we await the ACTIVATED/controlling SW via
 * `serviceWorker.ready` + controller (helpers), not `networkidle`.
 */

test('serves the app-shell + survival-kit page offline after first load (SW precache)', async ({ page, context }) => {
  // First (online) load — let the SW install, activate, and take control.
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await waitForServiceWorkerActive(page);

  // Go offline at the network layer — only the SW cache can answer now.
  await context.setOffline(true);

  // navigateFallback ('/index.html') + precache must still serve the shell.
  await page.reload();
  // App-shell rendered: the heading comes from the precached JS bundle booting.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.title()).toBe('lingvago2');

  // A clean navigation (not just reload) to the landing route while offline must
  // serve the actual survival-kit PAGE (WP-A) from the SW cache — not only the
  // shell. Assert the survival-kit content (heading + mock-results table).
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Exam Survival Kit' }),
  ).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByLabel('Score for I out of 50')).toBeVisible();

  await context.setOffline(false);
});
