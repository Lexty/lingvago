import { expect, test } from '@playwright/test';
import { waitForServiceWorkerActive } from './helpers';

/**
 * E1 — First run → survival-kit (SPEC §10.5).
 *
 * WP-A landed: route `/` is the Exam Survival Kit. A first launch must load the
 * app-shell AND render the survival-kit page (heading + the 4-group mock-results
 * table + materials). This was a `test.fixme` until WP-A — now a real assertion.
 */
test('E1: first run loads the app-shell and renders the survival-kit page', async ({ page }) => {
  await page.goto('/');

  // App-shell + survival-kit content (not a bare shell).
  await expect(
    page.getByRole('heading', { level: 1, name: 'Exam Survival Kit' }),
  ).toBeVisible();
  // The 4-group mock-results table is the page's first persistent surface.
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByLabel('Score for I out of 50')).toBeVisible();
  await expect(page.getByLabel('Score for IV out of 50')).toBeVisible();
});

/**
 * E6 (extended to WP-A, plan note 2 / SPEC §10.2 #3) — entered mock-results
 * survive an app reload / re-navigation (IndexedDB durability).
 *
 * The mock-results table is the first REAL persistent progress. This asserts the
 * genuine data-durability guarantee: entered mock-table values (persisted to the
 * `lingvago2` IndexedDB) survive a full app reload and re-navigation — they are
 * loaded back into the controlled inputs, NOT wiped.
 *
 * SCOPE — what this proves vs. what it does NOT:
 *  - PROVES: progress in IndexedDB outlives a `page.reload()` (a fresh document
 *    load + the survival-kit's async load effect rehydrating the inputs). If the
 *    persistence/load path regressed, the reloaded inputs would come back empty
 *    and this test would fail.
 *  - Does NOT prove a true service-worker VERSION SWAP. The e2e gate runs against
 *    `vite preview` serving an unchanged dist/, so a `reg.update()` would fetch
 *    byte-identical SW bytes and install/activate nothing — a no-op that cannot
 *    falsify a real version-swap. We therefore do NOT claim SW-update coverage
 *    here and do NOT fake one.
 *  TODO(WP-A+): a genuine SW-version-swap durability test needs TWO distinct
 *  builds (old shell → new byte-different SW evicts it) so the update step can
 *  actually fail; that is out of WP-A scope (deferred).
 */
test('E6: entered mock-results survive an app reload (IndexedDB durability)', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Exam Survival Kit' }),
  ).toBeVisible();
  await waitForServiceWorkerActive(page);

  // Enter mock-table scores → persisted to IndexedDB `lingvago2`.
  const scoreI = page.getByLabel('Score for I out of 50');
  const scoreIII = page.getByLabel('Score for III out of 50');
  await scoreI.fill('42');
  await scoreIII.fill('25');
  // Confirm the values are committed to the DOM and give the persistence effect a
  // turn to land the async IndexedDB write before reloading.
  await expect(scoreI).toHaveValue('42');
  await expect(scoreIII).toHaveValue('25');

  // Full reload: a fresh document load that re-runs the load effect from scratch.
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Exam Survival Kit' }),
  ).toBeVisible();
  await waitForServiceWorkerActive(page);

  // The persisted mock-results survived the reload (rehydrated from IndexedDB
  // into the controlled inputs — progress was NOT wiped).
  await expect(page.getByLabel('Score for I out of 50')).toHaveValue('42');
  await expect(page.getByLabel('Score for III out of 50')).toHaveValue('25');
});
