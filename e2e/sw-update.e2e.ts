import { expect, test } from '@playwright/test';
import { waitForServiceWorkerActive } from './helpers';

/**
 * E6 — SW update / cutover mechanism (SPEC §10.5, §10.2 #3, §10.6).
 *
 * The new SW must evict the old app-shell WITHOUT a stuck shell:
 *  - clientsClaim → a freshly-loaded client is controlled by the SW on the very
 *    first load (no second navigation needed);
 *  - skipWaiting   → an installed/updated SW never gets parked in `waiting`; it
 *    activates immediately and becomes the controller.
 *
 * SCOPE (plan note 3): T4 asserts the app-shell cutover MECHANISM ONLY. The
 * "progress survived the update" assertion binds to WP-A and is NOT made here.
 *
 * What this test genuinely verifies (falsifiable against the built SW):
 *  - clientsClaim took control on the FIRST load — `navigator.serviceWorker.controller`
 *    is non-null with the expected scriptURL, and `reg.active.state === 'activated'`.
 *    Without clientsClaim the first client stays uncontrolled (controller === null),
 *    so this assertion fails for a non-clientsClaim SW.
 *  - There is NO worker parked in `waiting` and the shell re-renders after reload →
 *    no stuck/blank app-shell on this load.
 *
 * NOT verified here (and deliberately not faked): a true installed→waiting→active
 * EVICTION of an OLD shell by a NEW, byte-different SW. The built dist/ ships a
 * single SW, and `reg.update()` against the byte-identical sw.js produces no new
 * worker — so it can never enter `waiting` regardless of skipWaiting, and asserting
 * on it would not distinguish a skipWaiting SW from one without it. The genuine
 * eviction proof (a real version bump) binds to WP-A.  TODO(WP-A): assert that a
 * second, byte-different build's SW activates immediately without parking in `waiting`.
 *
 * Anti-flake (plan note 1): we await the ACTIVATED/controlling SW state, not
 * `networkidle`.
 */

test('clientsClaim controls the first client and no SW is stuck in waiting', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await waitForServiceWorkerActive(page);

  // clientsClaim: the controller is set on the FIRST load (no reload required).
  // This genuinely fails for a SW without clientsClaim (controller would be null).
  const state = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return {
      hasActive: Boolean(reg.active),
      hasWaiting: Boolean(reg.waiting),
      activeState: reg.active?.state ?? null,
      controller: navigator.serviceWorker.controller?.scriptURL ?? null,
    };
  });

  expect(state.controller).not.toBeNull();
  expect(state.controller).toMatch(/\/sw\.js$/);
  expect(state.hasActive).toBe(true);
  expect(state.activeState).toBe('activated');
  // No worker is parked waiting to take over → no stuck/blank shell on this load.
  expect(state.hasWaiting).toBe(false);

  // The app-shell is still fully rendered after a reload (controlled, not stuck).
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
