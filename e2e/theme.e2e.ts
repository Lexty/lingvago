import { expect, test } from '@playwright/test';
import { readStoredTheme } from './helpers';

/**
 * E2 — Theme (SPEC §10.5 / src/styles/useTheme.ts).
 *
 * Light/Dark set data-theme="light"/"dark"; Auto REMOVES data-theme so the
 * prefers-color-scheme path wins. The selection persists across reload via
 * localStorage `lg.theme`. Driven through the real Settings segmented control.
 */

const html = (page: import('@playwright/test').Page) => page.locator('html');

test.beforeEach(async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('Light sets data-theme="light" and persists across reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Light' }).click();
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
  expect(await readStoredTheme(page)).toBe('light');

  await page.reload();
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
});

test('Dark sets data-theme="dark" and persists across reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  expect(await readStoredTheme(page)).toBe('dark');

  await page.reload();
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
});

test('Auto REMOVES data-theme (semantic guard) and persists across reload', async ({ page }) => {
  // First force an explicit theme so there is an attribute to remove.
  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');

  // Auto must follow the system → it must NOT set data-theme; it removes it.
  await page.getByRole('button', { name: 'Auto' }).click();
  await expect(html(page)).not.toHaveAttribute('data-theme', /.*/);
  expect(await readStoredTheme(page)).toBe('auto');

  await page.reload();
  // The persisted `auto` preference must still leave NO data-theme after reload.
  await expect(html(page)).not.toHaveAttribute('data-theme', /.*/);
});
