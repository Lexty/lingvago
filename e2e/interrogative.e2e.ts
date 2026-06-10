import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { waitForServiceWorkerActive } from './helpers';
import { INT_LEVELS, generateSession } from '../src/modes/interrogative/index.ts';
import { referenceIdFor } from '../src/modes/interrogative/progress.ts';
import type { GlossLang, InterrogativeItem } from '../src/modes/interrogative/index.ts';
import type { ContentBundle } from '../src/content/types.ts';

/**
 * E-Interrogative — production-first interrogative cue-cloze drill (SPEC §1.2).
 *
 * Plays a DETERMINISTIC seeded session end-to-end across the §4.8 L1→L3 curve,
 * exercising BOTH a typed PRODUCTION item and parity MC items (the equal-length
 * `wh` meaning-confusion set AND the quanto-family GENDER contrast), asserting the
 * correct + wrong-reveal feedback AND that the feedback opens the single
 * `ref-interrogative` rule card as an IN-DRILL overlay (open → visible → close →
 * SAME prompt). The expected items are recomputed from the SAME pure generator
 * the screen uses — with the SAME `glossLang` the screen passes (the app boots in
 * EN for the headless e2e, so `glossLang='en'`) — fed by the SHIPPED bundle, so
 * there is no duplicated answer table to drift. Per AC4 the test only asserts MC
 * contrasts that are actually assemblable from the fixture: the equal-length
 * meaning-confusion set (e.g. quem↔onde, len 4) and the quanto-family gender
 * contrast (quantos↔quantas, len 7). It NEVER asserts a qual↔quais (cross-length)
 * or a quanto↔quando (cross-class) pair.
 */
const SEED = 'e2e-int-0';
const PER_LEVEL = 4;
const GLOSS_LANG: GlossLang = 'en';

const here = dirname(fileURLToPath(import.meta.url));

interface Entry {
  item: InterrogativeItem;
  level: string;
  mode: 'production' | 'mc';
  parityClass: string;
  prompt: string;
  answer: string;
  options: string[] | null;
  referenceId: string;
}

/** Recompute the exact L1→L3 session the app generates from the shipped bundle. */
function expectedEntries(): Entry[] {
  const bundlePath = resolve(here, '../public/content.v4.json');
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8')) as ContentBundle;
  const entries: Entry[] = [];
  for (const level of INT_LEVELS) {
    const items = generateSession(`${SEED}-${level}`, bundle.interrogatives, {
      count: PER_LEVEL,
      level,
      glossLang: GLOSS_LANG,
    });
    for (const item of items) {
      entries.push({
        item,
        level: item.level,
        mode: item.drill.mode,
        parityClass: item.parityClass,
        prompt: item.drill.prompt,
        answer: item.drill.answer,
        options:
          item.drill.mode === 'mc' ? item.drill.options.map((o) => o.surface) : null,
        referenceId: referenceIdFor(item),
      });
    }
  }
  return entries;
}

async function answerCorrect(page: Page, entry: Entry) {
  if (entry.mode === 'production') {
    await page.getByTestId('interrogative-drill-answer').fill(entry.answer);
    await page.getByRole('button', { name: 'Check' }).click();
  } else {
    await page
      .locator('[data-testid="interrogative-drill-option"][data-correct="true"]')
      .click();
  }
  await expect(page.getByTestId('interrogative-drill-feedback')).toContainText('Correct');
}

async function advanceBy(page: Page, entries: Entry[], steps: number) {
  for (let i = 0; i < steps; i++) {
    await answerCorrect(page, entries[i]);
    await page.getByRole('button', { name: 'Next' }).click();
  }
}

test('E-Interrogative: plays a deterministic L1–L3 session with production + MC and opens the rule overlay', async ({
  page,
}) => {
  const entries = expectedEntries();
  expect(entries.length).toBe(INT_LEVELS.length * PER_LEVEL);

  // Coverage guard: the pinned seed MUST exercise BOTH modes and all 3 levels.
  expect(entries.map((e) => e.mode)).toContain('production');
  expect(entries.map((e) => e.mode)).toContain('mc');
  expect(new Set(entries.map((e) => e.level))).toEqual(new Set(['L1', 'L2', 'L3']));

  // The seed exercises BOTH a `wh` meaning-confusion MC (equal-length single-word
  // interrogatives) AND a `quant` gender-contrast MC (quanto-family) — the only
  // contrasts the shared parity module can assemble from this corpus.
  const whMC = entries.find((e) => e.mode === 'mc' && e.parityClass === 'wh');
  const quantMC = entries.find((e) => e.mode === 'mc' && e.parityClass === 'quant');
  expect(whMC).toBeDefined();
  expect(quantMC).toBeDefined();
  // The `wh` MC options are all the SAME canonical length, single-word, and never
  // a cross-length qual↔quais pair.
  const whLens = new Set(whMC!.options!.map((o) => o.length));
  expect(whLens.size).toBe(1);
  expect(whMC!.options!.every((o) => !o.includes(' '))).toBe(true);
  expect(whMC!.options!.includes('quais')).toBe(false);
  // The `quant` MC is exactly the quanto-family gender contrast — all options are
  // quanto-family forms of equal length, never a cross-class quanto↔quando pair.
  const QUANT = new Set(['quanto', 'quanta', 'quantos', 'quantas']);
  expect(quantMC!.options!.every((o) => QUANT.has(o))).toBe(true);
  const quantLens = new Set(quantMC!.options!.map((o) => o.length));
  expect(quantLens.size).toBe(1);

  const prodIdx = entries.findIndex((e) => e.mode === 'production');
  const mcIdx = entries.findIndex((e) => e.mode === 'mc');

  await page.goto(`/drill/interrogative?seed=${SEED}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Question words' }),
  ).toBeVisible();
  await waitForServiceWorkerActive(page);

  const prompt = page.getByTestId('interrogative-drill-prompt');
  await expect(prompt).toHaveText(entries[0].prompt);
  await expect(page.getByTestId('interrogative-drill-level')).toHaveText(
    `Level ${entries[0].level}`,
  );

  // Play to the first PRODUCTION item; answer it correctly + open its rule card.
  await advanceBy(page, entries, prodIdx);
  const prod = entries[prodIdx];
  await expect(prompt).toHaveText(prod.prompt);
  await page.getByTestId('interrogative-drill-answer').fill(prod.answer);
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByTestId('interrogative-drill-feedback')).toContainText('Correct');

  // The feedback opens the ref-interrogative rule as an IN-DRILL overlay (no
  // navigation), so closing it returns to the SAME drill item (seed kept).
  await page.getByTestId('interrogative-drill-ref-link').click();
  await expect(
    page.locator(
      `[data-testid="interrogative-drill-rule-overlay"] [data-content-id="${prod.referenceId}"]`,
    ),
  ).toBeVisible();
  await page.getByTestId('interrogative-drill-rule-close').click();
  await expect(page.getByTestId('interrogative-drill-rule-overlay')).toHaveCount(0);
  await expect(prompt).toHaveText(prod.prompt);

  // Back to the SAME seed to exercise an MC item + a wrong-reveal.
  await page.goto(`/drill/interrogative?seed=${SEED}`);
  await expect(prompt).toHaveText(entries[0].prompt);
  await advanceBy(page, entries, mcIdx);
  const mc = entries[mcIdx];
  await expect(prompt).toHaveText(mc.prompt);

  // Pick a WRONG option (any not flagged correct) → reveals the reference answer.
  await page
    .locator('[data-testid="interrogative-drill-option"][data-correct="false"]')
    .first()
    .click();
  await expect(page.getByTestId('interrogative-drill-feedback')).toContainText(mc.answer);
  await page.getByTestId('interrogative-drill-ref-link').click();
  await expect(
    page.locator(
      `[data-testid="interrogative-drill-rule-overlay"] [data-content-id="${mc.referenceId}"]`,
    ),
  ).toBeVisible();
});

test('E-Interrogative-b: the survival-kit nav links to the interrogative drill', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Exam Survival Kit' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Question words' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Question words' }),
  ).toBeVisible();
});
