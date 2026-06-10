import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { waitForServiceWorkerActive } from './helpers';
import {
  GENDER_LEVELS,
  generateSession,
  referenceIdFor,
} from '../src/modes/gender/index.ts';
import type { GenderItem } from '../src/modes/gender/index.ts';
import type { ContentBundle } from '../src/content/types.ts';

/**
 * E-Gender — production-first GenderArticle drill (SPEC §1.2, WP-C Task 4).
 *
 * Plays a DETERMINISTIC seeded session end-to-end across the §4.8 L1→L3 curve,
 * exercising BOTH a typed PRODUCTION item and a parity MC item, asserting the
 * correct + wrong-reveal feedback AND that the feedback deep-link navigates to
 * the right `/reference/:id` card. The expected items are recomputed from the
 * SAME pure generator the screen uses, fed by the SHIPPED content bundle — no
 * duplicated answer table to drift.
 *
 * `src/modes/gender/*` (minus the screen) are pure TS (no React / no i18n) so
 * importing them into the Playwright Node process is safe.
 */
const SEED = 'e2e-gender-seed';
const PER_LEVEL = 4;

const here = dirname(fileURLToPath(import.meta.url));

interface Entry {
  item: GenderItem;
  level: string;
  mode: 'production' | 'mc';
  prompt: string;
  answer: string;
  referenceId: string;
}

/** Recompute the exact L1→L3 session the app generates from the shipped bundle. */
function expectedEntries(): Entry[] {
  const bundlePath = resolve(here, '../public/content.v5.json');
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8')) as ContentBundle;
  const entries: Entry[] = [];
  for (const level of GENDER_LEVELS) {
    const items = generateSession(`${SEED}-${level}`, bundle.nouns, {
      count: PER_LEVEL,
      level,
    });
    for (const item of items) {
      entries.push({
        item,
        level: item.level,
        mode: item.drill.mode,
        prompt: item.drill.prompt,
        answer: item.drill.answer,
        referenceId: referenceIdFor(),
      });
    }
  }
  return entries;
}

/** Answer the CURRENT item correctly (typed input or correct MC option click). */
async function answerCorrect(page: Page, entry: Entry) {
  if (entry.mode === 'production') {
    await page.getByTestId('gender-drill-answer').fill(entry.answer);
    await page.getByRole('button', { name: 'Check' }).click();
  } else {
    // Click the option flagged data-correct="true".
    await page.locator('[data-testid="gender-drill-option"][data-correct="true"]').click();
  }
  await expect(page.getByTestId('gender-drill-feedback')).toContainText('Correct');
}

/** Advance from the current item by `steps`, answering each correctly. */
async function advanceBy(page: Page, entries: Entry[], steps: number) {
  for (let i = 0; i < steps; i++) {
    await answerCorrect(page, entries[i]);
    await page.getByRole('button', { name: 'Next' }).click();
  }
}

test('E-Gender: plays a deterministic L1–L3 session with production + MC and deep-links', async ({
  page,
}) => {
  const entries = expectedEntries();
  expect(entries.length).toBe(GENDER_LEVELS.length * PER_LEVEL);

  // Coverage guard: the pinned seed MUST exercise BOTH modes and all 3 levels.
  expect(entries.map((e) => e.mode)).toContain('production');
  expect(entries.map((e) => e.mode)).toContain('mc');
  expect(new Set(entries.map((e) => e.level))).toEqual(new Set(['L1', 'L2', 'L3']));

  const prodIdx = entries.findIndex((e) => e.mode === 'production');
  const mcIdx = entries.findIndex((e) => e.mode === 'mc');

  await page.goto(`/drill/gender?seed=${SEED}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Gender & articles' }),
  ).toBeVisible();
  await waitForServiceWorkerActive(page);

  const prompt = page.getByTestId('gender-drill-prompt');
  await expect(prompt).toHaveText(entries[0].prompt);

  // The level indicator reflects the first item's §4.8 level.
  await expect(page.getByTestId('gender-drill-level')).toHaveText(`Level ${entries[0].level}`);

  // Play up to the first MC item, answering each correctly.
  await advanceBy(page, entries, mcIdx);
  const mc = entries[mcIdx];
  await expect(prompt).toHaveText(mc.prompt);
  await page.locator('[data-testid="gender-drill-option"][data-correct="true"]').click();
  await expect(page.getByTestId('gender-drill-feedback')).toContainText('Correct');

  // The feedback opens the gender reference card as an IN-DRILL overlay (no
  // navigation); closing it returns to the same drill item.
  await page.getByTestId('gender-drill-ref-link').click();
  await expect(
    page.locator(
      `[data-testid="gender-drill-rule-overlay"] [data-content-id="${mc.referenceId}"]`,
    ),
  ).toBeVisible();
  await page.getByTestId('gender-drill-rule-close').click();
  await expect(page.getByTestId('gender-drill-rule-overlay')).toHaveCount(0);
  await expect(prompt).toHaveText(mc.prompt);

  // Back to the drill at the SAME seed to exercise a PRODUCTION item + wrong-reveal.
  await page.goto(`/drill/gender?seed=${SEED}`);
  await expect(prompt).toHaveText(entries[0].prompt);
  await advanceBy(page, entries, prodIdx);
  const prod = entries[prodIdx];
  await expect(prompt).toHaveText(prod.prompt);

  // A WRONG typed answer reveals the canonical reference answer (objective check).
  await page.getByTestId('gender-drill-answer').fill('definitely-not-right');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByTestId('gender-drill-feedback')).toContainText(prod.answer);
  // The rule overlay is offered on a wrong answer too.
  await page.getByTestId('gender-drill-ref-link').click();
  await expect(
    page.locator(
      `[data-testid="gender-drill-rule-overlay"] [data-content-id="${prod.referenceId}"]`,
    ),
  ).toBeVisible();
});

test('E-Gender-b: the survival-kit nav links to the gender drill', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Exam Survival Kit' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Gender & articles' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Gender & articles' }),
  ).toBeVisible();
});
