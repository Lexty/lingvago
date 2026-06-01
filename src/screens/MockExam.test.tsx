import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import i18n from '../i18n/config.ts';
import { db } from '../db/index.ts';
import { loadSurvivalKitState, saveSurvivalKitState } from '../db/survivalKit.ts';
import { MOCK_RUN_KEY, loadMockRun, saveMockRun } from '../db/mockRun.ts';
import { start } from '../modes/mock/timer.ts';
import MockExam from './MockExam.tsx';

function renderScreen(durationMs?: number) {
  return render(
    <MemoryRouter>
      <MockExam durationMs={durationMs} />
    </MemoryRouter>,
  );
}

/** Flush the pending microtasks (async load/save effects) inside act(). */
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  await db.open();
  await Promise.all(db.tables.map((t) => t.clear()));
});

afterEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  vi.useRealTimers();
});

describe('MockExam screen — phased PaperSimulation', () => {
  it('starts at setup with the 90-min explanation and a start button', async () => {
    renderScreen();
    expect(
      await screen.findByRole('heading', { name: 'Mock run', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/90-minute timed exam simulation/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-start')).toBeInTheDocument();
    // No countdown / no scoring shown during setup.
    expect(screen.queryByTestId('mock-clock')).toBeNull();
  });

  it('runs a short timed mock, auto-advances to entry when time hits 0, accepts scores, reviews and saves', async () => {
    vi.useFakeTimers({ now: 0, toFake: ['Date', 'setInterval', 'clearInterval'] });
    renderScreen(2000); // 2-second run
    // Let the mount load effect settle (it scheduled microtasks under fake timers).
    await flush();

    // Start the run.
    await act(async () => {
      fireEvent.click(screen.getByTestId('mock-start'));
    });
    expect(screen.getByTestId('mock-clock')).toHaveTextContent('00:02');

    // Advance past the duration: the tick auto-finishes and moves to entry.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(screen.getByTestId('mock-to-review')).toBeInTheDocument();

    // The in-progress run was cleared when time expired.
    await flush();
    expect(await loadMockRun()).toBeNull();

    // Enter per-group scores.
    fireEvent.change(screen.getByLabelText('Score for I out of 50'), {
      target: { value: '40' },
    });
    fireEvent.change(screen.getByLabelText('Score for II out of 50'), {
      target: { value: '30' },
    });
    fireEvent.change(screen.getByLabelText('Score for III out of 50'), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByLabelText('Score for IV out of 50'), {
      target: { value: '20' },
    });

    // To review: 4-group scores + total + verdict.
    await act(async () => {
      fireEvent.click(screen.getByTestId('mock-to-review'));
    });
    expect(screen.getByTestId('mock-review-score-I')).toHaveTextContent('40');
    expect(screen.getByTestId('mock-review-score-IV')).toHaveTextContent('20');
    expect(screen.getByTestId('mock-review-total')).toHaveTextContent('115 of 200');
    // No threshold set → no verdict.
    expect(screen.getByTestId('mock-verdict')).toHaveTextContent('No verdict yet');

    // Save → written into the WP-A SurvivalKit mock table + history.
    await act(async () => {
      fireEvent.click(screen.getByTestId('mock-save'));
    });
    await waitFor(async () => {
      const kit = await loadSurvivalKitState();
      expect(kit.scores).toEqual({ I: 40, II: 30, III: 25, IV: 20 });
      expect(kit.mockHistory).toHaveLength(1);
      expect(kit.mockHistory[0].total).toBe(115);
    });
    expect(screen.getByTestId('mock-saved')).toBeInTheDocument();

    // After saving, the in-progress run row is GONE (no stale `mockRun` blob).
    await waitFor(async () => {
      expect(await loadMockRun()).toBeNull();
    });
  });

  it('after a saved run, a fresh /mock mount starts clean at setup (no leaked run)', async () => {
    // A completed-and-saved run must not leave a persisted `mockRun` row that
    // would lock a later /mock visit into a phantom run's entry phase (Q001).
    const { unmount } = renderScreen(60_000);
    await flush();
    await act(async () => {
      fireEvent.click(await screen.findByTestId('mock-start'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('mock-finish'));
    });
    fireEvent.change(screen.getByLabelText('Score for I out of 50'), {
      target: { value: '40' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('mock-to-review'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('mock-save'));
    });
    await waitFor(async () => {
      expect(await loadMockRun()).toBeNull();
    });

    // Fresh mount: a new visitor lands on setup, NOT entry/running of a phantom.
    unmount();
    renderScreen(60_000);
    expect(await screen.findByTestId('mock-start')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-clock')).toBeNull();
    expect(screen.queryByTestId('mock-to-review')).toBeNull();
  });

  it('an expired-on-reload run finalizes to entry and clears (does not lock /mock)', async () => {
    // A run whose clock expired while the app was closed must, on the next mount,
    // fold into entry AND drop its anchors — so it cannot be reconstructed
    // forever or bounce the next visit back into the phantom run (Q002).
    vi.useFakeTimers({ now: 1000, toFake: ['Date', 'setInterval', 'clearInterval'] });
    // 60s run begun at t=1000; status still 'running' (finish was never called).
    await saveMockRun(start(1000, 60_000));

    // "Reload" long after expiry: mount fresh at t=120000 (well past 61000).
    vi.setSystemTime(120_000);
    renderScreen(60_000);
    await flush();

    // Folded straight into entry (manual score input), NOT stuck running.
    expect(await screen.findByTestId('mock-to-review')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-clock')).toBeNull();

    // The stale 'running' blob was cleared — a later visit cannot re-read it.
    await waitFor(async () => {
      expect(await loadMockRun()).toBeNull();
    });
  });

  it('shows the «don\'t zero a group» warning when a group is entered as 0', async () => {
    renderScreen(60_000);
    await flush();
    await act(async () => {
      fireEvent.click(await screen.findByTestId('mock-start'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('mock-finish'));
    });
    // entry → enter a zero group.
    fireEvent.change(screen.getByLabelText('Score for I out of 50'), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByLabelText('Score for II out of 50'), {
      target: { value: '40' },
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('mock-to-review'));
    });
    expect(screen.getByTestId('mock-zero-warning')).toBeInTheDocument();
  });

  it('computes the WP-A verdict against the saved thresholds on review', async () => {
    // Persist a threshold via the WP-A state; the screen loads it on mount.
    await saveSurvivalKitState({
      scores: { I: null, II: null, III: null, IV: null },
      threshold: { totalPassPoints: 100, minGroupPoints: null },
      checklist: {},
      mockHistory: [],
    });
    renderScreen(60_000);
    await flush();
    await act(async () => {
      fireEvent.click(await screen.findByTestId('mock-start'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('mock-finish'));
    });
    // Enter a passing total (>= 100).
    for (const [g, v] of [
      ['I', '40'],
      ['II', '40'],
      ['III', '30'],
      ['IV', '20'],
    ] as const) {
      fireEvent.change(screen.getByLabelText(`Score for ${g} out of 50`), {
        target: { value: v },
      });
    }
    await act(async () => {
      fireEvent.click(screen.getByTestId('mock-to-review'));
    });
    expect(screen.getByTestId('mock-verdict')).toHaveTextContent('On track to pass');
  });

  it('reconstructs an in-progress run after a reload (running phase persists)', async () => {
    vi.useFakeTimers({ now: 1000, toFake: ['Date', 'setInterval', 'clearInterval'] });
    // Simulate a run that was started before the reload: 60s run begun at t=1000.
    await saveMockRun(start(1000, 60_000));

    // "Reload": mount the screen fresh at t=11000 (10s in). It should pick up the
    // running phase and show ~50s remaining — NOT the setup screen.
    vi.setSystemTime(11_000);
    renderScreen(60_000);
    await flush();

    expect(screen.queryByTestId('mock-start')).toBeNull();
    const clock = await screen.findByTestId('mock-clock');
    expect(clock).toHaveTextContent('00:50');
  });

  it('does not start a run on partial/empty entry; empty entry yields total 0 of 200', async () => {
    renderScreen(60_000);
    await flush();
    await act(async () => {
      fireEvent.click(await screen.findByTestId('mock-start'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('mock-finish'));
    });
    // Go straight to review with NO scores entered → graceful, total 0.
    await act(async () => {
      fireEvent.click(screen.getByTestId('mock-to-review'));
    });
    expect(screen.getByTestId('mock-review-total')).toHaveTextContent('0 of 200');
    expect(screen.getByTestId('mock-review-score-I')).toHaveTextContent('—');
  });

  it('running phase shows ONLY the clock + pause/finish — NO grading/hints/feedback (AC2 §9.1)', async () => {
    // Hard PaperSimulation invariant: the app NEVER grades or hints DURING the
    // run. The running screen may surface ONLY the countdown + pause/finish.
    // This MUST fail if any scoring / verdict / score-entry surface ever leaks
    // into the running phase.
    await saveSurvivalKitState({
      scores: { I: null, II: null, III: null, IV: null },
      // A threshold is set so a leaked verdict would actually resolve to a
      // pass/risk node — making any in-run verdict leak detectable.
      threshold: { totalPassPoints: 100, minGroupPoints: null },
      checklist: {},
      mockHistory: [],
    });
    renderScreen(60_000);
    await flush();
    await act(async () => {
      fireEvent.click(await screen.findByTestId('mock-start'));
    });

    // The allowed running-phase surfaces ARE present.
    expect(screen.getByTestId('mock-clock')).toBeInTheDocument();
    expect(screen.getByTestId('mock-pause')).toBeInTheDocument();
    expect(screen.getByTestId('mock-finish')).toBeInTheDocument();

    // NO grading / verdict / review surfaces during the run.
    expect(screen.queryByTestId('mock-verdict')).toBeNull();
    expect(screen.queryByTestId('mock-review-total')).toBeNull();
    expect(screen.queryByTestId('mock-zero-warning')).toBeNull();
    // NO manual-entry score inputs leak into the running phase.
    expect(screen.queryByLabelText('Score for I out of 50')).toBeNull();
    expect(screen.queryByLabelText('Score for IV out of 50')).toBeNull();
    // NO review/entry CTA during the run.
    expect(screen.queryByTestId('mock-to-review')).toBeNull();
  });

  it('does NOT show any day-countdown to the exam (SPEC §16 non-goal)', async () => {
    renderScreen(60_000);
    await screen.findByRole('heading', { name: 'Mock run', level: 1 });
    expect(
      screen.queryByText(/\d+\s*days?\s*(left|until|to go|remaining)/i),
    ).toBeNull();
  });
});

describe('MockExam — in-progress run persistence key', () => {
  it('persists the run under the dedicated mockRun settings key while running', async () => {
    renderScreen(60_000);
    await flush();
    await act(async () => {
      fireEvent.click(await screen.findByTestId('mock-start'));
    });
    await waitFor(async () => {
      expect(await db.settings.get(MOCK_RUN_KEY)).toBeDefined();
    });
  });
});
