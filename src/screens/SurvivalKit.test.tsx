import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import i18n from '../i18n/config.ts';
import { db } from '../db/index.ts';
import { SURVIVAL_KIT_KEY, loadSurvivalKitState } from '../db/survivalKit.ts';
import SurvivalKit from './SurvivalKit.tsx';

function renderScreen() {
  return render(
    <MemoryRouter>
      <SurvivalKit />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
});

afterEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('SurvivalKit screen', () => {
  it('renders the landing heading, daily focus, checklist, table, and no-verdict by default', async () => {
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: 'Exam Survival Kit', level: 1 }),
    ).toBeInTheDocument();
    // Daily §1 «focus on today» reminder (NOT a day-countdown — SPEC §16).
    expect(screen.getByText('Focus on today')).toBeInTheDocument();
    // 4-group checklist present.
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    // No threshold set → no verdict yet.
    expect(screen.getByText('No verdict yet')).toBeInTheDocument();
  });

  it('does NOT show any day-countdown to the exam (SPEC §16 non-goal)', async () => {
    renderScreen();
    await screen.findByRole('heading', { name: 'Exam Survival Kit', level: 1 });
    // No "N days left / until the exam" countdown UI anywhere (a number of days
    // remaining). The calm copy may say "no countdowns"; what's forbidden is an
    // actual day-countdown to the exam date.
    expect(screen.queryByText(/\d+\s*days?\s*(left|until|to go|remaining)/i)).toBeNull();
    expect(screen.queryByText(/days? (left|until the exam|to (the )?exam)/i)).toBeNull();
  });

  it('persists an entered group score to IndexedDB (mock-results table)', async () => {
    renderScreen();
    await screen.findByRole('heading', { name: 'Exam Survival Kit', level: 1 });

    const input = screen.getByLabelText('Score for I out of 50');
    fireEvent.change(input, { target: { value: '40' } });

    await waitFor(async () => {
      const stored = await loadSurvivalKitState();
      expect(stored.scores.I).toBe(40);
    });
  });

  it('shows the «don\'t zero a group» warning when a group is entered as 0', async () => {
    renderScreen();
    await screen.findByRole('heading', { name: 'Exam Survival Kit', level: 1 });

    expect(screen.queryByText(/Don't zero a group/)).toBeNull();
    const input = screen.getByLabelText('Score for II out of 50');
    fireEvent.change(input, { target: { value: '0' } });

    expect(await screen.findByText(/Don't zero a group/)).toBeInTheDocument();
  });

  it('computes a pass verdict once a met threshold is set', async () => {
    renderScreen();
    await screen.findByRole('heading', { name: 'Exam Survival Kit', level: 1 });

    // Enter scores totalling 160, then a total threshold of 100 → pass.
    for (const [group, value] of [
      ['I', '40'],
      ['II', '40'],
      ['III', '40'],
      ['IV', '40'],
    ] as const) {
      const cell = screen.getByLabelText(`Score for ${group} out of 50`);
      fireEvent.change(cell, { target: { value } });
    }
    const total = screen.getByLabelText('Total points required to pass, out of 200');
    fireEvent.change(total, { target: { value: '100' } });

    expect(await screen.findByText('On track to pass')).toBeInTheDocument();
  });

  it('re-renders localized copy after switching to RU', async () => {
    renderScreen();
    await screen.findByRole('heading', { name: 'Exam Survival Kit', level: 1 });

    await act(async () => {
      await i18n.changeLanguage('ru');
    });

    expect(
      screen.getByRole('heading', { name: 'Набор для экзамена', level: 1 }),
    ).toBeInTheDocument();
  });

  it('renders gracefully (no crash) from an invalid persisted state', async () => {
    // Poison the stored row before mounting.
    await db.settings.put({
      key: SURVIVAL_KIT_KEY,
      value: {
        scores: { I: 'oops', II: 9999, III: -3 },
        threshold: { totalPassPoints: 'x', minGroupPoints: 'y' },
        checklist: { 'group-I': 'not-a-bool' },
      },
    });

    renderScreen();

    // The screen still mounts; invalid scores collapse to empty inputs and the
    // invalid thresholds collapse to unknown → no verdict (not a crash/fail).
    expect(
      await screen.findByRole('heading', { name: 'Exam Survival Kit', level: 1 }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('No verdict yet')).toBeInTheDocument();
    });
    const firstScore = screen.getByLabelText('Score for I out of 50') as HTMLInputElement;
    expect(firstScore.value).toBe('');
  });

  it('links from the dashboard into the Reference screen (AC6)', async () => {
    renderScreen();
    await screen.findByRole('heading', { name: 'Exam Survival Kit', level: 1 });

    const referenceLink = screen.getByRole('link', { name: 'Reference' });
    expect(referenceLink).toHaveAttribute('href', '/reference');
  });

  it('exposes a mock-results table with a group + score column', async () => {
    renderScreen();
    await screen.findByRole('heading', { name: 'Exam Survival Kit', level: 1 });
    const table = screen.getByRole('table');
    expect(within(table).getByText('Group')).toBeInTheDocument();
    expect(within(table).getByText('Score (0–50)')).toBeInTheDocument();
  });
});
