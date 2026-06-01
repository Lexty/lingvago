import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n, { LANG_STORAGE_KEY } from '../i18n/config.ts';
import LanguageToggle from './LanguageToggle.tsx';

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('en');
});

afterEach(() => {
  localStorage.clear();
});

describe('LanguageToggle', () => {
  it('renders the localized language label (EN)', () => {
    render(<LanguageToggle />);
    expect(screen.getByText('Language')).toBeInTheDocument();
  });

  it('marks the active language as pressed', () => {
    render(<LanguageToggle />);
    const en = screen.getByRole('button', { name: 'English' });
    const ru = screen.getByRole('button', { name: 'Русский' });
    expect(en).toHaveAttribute('aria-pressed', 'true');
    expect(ru).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches the language, persists it, and re-renders localized strings', async () => {
    render(<LanguageToggle />);

    await act(async () => {
      screen.getByRole('button', { name: 'Русский' }).click();
    });

    expect(i18n.language).toBe('ru');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('ru');
    // Label is now localized to RU.
    expect(screen.getByText('Язык')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Русский' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
