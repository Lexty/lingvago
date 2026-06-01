import { expect, test } from '@playwright/test';
import { waitForServiceWorkerActive } from './helpers';

/**
 * E5 — Reference card offline (SPEC §10.5, WP-B).
 *
 * After a first online load the SW precaches the app-shell AND the versioned
 * content bundle (content.v2.json — see src/pwa-config.ts), and the content
 * loader materializes the reference cards into IndexedDB. A subsequent OFFLINE
 * visit must still open ≥1 referenceCard and render its content — served from
 * the SW precache + IndexedDB, never the network.
 *
 * Anti-flake (plan note 1): we await the ACTIVATED/controlling SW via
 * `serviceWorker.ready` + controller (helpers), not `networkidle`. The content
 * loader is async, so we wait for the list to actually render its cards before
 * going offline (a deterministic UI signal that IndexedDB is populated).
 */
test('E5: opens at least one referenceCard while offline (SW precache + IndexedDB)', async ({
  page,
  context,
}) => {
  // First (online) load — let the SW install/activate and the content loader
  // populate IndexedDB.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await waitForServiceWorkerActive(page);

  // Navigate to the reference list and wait until its cards have loaded from
  // IndexedDB (content bootstrap is async).
  await page.goto('/reference');
  const cardLinks = page.locator('main ul li a');
  await expect(cardLinks.first()).toBeVisible({ timeout: 30_000 });
  const firstCardTitle = (await cardLinks.first().innerText()).trim();
  expect(firstCardTitle.length).toBeGreaterThan(0);

  // Go offline at the network layer — only the SW cache + IndexedDB can answer.
  await context.setOffline(true);

  // Open the first card (deep-link) and assert its content renders offline.
  await cardLinks.first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // The card body article carries the stable contentId anchor and real content.
  const cardBody = page.locator('article[data-content-id]');
  await expect(cardBody).toBeVisible();
  await expect(cardBody).not.toBeEmpty();

  // A hard reload of the deep-link while offline must still serve the card from
  // the SW precache (app-shell) + IndexedDB (content), not the network.
  await page.reload();
  await expect(page.locator('article[data-content-id]')).toBeVisible();

  await context.setOffline(false);
});
