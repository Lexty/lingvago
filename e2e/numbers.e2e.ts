import { expect, test } from '@playwright/test';
import { waitForServiceWorkerActive } from './helpers';
import { generateSession } from '../src/modes/numbers/session.ts';

/**
 * E7 — NumbersMode production drill (SPEC §1.2, T7).
 *
 * Plays several items of the generative numerals drill end-to-end with
 * PRODUCTION input (the user TYPES the answer — no multiple choice), across both
 * directions and cardinal/ordinal kinds. The session is pinned by a fixed
 * `?seed=` so it is fully DETERMINISTIC: the same items appear every run and the
 * test computes the expected answers from the SAME pure generator the app uses
 * (no duplicated answer table to drift).
 *
 * `src/modes/numbers/session.ts` is pure TS (no React / no i18n / no locale
 * JSON) so importing it into the Playwright Node process is safe — unlike the
 * theme/i18n constants (see helpers.ts).
 */
const SEED = 'e2e-numbers-seed';

test('E7: plays a deterministic NumbersMode session with production input', async ({
  page,
}) => {
  // The app generates SESSION_COUNT=10 items per seed; recompute the same list.
  const items = generateSession(SEED, { count: 10 });

  await page.goto(`/drill/numbers?seed=${SEED}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Numbers' }),
  ).toBeVisible();
  await waitForServiceWorkerActive(page);

  const input = page.getByLabel('Your answer');
  const prompt = page.getByTestId('numbers-prompt');
  const feedback = page.getByTestId('numbers-feedback');

  // Play the first few items: assert the deterministic prompt, type the correct
  // production answer, and confirm the positive feedback. This proves the drill
  // is playable with typed input and that the session is reproducible by seed.
  for (let i = 0; i < 3; i++) {
    await expect(prompt).toHaveText(items[i].prompt);
    await input.fill(items[i].expected);
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('Correct');
    await page.getByRole('button', { name: 'Next' }).click();
  }

  // A WRONG answer reveals the canonical reference answer (objective check).
  await expect(prompt).toHaveText(items[3].prompt);
  await input.fill('definitely-not-right');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(feedback).toContainText(items[3].expected);
});

test('E7b: the survival-kit nav links to the numbers drill', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Exam Survival Kit' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Numbers' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Numbers' }),
  ).toBeVisible();
});
