import { expect, test, type Page } from '@playwright/test';
import { waitForServiceWorkerActive } from './helpers';

/** Count the rows of the `attempts` progress store in the app's IndexedDB. */
function countAttempts(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const req = indexedDB.open('lingvago2');
        req.onerror = () => {
          resolve(-1);
        };
        req.onsuccess = () => {
          const dbh = req.result;
          if (!dbh.objectStoreNames.contains('attempts')) {
            dbh.close();
            resolve(-1);
            return;
          }
          const count = dbh.transaction('attempts', 'readonly').objectStore('attempts').count();
          count.onsuccess = () => {
            dbh.close();
            resolve(count.result);
          };
          count.onerror = () => {
            dbh.close();
            resolve(-1);
          };
        };
      }),
  );
}

/** The whole `attempts` store, serialized (so two snapshots compare by content). */
function readAttempts(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const req = indexedDB.open('lingvago2');
        req.onerror = () => {
          reject(new Error('open failed'));
        };
        req.onsuccess = () => {
          const dbh = req.result;
          const all = dbh.transaction('attempts', 'readonly').objectStore('attempts').getAll();
          all.onsuccess = () => {
            dbh.close();
            resolve(JSON.stringify(all.result));
          };
          all.onerror = () => {
            dbh.close();
            reject(new Error('read failed'));
          };
        };
      }),
  );
}

/** Wipe the `attempts` progress store (so a later restore is observable). */
function clearAttempts(page: Page): Promise<void> {
  return page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('lingvago2');
        req.onerror = () => {
          reject(new Error('open failed'));
        };
        req.onsuccess = () => {
          const dbh = req.result;
          const tx = dbh.transaction('attempts', 'readwrite');
          tx.objectStore('attempts').clear();
          tx.oncomplete = () => {
            dbh.close();
            resolve();
          };
          tx.onerror = () => {
            dbh.close();
            reject(new Error('clear failed'));
          };
        };
      }),
  );
}

/**
 * E (WP-E) — Export → Import round-trip.
 *
 * Deterministic, download-fallback path: headless Chromium has no Web Share file
 * target, so the Export button takes the `<a download>` fallback. We capture the
 * downloaded bundle via Playwright's download API, then feed THAT EXACT file back
 * through the Import file-chooser and confirm the overwriting restore.
 *
 * Observable progress is the drill attempt log (`attempts`, one of the progress
 * stores carried in the bundle). So: answer one drill item → export → WIPE the
 * log → import the file → confirm → the attempt is back, proving the restore
 * reflected the exported state.
 */
test('WP-E: export a bundle, then import it to restore wiped progress', async ({
  page,
}, testInfo) => {
  // 1) Seed progress: answer one item of the numbers drill.
  await page.goto('/drill/numbers?seed=export-e2e');
  await expect(page.getByRole('heading', { level: 1, name: 'Numbers' })).toBeVisible();
  await waitForServiceWorkerActive(page);
  await page.getByLabel('Your answer').fill('x');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByTestId('numbers-feedback')).toBeVisible();
  // Confirm it actually persisted before exporting (avoid a write-race).
  await expect.poll(() => countAttempts(page), { timeout: 10_000 }).toBe(1);
  const before = await readAttempts(page);
  expect(before).toContain('"userAnswer":"x"');

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

  // 3) WIPE the progress so the restore is observable.
  await clearAttempts(page);
  expect(await countAttempts(page)).toBe(0);

  // 4) Import the captured file → confirm the overwriting restore.
  // The file input is hidden; set its files directly (the visible button also
  // opens the chooser, but setting input files is the deterministic route).
  await page.getByTestId('data-file-input').setInputFiles(bundlePath);

  // Confirmation MUST appear before any restore — and cancel must be available.
  await expect(page.getByTestId('data-confirm-restore')).toBeVisible();
  await page.getByTestId('data-confirm-restore').click();
  await expect(page.getByTestId('data-status')).toHaveText('Progress restored.');

  // 5) The restored progress is reflected: the SAME attempt (every field, not
  // just the row count) is back in the log.
  await expect.poll(() => countAttempts(page), { timeout: 10_000 }).toBe(1);
  // Compared as parsed values: a restored row has the same fields in another
  // key order.
  expect(JSON.parse(await readAttempts(page))).toEqual(JSON.parse(before));
});
