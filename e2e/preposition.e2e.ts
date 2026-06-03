import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { waitForServiceWorkerActive } from './helpers';
import {
  PREP_LEVELS,
  generateSession,
  referenceIdFor,
} from '../src/modes/preposition/index.ts';
import type { PrepositionItem } from '../src/modes/preposition/index.ts';
import type { ContentBundle } from '../src/content/types.ts';

/**
 * E-Preposition — production-first Preposition cloze drill (SPEC §1.2, WP-C Task
 * 4).
 *
 * Plays a DETERMINISTIC seeded session end-to-end across the §4.8 L1→L3 curve,
 * exercising BOTH a typed PRODUCTION item and a parity MC item, asserting the
 * correct + wrong-reveal feedback AND that the feedback deep-link navigates to
 * the right category `/reference/:id` card. The expected items are recomputed
 * from the SAME pure generator the screen uses, fed by the SHIPPED bundle — no
 * duplicated answer table to drift.
 */
const SEED = 'e2e-prep-seed';
const PER_LEVEL = 4;

const here = dirname(fileURLToPath(import.meta.url));

interface Entry {
  item: PrepositionItem;
  level: string;
  mode: 'production' | 'mc';
  prompt: string;
  answer: string;
  referenceId: string;
}

/** Recompute the exact L1→L3 session the app generates from the shipped bundle. */
function expectedEntries(): Entry[] {
  const bundlePath = resolve(here, '../public/content.v2.json');
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8')) as ContentBundle;
  const entries: Entry[] = [];
  for (const level of PREP_LEVELS) {
    const items = generateSession(`${SEED}-${level}`, bundle.prepositions, {
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
        referenceId: referenceIdFor(item),
      });
    }
  }
  return entries;
}

async function answerCorrect(page: Page, entry: Entry) {
  if (entry.mode === 'production') {
    await page.getByTestId('preposition-drill-answer').fill(entry.answer);
    await page.getByRole('button', { name: 'Check' }).click();
  } else {
    await page
      .locator('[data-testid="preposition-drill-option"][data-correct="true"]')
      .click();
  }
  await expect(page.getByTestId('preposition-drill-feedback')).toContainText('Correct');
}

async function advanceBy(page: Page, entries: Entry[], steps: number) {
  for (let i = 0; i < steps; i++) {
    await answerCorrect(page, entries[i]);
    await page.getByRole('button', { name: 'Next' }).click();
  }
}

test('E-Preposition: plays a deterministic L1–L3 session with production + MC and deep-links', async ({
  page,
}) => {
  const entries = expectedEntries();
  expect(entries.length).toBe(PREP_LEVELS.length * PER_LEVEL);

  // Coverage guard: the pinned seed MUST exercise BOTH modes and all 3 levels.
  expect(entries.map((e) => e.mode)).toContain('production');
  expect(entries.map((e) => e.mode)).toContain('mc');
  expect(new Set(entries.map((e) => e.level))).toEqual(new Set(['L1', 'L2', 'L3']));

  const prodIdx = entries.findIndex((e) => e.mode === 'production');
  const mcIdx = entries.findIndex((e) => e.mode === 'mc');

  await page.goto(`/drill/preposition?seed=${SEED}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Prepositions' }),
  ).toBeVisible();
  await waitForServiceWorkerActive(page);

  const prompt = page.getByTestId('preposition-drill-prompt');
  await expect(prompt).toHaveText(entries[0].prompt);
  await expect(page.getByTestId('preposition-drill-level')).toHaveText(
    `Level ${entries[0].level}`,
  );

  // Play to the first PRODUCTION item; answer it correctly + follow its deep-link.
  await advanceBy(page, entries, prodIdx);
  const prod = entries[prodIdx];
  await expect(prompt).toHaveText(prod.prompt);
  await page.getByTestId('preposition-drill-answer').fill(prod.answer);
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByTestId('preposition-drill-feedback')).toContainText('Correct');

  // The feedback opens the reference rule as an IN-DRILL overlay (no navigation),
  // so closing it returns to the SAME drill item (the seeded session is kept).
  await page.getByTestId('preposition-drill-ref-link').click();
  await expect(
    page.locator(
      `[data-testid="preposition-drill-rule-overlay"] [data-content-id="${prod.referenceId}"]`,
    ),
  ).toBeVisible();
  await page.getByTestId('preposition-drill-rule-close').click();
  await expect(page.getByTestId('preposition-drill-rule-overlay')).toHaveCount(0);
  await expect(prompt).toHaveText(prod.prompt);

  // Back to the SAME seed to exercise an MC item + a wrong-reveal.
  await page.goto(`/drill/preposition?seed=${SEED}`);
  await expect(prompt).toHaveText(entries[0].prompt);
  await advanceBy(page, entries, mcIdx);
  const mc = entries[mcIdx];
  await expect(prompt).toHaveText(mc.prompt);

  // Pick a WRONG option (any not flagged correct) → reveals the reference answer.
  await page
    .locator('[data-testid="preposition-drill-option"][data-correct="false"]')
    .first()
    .click();
  await expect(page.getByTestId('preposition-drill-feedback')).toContainText(mc.answer);
  await page.getByTestId('preposition-drill-ref-link').click();
  await expect(
    page.locator(
      `[data-testid="preposition-drill-rule-overlay"] [data-content-id="${mc.referenceId}"]`,
    ),
  ).toBeVisible();
});

test('E-Preposition-b: the survival-kit nav links to the preposition drill', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Exam Survival Kit' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Prepositions' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Prepositions' }),
  ).toBeVisible();
});
