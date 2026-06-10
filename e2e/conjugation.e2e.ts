import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { waitForServiceWorkerActive } from './helpers';
import { generateSession } from '../src/modes/conjugation/session.ts';
import { projectVerbData } from '../src/modes/conjugation/projectVerbData.ts';
import type { ConjugationItem } from '../src/modes/conjugation/session.ts';
import type { ContentBundle } from '../src/content/types.ts';

/**
 * E8 — ConjugationMode present-tense production drill (SPEC §1.2, T8).
 *
 * Plays several items of the generative conjugation drill end-to-end with
 * PRODUCTION input (the user TYPES the answer — no multiple choice), across both
 * task types (fill-form + assemble-table). The session is pinned by a fixed
 * `?seed=` so it is fully DETERMINISTIC: the test recomputes the expected items
 * from the SAME pure engine the app uses, fed by the SHIPPED content bundle
 * (verbs ⨝ conjugationTables) — no duplicated answer table to drift.
 *
 * `src/modes/conjugation/{session,verbData}.ts` are pure TS (no React / no i18n)
 * so importing them into the Playwright Node process is safe.
 */
const SEED = 'e2e-conjugation-seed';
const SESSION_COUNT = 10;

const here = dirname(fileURLToPath(import.meta.url));

/** Recompute the exact session the app generates from the shipped bundle. */
function expectedItems(): ConjugationItem[] {
  const bundlePath = resolve(here, '../public/content.v5.json');
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8')) as ContentBundle;
  const verbs = projectVerbData(bundle.verbs, bundle.conjugationTables);
  return generateSession(SEED, verbs, { count: SESSION_COUNT });
}

/** The slice this test actually plays (4 correct items + 1 wrong item). */
const PLAYED = 5;

test('E8: plays a deterministic ConjugationMode session with production input', async ({
  page,
}) => {
  const items = expectedItems();
  expect(items.length).toBe(SESSION_COUNT);

  // Coverage guard: the pinned seed MUST exercise BOTH task types within the
  // played slice, so the assemble-table 5-person grid path is never silently
  // skipped (fail loudly if a future seed/content change drops a type).
  const playedTypes = items.slice(0, PLAYED).map((i) => i.type);
  expect(playedTypes).toContain('fill-form');
  expect(playedTypes).toContain('assemble-table');

  await page.goto(`/drill/conjugation?seed=${SEED}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Conjugation' }),
  ).toBeVisible();
  await waitForServiceWorkerActive(page);

  const prompt = page.getByTestId('conjugation-prompt');
  const feedback = page.getByTestId('conjugation-feedback');
  // Wait until content has loaded and the first deterministic item is shown.
  await expect(prompt).toHaveText(items[0].prompt);

  // Play the first few items: assert the deterministic prompt, type the correct
  // production answer(s), and confirm positive feedback — proving the drill is
  // playable with typed input and reproducible by seed across BOTH task types.
  for (let i = 0; i < 4; i++) {
    const item = items[i];
    await expect(prompt).toHaveText(item.prompt);
    if (item.type === 'fill-form') {
      await page.getByLabel('Your answer').fill(item.expected);
    } else {
      for (const person of item.persons) {
        await page
          .getByTestId(`conjugation-input-${person}`)
          .fill(item.expected[person]);
      }
    }
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText('Correct');
    await page.getByRole('button', { name: 'Next' }).click();
  }

  // A WRONG answer reveals the canonical reference answer (objective check).
  const wrongItem = items[4];
  await expect(prompt).toHaveText(wrongItem.prompt);
  if (wrongItem.type === 'fill-form') {
    await page.getByLabel('Your answer').fill('definitely-not-right');
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(feedback).toContainText(wrongItem.expected);
  } else {
    // Submit an empty/blank table → wrong, and the reference table is revealed.
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(feedback).toContainText(wrongItem.expected[wrongItem.persons[0]]);
  }
});

test('E8b: the survival-kit nav links to the conjugation drill', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Exam Survival Kit' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Conjugation' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Conjugation' }),
  ).toBeVisible();
});
