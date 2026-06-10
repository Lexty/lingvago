import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  GROUP_MAX,
  GROUPS,
  type Group,
  TOTAL_MAX,
  type Verdict,
  coerceGroupScore,
  coerceThresholdValue,
  computeVerdict,
  hasZeroedGroup,
  totalScore,
} from './survivalKit.ts';
import {
  type SurvivalKitState,
  emptySurvivalKitState,
  loadSurvivalKitState,
  saveSurvivalKitState,
} from '../db/survivalKit.ts';
import styles from './SurvivalKit.module.css';

/** Static materials links (SPEC §1 / matrix); stable ids → i18n labels. */
const MATERIALS = ['matrix', 'livro', 'dailyPlan'] as const;

/**
 * Single per-verdict view descriptor (variant CSS-module key + i18n key stems),
 * so the pass/risk/no-verdict branching is declared ONCE instead of being
 * re-spelled at each of the three render sites.
 */
const VERDICT_VIEW: Record<
  Verdict,
  { variant: 'verdictPass' | 'verdictRisk' | 'verdictNone'; key: string }
> = {
  pass: { variant: 'verdictPass', key: 'pass' },
  risk: { variant: 'verdictRisk', key: 'risk' },
  'no-verdict': { variant: 'verdictNone', key: 'none' },
};

/**
 * Exam Survival Kit — the app landing page (route `/`, MVP_PLAN WP-A).
 *
 * Calm, single-screen survival kit: 4-group checklist + materials, the daily
 * §1 «focus on today» reminder (NO day-countdown — SPEC §16), a manual
 * mock-results table (0–50/group), optional pass thresholds, and the verdict
 * banner / raw-scores per the unambiguous AC5 rule. State is persisted in the
 * `lingvago2` IndexedDB and survives reload / SW update.
 */
export default function SurvivalKit() {
  const { t } = useTranslation();
  const [state, setState] = useState<SurvivalKitState>(emptySurvivalKitState);
  // Gate persistence until the initial async load completes, so an empty
  // first-render state never overwrites stored progress.
  const loadedRef = useRef(false);

  useEffect(() => {
    let active = true;
    void loadSurvivalKitState()
      .then((stored) => {
        if (active) {
          setState(stored);
        }
      })
      .catch((err: unknown) => {
        // A read failure must not crash the screen; keep the empty default.
        console.error('survival-kit load failed', err);
      })
      .finally(() => {
        loadedRef.current = true;
      });
    return () => {
      active = false;
    };
  }, []);

  // Persist on every change once the initial load has settled.
  useEffect(() => {
    if (!loadedRef.current) {
      return;
    }
    void saveSurvivalKitState(state).catch((err: unknown) => {
      console.error('survival-kit save failed', err);
    });
  }, [state]);

  const toggleGroup = useCallback((group: Group) => {
    setState((prev) => ({
      ...prev,
      checklist: { ...prev.checklist, [group]: !prev.checklist[group] },
    }));
  }, []);

  const setGroupScore = useCallback((group: Group, raw: string) => {
    setState((prev) => ({
      ...prev,
      scores: { ...prev.scores, [group]: coerceGroupScore(raw) },
    }));
  }, []);

  const setTotalThreshold = useCallback((raw: string) => {
    setState((prev) => ({
      ...prev,
      threshold: {
        ...prev.threshold,
        totalPassPoints: coerceThresholdValue(raw, TOTAL_MAX),
      },
    }));
  }, []);

  const setMinGroupThreshold = useCallback((raw: string) => {
    setState((prev) => ({
      ...prev,
      threshold: {
        ...prev.threshold,
        minGroupPoints: coerceThresholdValue(raw, GROUP_MAX),
      },
    }));
  }, []);

  const clearScores = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scores: { I: null, II: null, III: null, IV: null },
    }));
  }, []);

  const verdict = computeVerdict(state.scores, state.threshold);
  const verdictView = VERDICT_VIEW[verdict];
  const showZeroWarning = hasZeroedGroup(state.scores);
  const total = totalScore(state.scores);

  /** Format a nullable score/threshold for a controlled input. */
  const inputValue = (value: number | null): string =>
    value === null ? '' : String(value);

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('survivalKit.title')}</h1>
        <nav className={styles.nav}>
          <Link to="/drill/numbers" className={styles.navLink}>
            {t('survivalKit.nav.numbers')}
          </Link>
          <Link to="/drill/conjugation" className={styles.navLink}>
            {t('survivalKit.nav.conjugation')}
          </Link>
          <Link to="/drill/gender" className={styles.navLink}>
            {t('survivalKit.nav.gender')}
          </Link>
          <Link to="/drill/preposition" className={styles.navLink}>
            {t('survivalKit.nav.preposition')}
          </Link>
          <Link to="/drill/possessive" className={styles.navLink}>
            {t('survivalKit.nav.possessive')}
          </Link>
          <Link to="/drill/interrogative" className={styles.navLink}>
            {t('survivalKit.nav.interrogative')}
          </Link>
          <Link to="/mock" className={styles.navLink}>
            {t('survivalKit.nav.mock')}
          </Link>
          <Link to="/reference" className={styles.navLink}>
            {t('survivalKit.nav.reference')}
          </Link>
          <Link to="/settings" className={styles.navLink}>
            {t('survivalKit.nav.settings')}
          </Link>
        </nav>
      </header>

      {/* Daily §1 «focus on today» — NO day-countdown (SPEC §16). */}
      <section className={styles.section} aria-labelledby="today-label">
        <p id="today-label" className={styles.label}>
          {t('survivalKit.today.label')}
        </p>
        <p className={styles.body}>{t('survivalKit.today.body')}</p>
      </section>

      {/* 4-group checklist. */}
      <section className={styles.section} aria-labelledby="checklist-label">
        <h2 id="checklist-label" className={styles.sectionTitle}>
          {t('survivalKit.checklist.label')}
        </h2>
        <p className={styles.hint}>{t('survivalKit.checklist.hint')}</p>
        <ul className={styles.checklist}>
          {GROUPS.map((group) => (
            <li key={group} className={styles.checkItem}>
              <label className={styles.checkItem}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={state.checklist[group] ?? false}
                  onChange={() => {
                    toggleGroup(group);
                  }}
                />
                {t(`survivalKit.checklist.group.${group}`)}
              </label>
            </li>
          ))}
        </ul>
      </section>

      {/* Materials links. */}
      <section className={styles.section} aria-labelledby="materials-label">
        <h2 id="materials-label" className={styles.sectionTitle}>
          {t('survivalKit.materials.label')}
        </h2>
        <ul className={styles.materials}>
          {MATERIALS.map((item) => (
            <li key={item} className={styles.materialItem}>
              {t(`survivalKit.materials.items.${item}`)}
            </li>
          ))}
        </ul>
      </section>

      {/* Manual mock-results table (0–50/group). */}
      <section className={styles.section} aria-labelledby="mock-label">
        <h2 id="mock-label" className={styles.sectionTitle}>
          {t('survivalKit.mock.label')}
        </h2>
        <p className={styles.hint}>{t('survivalKit.mock.hint')}</p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col" className={styles.th}>
                {t('survivalKit.mock.groupColumn')}
              </th>
              <th scope="col" className={styles.th}>
                {t('survivalKit.mock.scoreColumn')}
              </th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.map((group) => (
              <tr key={group}>
                <th scope="row" className={styles.td}>
                  {t(`survivalKit.checklist.group.${group}`)}
                </th>
                <td className={styles.td}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={GROUP_MAX}
                    className={styles.scoreInput}
                    aria-label={t('survivalKit.mock.scoreAria', { group })}
                    value={inputValue(state.scores[group])}
                    onChange={(event) => {
                      setGroupScore(group, event.target.value);
                    }}
                  />
                </td>
              </tr>
            ))}
            <tr className={styles.totalRow}>
              <th scope="row" className={styles.td}>
                {t('survivalKit.mock.total')}
              </th>
              <td className={styles.td}>
                {t('survivalKit.mock.totalOf', { score: total, max: TOTAL_MAX })}
              </td>
            </tr>
          </tbody>
        </table>
        <button type="button" className={styles.clearButton} onClick={clearScores}>
          {t('survivalKit.mock.clear')}
        </button>
      </section>

      {/* Optional pass thresholds (default unknown). */}
      <section className={styles.section} aria-labelledby="threshold-label">
        <h2 id="threshold-label" className={styles.sectionTitle}>
          {t('survivalKit.threshold.label')}
        </h2>
        <p className={styles.hint}>{t('survivalKit.threshold.hint')}</p>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="threshold-total">
            {t('survivalKit.threshold.totalLabel')}
          </label>
          <input
            id="threshold-total"
            type="number"
            inputMode="numeric"
            min={0}
            max={TOTAL_MAX}
            className={styles.thresholdInput}
            aria-label={t('survivalKit.threshold.totalAria')}
            placeholder={t('survivalKit.threshold.unset')}
            value={inputValue(state.threshold.totalPassPoints)}
            onChange={(event) => {
              setTotalThreshold(event.target.value);
            }}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="threshold-min-group">
            {t('survivalKit.threshold.minGroupLabel')}
          </label>
          <input
            id="threshold-min-group"
            type="number"
            inputMode="numeric"
            min={0}
            max={GROUP_MAX}
            className={styles.thresholdInput}
            aria-label={t('survivalKit.threshold.minGroupAria')}
            placeholder={t('survivalKit.threshold.unset')}
            value={inputValue(state.threshold.minGroupPoints)}
            onChange={(event) => {
              setMinGroupThreshold(event.target.value);
            }}
          />
        </div>
      </section>

      {/* «Don't zero a group» warning (any group explicitly at 0). */}
      {showZeroWarning && (
        <p className={styles.warning} role="status">
          {t('survivalKit.warning.zeroGroup')}
        </p>
      )}

      {/* Verdict banner (AC5): pass / risk only when a threshold is set; else
          no-verdict + raw scores (already shown in the table above). */}
      <section
        className={`${styles.verdict} ${styles[verdictView.variant]}`}
        aria-labelledby="verdict-label"
        role="status"
      >
        <p id="verdict-label" className={styles.label}>
          {t('survivalKit.verdict.label')}
        </p>
        <p className={styles.verdictHeadline}>
          {t(`survivalKit.verdict.${verdictView.key}`)}
        </p>
        <p className={styles.verdictDetail}>
          {t(`survivalKit.verdict.${verdictView.key}Detail`)}
        </p>
      </section>
    </main>
  );
}
