import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../i18n/config.ts';
import Settings from './Settings.tsx';

beforeEach(async () => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  await i18n.changeLanguage('en');
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('Settings', () => {
  it('renders localized titles and labels (EN)', () => {
    render(<Settings />);
    expect(
      screen.getByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auto' })).toBeInTheDocument();
  });

  it('re-renders the whole screen in RU after switching language', async () => {
    render(<Settings />);

    await act(async () => {
      await i18n.changeLanguage('ru');
    });

    expect(
      screen.getByRole('heading', { name: 'Настройки' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Тема')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Авто' })).toBeInTheDocument();
  });
});
