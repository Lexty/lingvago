import { expect, test } from '@playwright/test';

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
