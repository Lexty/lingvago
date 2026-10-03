import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { unzipSync } from 'fflate';
import initSqlJs from 'sql.js';

/**
 * Lesson packs: from the home screen into a unit, write a whole sentence from
 * cue words, and see the three-way check (right / accent slip / wrong).
 */
test('E-Pack: home → unit 18 → write a sentence from cue words', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'What shall we practise?' })).toBeVisible();

  await page.getByTestId('home-pack-unit-18').click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Comparisons and trips' }),
  ).toBeVisible();

  await page.goto('/pack/unit-18/sentences?seed=e2e');
  const prompt = page.getByTestId('pack-drill-prompt');
  await expect(prompt).toBeVisible();

  // A wrong answer reveals the model sentence and a one-line reason.
  await page.getByTestId('pack-drill-answer').fill('não sei');
  await page.getByRole('button', { name: 'Check' }).click();
  const feedback = page.getByTestId('pack-drill-feedback');
  await expect(feedback).toHaveAttribute('data-outcome', 'wrong');
  const model = (await page.getByTestId('pack-drill-expected').textContent()) ?? '';
  expect(model.length).toBeGreaterThan(10);
  await expect(page.getByTestId('pack-drill-why')).not.toBeEmpty();

  // The session is pinned by the seed: reload and answer the same item right,
  // first without its accents, then exactly.
  await page.reload();
  await page.getByTestId('pack-drill-answer').fill(model.normalize('NFD').replace(/[̀-ͯ]/g, ''));
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(feedback).toHaveAttribute('data-outcome', 'accent');

  await page.reload();
  await page.getByTestId('pack-drill-answer').fill(model);
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(feedback).toHaveAttribute('data-outcome', 'correct');
});

test('E-Pack-b: the home screen offers both views and remembers the choice', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('home-view-mechanics').click();
  await expect(page.getByTestId('home-group-unit-18-comparisons')).toBeVisible();
  await expect(page.getByTestId('home-topic-numbers')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('home-view-mechanics')).toHaveAttribute('aria-pressed', 'true');
});

test('E-Pack-c: the unit words download as an Anki package', async ({ page }) => {
  await page.goto('/pack/unit-19');
  const download = page.waitForEvent('download');
  await page.getByTestId('pack-anki-download').click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('lingvago-unidade-19.en.apkg');
  const files = unzipSync(new Uint8Array(await readFile((await file.path())!)));
  const SQL = await initSqlJs();
  const db = new SQL.Database(files['collection.anki2']);
  const [[count]] = db.exec('SELECT count(*) FROM notes')[0].values;
  const [[flds]] = db.exec("SELECT flds FROM notes WHERE guid = 'lingvago:unit-19:ninguem'")[0].values;
  db.close();
  expect(count).toBeGreaterThan(50);
  expect((flds as string).split('\x1f').slice(0, 2)).toEqual(['ninguém', 'nobody']);
  await expect(page.getByTestId('pack-anki-status')).toContainText('lingvago-unidade-19.en.apkg');
});
