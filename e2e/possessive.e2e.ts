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
 * number person variant AND the dele↔dela owner contrast), AND reaching the HARD
 * L3 CONTEXT tier — a multi-line dialogue prompt with NO cue, graded by typed
 * production — asserting the correct + wrong-reveal feedback AND that the feedback
 * opens the single `ref-possessive` rule card as an IN-DRILL overlay (open →
 * visible → close → SAME prompt). The expected items are recomputed from the SAME
 * pure generator the screen uses, fed by the SHIPPED bundle (both the cue-based
 * `possessives` AND the L3 `possessiveContext` dialogues) — no duplicated answer
 * table to drift. Per AC4 the test
 * only asserts MC contrasts that are actually assemblable from the fixture; it
 * never asserts a `minha`↔`meu` (cross-gender) or `seu`↔`dele` (cross-family)
 * pair.
 */
const SEED = 'e2e-poss-3';
const PER_LEVEL = 4;

const here = dirname(fileURLToPath(import.meta.url));

interface Entry {
  item: PossessiveItem;
  level: string;
  mode: 'production' | 'mc';
  kind: string;
  isContext: boolean;
  prompt: string;
  answer: string;
  options: string[] | null;
  referenceId: string;
}

/**
 * Recompute the exact L1→L3 session the app generates from the shipped bundle —
 * fed BOTH the cue-based `possessives` AND the L3 `possessiveContext` dialogues,
 * exactly as `PossessiveDrill.buildPossessiveEntries` feeds the generator (so the
 * L3 walk reaches the HARD context tier here too).
 */
function expectedEntries(): Entry[] {
  const bundlePath = resolve(here, '../public/content.v6.json');
  const bundle = JSON.parse(readFileSync(bundlePath, 'utf8')) as ContentBundle;
  const entries: Entry[] = [];
  for (const level of POSS_LEVELS) {
    const items = generateSession(`${SEED}-${level}`, bundle.possessives, {
      count: PER_LEVEL,
      level,
      context: bundle.possessiveContext,
    });
    for (const item of items) {
      entries.push({
        item,
        level: item.level,
        mode: item.drill.mode,
        kind: item.kind,
        isContext: item.isContext,
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

  // Coverage guard: the L3 tier is the HARD CONTEXT tier — every L3 item is a
  // multi-line dialogue (carries `\n`), graded by typed PRODUCTION, with NO cue
  // prefix (the owner is inferred from the conversation).
  const l3 = entries.filter((e) => e.level === 'L3');
  expect(l3.length).toBeGreaterThan(0);
  for (const e of l3) {
    expect(e.isContext).toBe(true);
    expect(e.mode).toBe('production');
    expect(e.prompt).toContain('\n');
    expect(e.prompt.startsWith('(')).toBe(false);
  }

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
  const ctxIdx = entries.findIndex((e) => e.isContext);
  expect(ctxIdx).toBeGreaterThanOrEqual(0);

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

  // Back to the SAME seed and walk the curve to the HARD L3 CONTEXT tier: a
  // multi-line dialogue prompt (NO cue), graded by typed production. The screen
  // fed the generator the shipped `possessiveContext`, so the L1→L3 walk REACHES
  // this item exactly as recomputed here.
  await page.goto(`/drill/possessive?seed=${SEED}`);
  await expect(prompt).toHaveText(entries[0].prompt);
  await advanceBy(page, entries, ctxIdx);
  const ctx = entries[ctxIdx];
  await expect(page.getByTestId('possessive-drill-level')).toHaveText('Level L3');
  // Both dialogue turns render (the multi-line `\n` dialogue is shown in full).
  for (const turn of ctx.prompt.split('\n')) {
    await expect(prompt).toContainText(turn);
  }
  // Typed production grades correct against the single authored answer.
  await page.getByTestId('possessive-drill-answer').fill(ctx.answer);
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByTestId('possessive-drill-feedback')).toContainText('Correct');
});

test('E-Possessive-c: no horizontal overflow on the drill at a 390px phone width (AC1)', async ({
  page,
}) => {
  // Reproduces the live iPhone bug: the large display-font prompt — the `____`
  // cloze blank, long Portuguese words, and especially the multi-line L3 dialogue
  // — used to push the layout past a narrow viewport, forcing the user to zoom
  // out. With `overflow-wrap`/`word-break` on `.prompt` (+ the defensive
  // `overflow-x: clip` on the screen frame), the document must not be
  // horizontally scrollable at a ~390px phone width.
  await page.setViewportSize({ width: 390, height: 844 });

  const entries = expectedEntries();
  const ctxIdx = entries.findIndex((e) => e.isContext);
  expect(ctxIdx).toBeGreaterThanOrEqual(0);

  await page.goto(`/drill/possessive?seed=${SEED}`);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Possessives' }),
  ).toBeVisible();
  await waitForServiceWorkerActive(page);

  const prompt = page.getByTestId('possessive-drill-prompt');
  await expect(prompt).toHaveText(entries[0].prompt);

  async function assertNoHorizontalScroll() {
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    // No horizontal scroll: scrollWidth must not exceed clientWidth.
    expect(overflow).toBeLessThanOrEqual(0);
  }

  // Worst case at the entry item (carries the `____` cloze blank).
  await assertNoHorizontalScroll();

  // Walk to the HARD L3 CONTEXT tier — the multi-line dialogue prompt — which is
  // the longest, most overflow-prone content the drill renders.
  await advanceBy(page, entries, ctxIdx);
  await expect(page.getByTestId('possessive-drill-level')).toHaveText('Level L3');
  await assertNoHorizontalScroll();

  // Stress the worst case directly: force the prompt to hold a pathologically
  // long UNBREAKABLE token (a very wide `____` cloze blank / a runaway Portuguese
  // compound). This is exactly what triggered the live sideways scroll. The
  // `.prompt` `overflow-wrap: break-word` + `word-break: break-word` must wrap it
  // so the document is still not horizontally scrollable; without that rule this
  // token would force `scrollWidth > clientWidth` and this assertion would fail.
  await prompt.evaluate((el) => {
    el.textContent = '_'.repeat(120) + ' ' + 'a'.repeat(120);
  });
  await assertNoHorizontalScroll();
  // And the prompt box itself stays within its container (no element-level spill).
  const promptOverflow = await prompt.evaluate(
    (el) => el.scrollWidth - el.clientWidth,
  );
  expect(promptOverflow).toBeLessThanOrEqual(0);
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
