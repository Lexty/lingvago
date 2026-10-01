import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
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

function renderSettings() {
  render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );
}

describe('Settings', () => {
  it('offers a way back to the home screen', () => {
    renderSettings();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/');
  });

  it('renders localized titles and labels (EN)', () => {
    renderSettings();
    expect(
      screen.getByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auto' })).toBeInTheDocument();
  });

  it('re-renders the whole screen in RU after switching language', async () => {
    renderSettings();

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
