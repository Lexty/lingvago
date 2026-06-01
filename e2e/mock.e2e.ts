import { expect, test } from '@playwright/test';
import { waitForServiceWorkerActive } from './helpers';

/**
 * E (WP-D) — timed mock (PaperSimulation) end-to-end (SPEC §9.1 / §10.5).
 *
 * Deterministic: the run length is injected via `?duration=` (a SHORT ms value)
 * so the run reaches the entry phase WITHOUT a real 90-minute wait. We solve the
 * "paper exam" off-screen, manually enter per-group scores (the app NEVER grades
 * — §9.1), reach the review (4-group scores + total + verdict), save, and assert
 * the saved result flows into the WP-A SurvivalKit mock-results table.
 */
test('WP-D: run a short timed mock, enter scores, review, save → SurvivalKit table reflects it', async ({
  page,
}) => {
  // A 1.2s run: long enough to observe the running phase, short enough to expire
  // within the test deterministically.
  await page.goto('/mock?duration=1200');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Mock run' }),
  ).toBeVisible();
  await waitForServiceWorkerActive(page);

  // Setup → running. NOTHING is graded/hinted during the run: only the clock +
  // controls are present.
  await page.getByTestId('mock-start').click();
  await expect(page.getByTestId('mock-clock')).toBeVisible();
  await expect(page.getByTestId('mock-finish')).toBeVisible();

  // Either the clock expires and auto-advances, OR finish the run early — both
  // land on the entry phase. We finish explicitly for determinism.
  await page.getByTestId('mock-finish').click();

  // Entry: manual per-group scores (0–50 each).
  await page.getByLabel('Score for I out of 50').fill('40');
  await page.getByLabel('Score for II out of 50').fill('30');
  await page.getByLabel('Score for III out of 50').fill('25');
  await page.getByLabel('Score for IV out of 50').fill('20');
  await page.getByTestId('mock-to-review').click();

  // Review: 4-group scores + total/200 + verdict.
  await expect(page.getByTestId('mock-review-score-I')).toHaveText('40');
  await expect(page.getByTestId('mock-review-score-II')).toHaveText('30');
  await expect(page.getByTestId('mock-review-score-III')).toHaveText('25');
  await expect(page.getByTestId('mock-review-score-IV')).toHaveText('20');
  await expect(page.getByTestId('mock-review-total')).toHaveText('115 of 200');
  // Verdict VALUE is falsifiable: a fresh DB has no threshold set, so
  // computeVerdict resolves to 'no-verdict' → the «No verdict yet» text.
  await expect(page.getByTestId('mock-verdict')).toHaveText('No verdict yet');

  // Save → written into the WP-A SurvivalKit mock table + history.
  await page.getByTestId('mock-save').click();
  await expect(page.getByTestId('mock-saved')).toBeVisible();

  // Navigate to the SurvivalKit landing page: its mock-results table now
  // reflects the entered per-group scores (the saved run drives the table).
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Exam Survival Kit' }),
  ).toBeVisible();
  await expect(page.getByLabel('Score for I out of 50')).toHaveValue('40');
  await expect(page.getByLabel('Score for II out of 50')).toHaveValue('30');
  await expect(page.getByLabel('Score for III out of 50')).toHaveValue('25');
  await expect(page.getByLabel('Score for IV out of 50')).toHaveValue('20');
});

/**
 * Reload during the running phase reconstructs the timer (AC1 / error path):
 * the countdown SURVIVES a reload because the run's anchors are persisted and
 * `remaining` is recomputed from them — the user is NOT bounced back to setup.
 */
test('WP-D: a reload mid-run reconstructs the countdown (does not reset to setup)', async ({
  page,
}) => {
  // A long-enough run that it cannot expire during the reload round-trip.
  await page.goto('/mock?duration=600000');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Mock run' }),
  ).toBeVisible();
  await waitForServiceWorkerActive(page);

  await page.getByTestId('mock-start').click();
  await expect(page.getByTestId('mock-clock')).toBeVisible();

  // Wait for the in-progress run's anchors to actually LAND in IndexedDB before
  // reloading, so the reload genuinely tests reconstruction (not a race where
  // the async persist had not yet flushed). The run lives under the `mockRun`
  // key in the `settings` store of the `lingvago2` database.
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
            .get('mockRun');
          get.onsuccess = () => {
            dbh.close();
            resolve(get.result != null);
          };
          get.onerror = () => {
            dbh.close();
            resolve(false);
          };
        };
      }),
    { timeout: 10_000 },
  );

  // Full reload: a fresh document load. The run must be reconstructed from the
  // persisted anchors → still in the running phase with the clock visible.
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Mock run' }),
  ).toBeVisible();
  await waitForServiceWorkerActive(page);

  // Reconstructed: still running (clock + finish visible), NOT back at setup.
  await expect(page.getByTestId('mock-clock')).toBeVisible();
  await expect(page.getByTestId('mock-finish')).toBeVisible();
  await expect(page.getByTestId('mock-start')).toHaveCount(0);
});

/**
 * The injected short clock actually EXPIRES and auto-advances to entry (AC1 /
 * AC8): with a very short duration the countdown reaches 0 on its own and the
 * screen folds into the manual-entry phase WITHOUT the user clicking finish —
 * exercising the timed auto-expiry path end-to-end (not just an explicit finish).
 */
test('WP-D: the injected short clock expires and auto-advances to entry (no finish click)', async ({
  page,
}) => {
  // A very short run so the countdown reaches 0 within the test.
  await page.goto('/mock?duration=800');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Mock run' }),
  ).toBeVisible();
  await waitForServiceWorkerActive(page);

  await page.getByTestId('mock-start').click();
  await expect(page.getByTestId('mock-clock')).toBeVisible();

  // Do NOT click finish: let the clock auto-expire. The entry phase (manual
  // per-group score inputs) must appear on its own.
  await expect(page.getByLabel('Score for I out of 50')).toBeVisible();
  // The running surfaces are gone once it auto-advanced.
  await expect(page.getByTestId('mock-clock')).toHaveCount(0);
  await expect(page.getByTestId('mock-finish')).toHaveCount(0);
});
