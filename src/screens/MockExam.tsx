import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  DEFAULT_DURATION_MS,
  type MockResult,
  type TimerState,
  createMockResult,
  finish as finishTimer,
  isExpired,
  pause as pauseTimer,
  remainingMs,
  resume as resumeTimer,
  reviewMock,
  saveMockResult,
  start as startTimer,
} from '../modes/mock/index.ts';
import {
  clearMockRun,
  loadMockRun,
  saveMockRun,
} from '../db/mockRun.ts';
import {
  GROUP_MAX,
  GROUPS,
  type Group,
  type GroupScores,
  type PassThreshold,
  TOTAL_MAX,
  type Verdict,
  coerceGroupScore,
  emptyGroupScores,
  emptyThreshold,
  totalScore,
} from './survivalKit.ts';
import { loadSurvivalKitState } from '../db/survivalKit.ts';
import styles from './MockExam.module.css';

/** Phased flow of one PaperSimulation run (SPEC §9.1). */
type Phase = 'setup' | 'running' | 'entry' | 'review';

/** Live-tick interval for the countdown display (ms). Display only — all time
 * math stays in the pure timer domain against the real clock. */
const TICK_MS = 250;

/**
 * Per-verdict view descriptor (variant CSS-module key + i18n key stem), mirrored
 * from SurvivalKit so the pass/risk/no-verdict branching is declared ONCE.
 */
const VERDICT_VIEW: Record<
  Verdict,
  { variant: 'verdictPass' | 'verdictRisk' | 'verdictNone'; key: string }
> = {
  pass: { variant: 'verdictPass', key: 'pass' },
  risk: { variant: 'verdictRisk', key: 'risk' },
  'no-verdict': { variant: 'verdictNone', key: 'none' },
};

/** A unique-enough id for a completed run (deterministic path uses completedAt). */
function freshRunId(now: number): string {
  return `mock-${now.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Format remaining milliseconds as `mm:ss` (clamped, never negative). */
function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export interface MockExamProps {
  /**
   * Run duration in ms. Defaults to the real 90-min length; the deterministic
   * e2e injects a short duration (via App's `?duration=` route param) so the run
   * reaches the entry phase without a real 90-minute wait.
   */
  durationMs?: number;
}

/**
 * MockExam — the timed PaperSimulation shell (route `/mock`, MVP_PLAN WP-D /
 * SPEC §9.1). Phased flow: setup → running → entry → review.
 *
 * Hard invariant: the app NEVER grades and NEVER hints DURING the run — the
 * running phase shows ONLY the countdown + pause/finish. The user solves the
 * real exam on paper/matrix, then MANUALLY enters their per-group scores; the
 * review reuses the WP-A verdict + the «don't zero a group» minimum rule and
 * writes the result into the WP-A SurvivalKit mock table via `saveMockResult`.
 *
 * The countdown SURVIVES a reload: the run's timer anchors are persisted, and on
 * mount we recompute `remaining` from those anchors + the live clock (the pure
 * `timer.ts`), never from a live counter a reload would have destroyed. SPEC §16
 * non-goal: NO day-countdown anywhere here.
 */
export default function MockExam({ durationMs = DEFAULT_DURATION_MS }: MockExamProps) {
  const { t } = useTranslation();

  const [phase, setPhase] = useState<Phase>('setup');
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [scores, setScores] = useState<GroupScores>(emptyGroupScores);
  const [threshold, setThreshold] = useState<PassThreshold>(emptyThreshold);
  const [saved, setSaved] = useState(false);
  // Drives the mm:ss re-render each tick (the value itself is derived from the
  // pure timer against `Date.now()`; this just forces the interval re-render).
  const [, setNowTick] = useState(0);

  // Gate run-persistence until the initial reload-reconstruction has settled, so
  // a fresh setup render never clobbers a persisted in-progress run.
  const loadedRef = useRef(false);

  // On mount: reconstruct an in-progress run from persisted anchors (reload
  // survival) and pull the saved thresholds for the review verdict.
  useEffect(() => {
    let active = true;
    void Promise.all([loadMockRun(), loadSurvivalKitState()])
      .then(([run, kit]) => {
        if (!active) {
          return;
        }
        setThreshold(kit.threshold);
        if (run !== null && run.status !== 'finished') {
          // A run was in progress when the app was reloaded: restore it. If the
          // clock already expired while away, PIN it to a finished state and
          // fold straight into entry, then drop the persisted anchors so the
          // phantom run can never hijack a later /mock visit (mirrors the
          // live-tick auto-finish path).
          if (isExpired(run, Date.now())) {
            setTimer(finishTimer(run, Date.now()));
            setPhase('entry');
            void clearMockRun().catch((err: unknown) => {
              console.error('mock-run clear failed', err);
            });
          } else {
            setTimer(run);
            setPhase('running');
          }
        }
      })
      .catch((err: unknown) => {
        // A read failure must never crash the screen; stay on setup.
        console.error('mock-run load failed', err);
      })
      .finally(() => {
        loadedRef.current = true;
      });
    return () => {
      active = false;
    };
  }, []);

  // Persist the in-progress run on every timer change (so a reload mid-run can
  // reconstruct it). A finished/cleared run is removed by the explicit handlers.
  useEffect(() => {
    if (!loadedRef.current || timer === null || phase !== 'running') {
      return;
    }
    void saveMockRun(timer).catch((err: unknown) => {
      console.error('mock-run save failed', err);
    });
  }, [timer, phase]);

  // Live tick ONLY while actively running (paused needs no tick). The tick reads
  // the real clock; if it has expired, auto-advance to the entry phase.
  useEffect(() => {
    if (phase !== 'running' || timer === null || timer.status !== 'running') {
      return;
    }
    const id = setInterval(() => {
      const now = Date.now();
      if (isExpired(timer, now)) {
        // Time's up: pin a finish at the real clock and move to manual entry.
        setTimer((prev) => (prev === null ? prev : finishTimer(prev, now)));
        void clearMockRun().catch((err: unknown) => {
          console.error('mock-run clear failed', err);
        });
        setPhase('entry');
        return;
      }
      setNowTick(now);
    }, TICK_MS);
    return () => {
      clearInterval(id);
    };
  }, [phase, timer]);

  const handleStart = useCallback(() => {
    const now = Date.now();
    setTimer(startTimer(now, durationMs));
    setPhase('running');
  }, [durationMs]);

  const handlePause = useCallback(() => {
    setTimer((prev) => (prev === null ? prev : pauseTimer(prev, Date.now())));
  }, []);

  const handleResume = useCallback(() => {
    setTimer((prev) => (prev === null ? prev : resumeTimer(prev, Date.now())));
  }, []);

  const handleFinish = useCallback(() => {
    setTimer((prev) => (prev === null ? prev : finishTimer(prev, Date.now())));
    void clearMockRun().catch((err: unknown) => {
      console.error('mock-run clear failed', err);
    });
    setPhase('entry');
  }, []);

  const setGroupScore = useCallback((group: Group, raw: string) => {
    setScores((prev) => ({ ...prev, [group]: coerceGroupScore(raw) }));
  }, []);

  const handleReview = useCallback(() => {
    setPhase('review');
  }, []);

  const handleSave = useCallback(() => {
    const now = Date.now();
    const durationSec =
      timer !== null ? Math.round((timer.durationMs - remainingMs(timer, now)) / 1000) : 0;
    const result: MockResult = createMockResult({
      id: freshRunId(now),
      completedAt: now,
      scores,
      durationSec,
    });
    void saveMockResult(result)
      .then(() => {
        setSaved(true);
        // The committed run's anchors are no longer needed: drop them so the
        // next /mock visit starts clean at setup (defence-in-depth — finish /
        // expiry already cleared them, but a save must leave NO stale row).
        return clearMockRun();
      })
      .catch((err: unknown) => {
        console.error('mock-result save failed', err);
      });
  }, [scores, timer]);

  /** Format a nullable score for a controlled input. */
  const inputValue = (value: number | null): string =>
    value === null ? '' : String(value);

  const remaining = timer !== null ? remainingMs(timer, Date.now()) : 0;
  const total = totalScore(scores);
  const review = reviewMock(scores, threshold);
  const verdictView = VERDICT_VIEW[review.verdict];

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('mock.title')}</h1>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            {t('mock.nav.home')}
          </Link>
        </nav>
      </header>

      {phase === 'setup' && (
        <section className={styles.card} aria-labelledby="mock-setup-label">
          <p id="mock-setup-label" className={styles.label}>
            {t('mock.setup.label')}
          </p>
          <p className={styles.body}>{t('mock.setup.body')}</p>
          <p className={styles.hint}>{t('mock.setup.hint')}</p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleStart}
            data-testid="mock-start"
          >
            {t('mock.setup.start')}
          </button>
        </section>
      )}

      {phase === 'running' && timer !== null && (
        <section className={styles.card} aria-labelledby="mock-running-label">
          <p id="mock-running-label" className={styles.label}>
            {t('mock.running.label')}
          </p>
          {/* Running phase shows ONLY the countdown + controls — NO hints, NO
              grading, NO day-countdown (SPEC §9.1 / §16). */}
          <p
            className={styles.clock}
            role="timer"
            aria-label={t('mock.running.remainingAria')}
            data-testid="mock-clock"
          >
            {formatClock(remaining)}
          </p>
          <div className={styles.controls}>
            {timer.status === 'paused' ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleResume}
                data-testid="mock-resume"
              >
                {t('mock.running.resume')}
              </button>
            ) : (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handlePause}
                data-testid="mock-pause"
              >
                {t('mock.running.pause')}
              </button>
            )}
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleFinish}
              data-testid="mock-finish"
            >
              {t('mock.running.finish')}
            </button>
          </div>
        </section>
      )}

      {phase === 'entry' && (
        <section className={styles.card} aria-labelledby="mock-entry-label">
          <p id="mock-entry-label" className={styles.label}>
            {t('mock.entry.label')}
          </p>
          <p className={styles.hint}>{t('mock.entry.hint')}</p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.th}>
                  {t('mock.entry.groupColumn')}
                </th>
                <th scope="col" className={styles.th}>
                  {t('mock.entry.scoreColumn')}
                </th>
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((group) => (
                <tr key={group}>
                  <th scope="row" className={styles.td}>
                    {t(`mock.group.${group}`)}
                  </th>
                  <td className={styles.td}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={GROUP_MAX}
                      className={styles.scoreInput}
                      aria-label={t('mock.entry.scoreAria', { group })}
                      value={inputValue(scores[group])}
                      onChange={(event) => {
                        setGroupScore(group, event.target.value);
                      }}
                    />
                  </td>
                </tr>
              ))}
              <tr className={styles.totalRow}>
                <th scope="row" className={styles.td}>
                  {t('mock.entry.total')}
                </th>
                <td className={styles.td}>
                  {t('mock.entry.totalOf', { score: total, max: TOTAL_MAX })}
                </td>
              </tr>
            </tbody>
          </table>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleReview}
            data-testid="mock-to-review"
          >
            {t('mock.entry.review')}
          </button>
        </section>
      )}

      {phase === 'review' && (
        <section className={styles.card} aria-labelledby="mock-review-label">
          <p id="mock-review-label" className={styles.label}>
            {t('mock.review.label')}
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.th}>
                  {t('mock.entry.groupColumn')}
                </th>
                <th scope="col" className={styles.th}>
                  {t('mock.entry.scoreColumn')}
                </th>
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((group) => (
                <tr key={group}>
                  <th scope="row" className={styles.td}>
                    {t(`mock.group.${group}`)}
                  </th>
                  <td className={styles.td} data-testid={`mock-review-score-${group}`}>
                    {scores[group] === null
                      ? t('mock.review.unset')
                      : scores[group]}
                  </td>
                </tr>
              ))}
              <tr className={styles.totalRow}>
                <th scope="row" className={styles.td}>
                  {t('mock.entry.total')}
                </th>
                <td className={styles.td} data-testid="mock-review-total">
                  {t('mock.entry.totalOf', { score: total, max: TOTAL_MAX })}
                </td>
              </tr>
            </tbody>
          </table>

          {/* «Don't zero a group» minimum warning (any group entered as 0). */}
          {review.zeroedGroupWarning && (
            <p className={styles.warning} role="status" data-testid="mock-zero-warning">
              {t('mock.review.zeroWarning')}
            </p>
          )}

          {/* Verdict (WP-A computeVerdict over the saved thresholds). */}
          <section
            className={`${styles.verdict} ${styles[verdictView.variant]}`}
            aria-labelledby="mock-verdict-label"
            role="status"
          >
            <p id="mock-verdict-label" className={styles.label}>
              {t('mock.review.verdictLabel')}
            </p>
            <p className={styles.verdictHeadline} data-testid="mock-verdict">
              {t(`mock.review.verdict.${verdictView.key}`)}
            </p>
          </section>

          {saved ? (
            <p className={styles.saved} role="status" data-testid="mock-saved">
              {t('mock.review.saved')}
            </p>
          ) : (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSave}
              data-testid="mock-save"
            >
              {t('mock.review.save')}
            </button>
          )}
        </section>
      )}
    </main>
  );
}
