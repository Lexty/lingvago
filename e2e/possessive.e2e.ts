import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { waitForServiceWorkerActive } from './helpers';
import { POSS_LEVELS, generateSession } from '../src/modes/possessive/index.ts';
import { referenceIdFor } from '../src/modes/possessive/progress.ts';
import type { PossessiveItem } from '../src/modes/possessive/index.ts';
import type { ContentBundle } from '../src/content/types.ts';

/**
 * E-Possessive — production-first possessive cue-cloze drill (SPEC §1.2, WP-C).
 *
 * Plays a DETERMINISTIC seeded session end-to-end across the §4.8 L1→L3 curve,
 * exercising BOTH a typed PRODUCTION item and a parity MC item (a same-gender/
 * number person variant AND the dele↔dela owner contrast), asserting the correct
 * + wrong-reveal feedback AND that the feedback opens the single `ref-possessive`
 * rule card as an IN-DRILL overlay (open → visible → close → SAME prompt). The
 * expected items are recomputed from the SAME pure generator the screen uses, fed
 * by the SHIPPED bundle — no duplicated answer table to drift. Per AC4 the test
 * only asserts MC contrasts that are actually assemblable from the fixture; it
 * never asserts a `minha`↔`meu` (cross-gender) or `seu`↔`dele` (cross-family)
 * pair.
 */
const SEED = 'e2e-poss-0';
const PER_LEVEL = 4;

const here = dirname(fileURLToPath(import.meta.url));

interface Entry {
  item: PossessiveItem;
  level: string;
  mode: 'production' | 'mc';
  kind: string;
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
  for (const level of POSS_LEVELS) {
    const items = generateSession(`${SEED}-${level}`, bundle.possessives, {
      count: PER_LEVEL,
      level,
    });
    for (const item of items) {
      entries.push({
        item,
        level: item.level,
        mode: item.drill.mode,
        kind: item.kind,
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
    await page.getByTestId('possessive-drill-answer').fill(entry.answer);
    await page.getByRole('button', { name: 'Check' }).click();
  } else {
    await page
      .locator('[data-testid="possessive-drill-option"][data-correct="true"]')
      .click();
  }
  await expect(page.getByTestId('possessive-drill-feedback')).toContainText('Correct');
}

async function advanceBy(page: Page, entries: Entry[], steps: number) {
  for (let i = 0; i < steps; i++) {
    await answerCorrect(page, entries[i]);
    await page.getByRole('button', { name: 'Next' }).click();
  }
}

test('E-Possessive: plays a deterministic L1–L3 session with production + MC and opens the rule overlay', async ({
  page,
}) => {
  const entries = expectedEntries();
  expect(entries.length).toBe(POSS_LEVELS.length * PER_LEVEL);

  // Coverage guard: the pinned seed MUST exercise BOTH modes and all 3 levels.
  expect(entries.map((e) => e.mode)).toContain('production');
  expect(entries.map((e) => e.mode)).toContain('mc');
  expect(new Set(entries.map((e) => e.level))).toEqual(new Set(['L1', 'L2', 'L3']));

  // The seed exercises BOTH a determiner MC (same gender+number, different
  // person) and a dele MC (the dele↔dela owner contrast) — the only contrasts the
  // shared parity module can assemble from this fixture.
  const detMC = entries.find((e) => e.mode === 'mc' && e.kind === 'determiner');
  const deleMC = entries.find((e) => e.mode === 'mc' && e.kind === 'dele');
  expect(detMC).toBeDefined();
  expect(deleMC).toBeDefined();
  // The dele MC is exactly the {dele, dela} owner contrast — equal length 4,
  // never a cross-family seu↔dele pair.
  expect(new Set(deleMC!.options)).toEqual(new Set(['dele', 'dela']));
  // The determiner MC options are all the SAME canonical length (parity-feasible,
  // same gender+number, different person) — never a cross-gender minha↔meu pair.
  const detLens = new Set(detMC!.options!.map((o) => o.length));
  expect(detLens.size).toBe(1);

  const prodIdx = entries.findIndex((e) => e.mode === 'production');
  const mcIdx = entries.findIndex((e) => e.mode === 'mc');

  await page.goto(`/drill/possessive?seed=${SEED}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Possessives' }),
  ).toBeVisible();
  await waitForServiceWorkerActive(page);

  const prompt = page.getByTestId('possessive-drill-prompt');
  await expect(prompt).toHaveText(entries[0].prompt);
  await expect(page.getByTestId('possessive-drill-level')).toHaveText(
    `Level ${entries[0].level}`,
  );

  // Play to the first PRODUCTION item; answer it correctly + open its rule card.
  await advanceBy(page, entries, prodIdx);
  const prod = entries[prodIdx];
  await expect(prompt).toHaveText(prod.prompt);
  await page.getByTestId('possessive-drill-answer').fill(prod.answer);
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByTestId('possessive-drill-feedback')).toContainText('Correct');

  // The feedback opens the ref-possessive rule as an IN-DRILL overlay (no
  // navigation), so closing it returns to the SAME drill item (seed kept).
  await page.getByTestId('possessive-drill-ref-link').click();
  await expect(
    page.locator(
      `[data-testid="possessive-drill-rule-overlay"] [data-content-id="${prod.referenceId}"]`,
    ),
  ).toBeVisible();
  await page.getByTestId('possessive-drill-rule-close').click();
  await expect(page.getByTestId('possessive-drill-rule-overlay')).toHaveCount(0);
  await expect(prompt).toHaveText(prod.prompt);

  // Back to the SAME seed to exercise an MC item + a wrong-reveal.
  await page.goto(`/drill/possessive?seed=${SEED}`);
  await expect(prompt).toHaveText(entries[0].prompt);
  await advanceBy(page, entries, mcIdx);
  const mc = entries[mcIdx];
  await expect(prompt).toHaveText(mc.prompt);

  // Pick a WRONG option (any not flagged correct) → reveals the reference answer.
  await page
    .locator('[data-testid="possessive-drill-option"][data-correct="false"]')
    .first()
    .click();
  await expect(page.getByTestId('possessive-drill-feedback')).toContainText(mc.answer);
  await page.getByTestId('possessive-drill-ref-link').click();
  await expect(
    page.locator(
      `[data-testid="possessive-drill-rule-overlay"] [data-content-id="${mc.referenceId}"]`,
    ),
  ).toBeVisible();
});

test('E-Possessive-b: the survival-kit nav links to the possessive drill', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Exam Survival Kit' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Possessives' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Possessives' }),
  ).toBeVisible();
});
