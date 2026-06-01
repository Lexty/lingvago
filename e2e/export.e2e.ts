import { expect, test } from '@playwright/test';
import { waitForServiceWorkerActive } from './helpers';

/**
 * E (WP-E) — Export → Import round-trip (SPEC §13.3 / §10.2 #5 / contract AC8).
 *
 * Deterministic, download-fallback path: headless Chromium has no Web Share file
 * target, so the Export button takes the `<a download>` fallback. We capture the
 * downloaded bundle via Playwright's download API, then feed THAT EXACT file back
 * through the Import file-chooser and confirm the overwriting restore.
 *
 * Observable progress is the WP-A SurvivalKit mock-results table — it persists to
 * the `settings` store, one of the §7.2 progress stores carried in the bundle. So:
 * seed scores → export → WIPE the scores → import the file → confirm → the scores
 * come back, proving the restore reflected the exported state.
 */
test('WP-E: export a bundle, then import it to restore wiped progress', async ({
  page,
}, testInfo) => {
  // 1) Seed progress: enter per-group mock scores on the landing page.
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Exam Survival Kit' }),
  ).toBeVisible();
  await waitForServiceWorkerActive(page);

  await page.getByLabel('Score for I out of 50').fill('41');
  await page.getByLabel('Score for II out of 50').fill('32');
  await page.getByLabel('Score for III out of 50').fill('23');
  await page.getByLabel('Score for IV out of 50').fill('14');
  // Blur to flush the controlled input → state → IndexedDB persist.
  await page.getByLabel('Score for IV out of 50').blur();
  // Confirm it actually persisted before exporting (avoid a write-race).
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const req = indexedDB.open('lingvago2');
        req.onerror = () => {
          resolve(false);
        };
        req.onsuccess = () => {
          const dbh = req.result;
          if (!dbh.objectStoreNames.contains('settings')) {
            dbh.close();
            resolve(false);
            return;
          }
          const get = dbh
            .transaction('settings', 'readonly')
            .objectStore('settings')
            .get('survivalKit');
          get.onsuccess = () => {
            const v = get.result as { value?: { scores?: { I?: number } } } | undefined;
            dbh.close();
            resolve(v?.value?.scores?.I === 41);
          };
          get.onerror = () => {
            dbh.close();
            resolve(false);
          };
        };
      }),
    { timeout: 10_000 },
  );

  // 2) Export → capture the downloaded bundle file (download-fallback path).
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('data-export').click();
  const download = await downloadPromise;
  // Filename is stamped (`lingvago2-progress-<exportedAt>.json`).
  expect(download.suggestedFilename()).toMatch(/^lingvago2-progress-.*\.json$/);
  const bundlePath = testInfo.outputPath('bundle.json');
  await download.saveAs(bundlePath);
  await expect(page.getByTestId('data-status')).toHaveText('Progress exported.');

  // 3) WIPE the progress so the restore is observable: clear the scores.
  await page.goto('/');
  await page.getByRole('button', { name: 'Clear scores' }).click();
  await expect(page.getByLabel('Score for I out of 50')).toHaveValue('');
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const req = indexedDB.open('lingvago2');
        req.onsuccess = () => {
          const dbh = req.result;
          const get = dbh
            .transaction('settings', 'readonly')
            .objectStore('settings')
            .get('survivalKit');
          get.onsuccess = () => {
            const v = get.result as { value?: { scores?: { I?: number | null } } } | undefined;
            dbh.close();
            resolve(v?.value?.scores?.I == null);
          };
          get.onerror = () => {
            dbh.close();
            resolve(false);
          };
        };
        req.onerror = () => {
          resolve(false);
        };
      }),
    { timeout: 10_000 },
  );

  // 4) Import the captured file → confirm the overwriting restore.
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // The file input is hidden; set its files directly (the visible button also
  // opens the chooser, but setting input files is the deterministic route).
  await page.getByTestId('data-file-input').setInputFiles(bundlePath);

  // Confirmation MUST appear before any restore — and cancel must be available.
  await expect(page.getByTestId('data-confirm-restore')).toBeVisible();
  await page.getByTestId('data-confirm-restore').click();
  await expect(page.getByTestId('data-status')).toHaveText('Progress restored.');

  // 5) The restored progress is reflected: scores are back on the landing page.
  await page.goto('/');
  await expect(page.getByLabel('Score for I out of 50')).toHaveValue('41');
  await expect(page.getByLabel('Score for II out of 50')).toHaveValue('32');
  await expect(page.getByLabel('Score for III out of 50')).toHaveValue('23');
  await expect(page.getByLabel('Score for IV out of 50')).toHaveValue('14');
});
