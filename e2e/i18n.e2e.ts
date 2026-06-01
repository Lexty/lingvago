import { expect, test } from '@playwright/test';
import { readStoredLang } from './helpers';

/**
 * E3 — Localization (SPEC §10.5 / src/i18n/config.ts + LanguageToggle.tsx).
 *
 * The RU/EN toggle changes the UI language live (react-i18next) and persists
 * `lg.lang`; the choice survives reload. We assert against real translated UI
 * strings (Settings title: "Settings" ↔ "Настройки").
 */

test('RU/EN toggle switches UI language and persists across reload', async ({ page }) => {
  await page.goto('/settings');

  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();

  // Switch to Russian via the real LanguageToggle button (label is the same
  // in both locales: "Русский").
  await page.getByRole('button', { name: 'Русский' }).click();
  await expect(heading).toHaveText('Настройки');
  expect(await readStoredLang(page)).toBe('ru');

  // Persists across reload.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Настройки');

  // Switch back to English.
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
  expect(await readStoredLang(page)).toBe('en');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
});
