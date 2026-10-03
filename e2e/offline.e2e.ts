import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';
import { waitForServiceWorkerActive } from './helpers';

/**
 * E4 — Offline app-shell (SPEC §10.5 / src/pwa-config.ts).
 *
 * After the first load the service worker precaches the app-shell. A subsequent
 * visit while the network is offline must still serve the app-shell (HTML + JS +
 * rendered UI) from the SW cache.
 *
 * SCOPE: E4 asserts the app-shell AND the home PAGE (the list of mechanics) offline
 * (route `/` content rendered from the SW cache), not just a bare shell.
 *
 * Anti-flake (plan note 1): we await the ACTIVATED/controlling SW via
 * `serviceWorker.ready` + controller (helpers), not `networkidle`.
 */

test('serves the app-shell + home page offline after first load (SW precache)', async ({ page, context }) => {
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
  expect(await page.title()).toBe('Lingvago');

  // A clean navigation (not just reload) to the landing route while offline must
  // serve the actual home PAGE from the SW cache — not only the shell. Assert
  // the home content (heading + the topic cards).
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'What shall we practise?' }),
  ).toBeVisible();
  await expect(page.getByTestId('home-topic-numbers')).toBeVisible();
  await expect(page.getByTestId('home-topic-interrogative')).toBeVisible();

  await context.setOffline(false);
});

test('downloads a lesson Anki package offline (precached)', async ({ page, context }) => {
  await page.goto('/pack/unit-19');
  await expect(page.getByTestId('pack-anki-download')).toBeVisible();
  await waitForServiceWorkerActive(page);

  await context.setOffline(true);
  await page.reload();
  const download = page.waitForEvent('download');
  await page.getByTestId('pack-anki-download').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('lingvago-unidade-19.en.apkg');
  const files = unzipSync(new Uint8Array(await readFile((await file.path())!)));
  expect(Object.keys(files).sort()).toEqual(['collection.anki2', 'media']);
  await expect(page.getByTestId('pack-anki-status')).toContainText('lingvago-unidade-19.en.apkg');

  await context.setOffline(false);
});
