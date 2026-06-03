import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkAnswer } from '../modes/shared/index.ts';
import type { DrillItem } from '../modes/shared/index.ts';
import { db } from '../db/index.ts';
import { getReferenceCard, type ReferenceCard } from '../reference/selectors.ts';
import MarkdownLite from '../reference/MarkdownLite.tsx';

/**
 * Shared production-first grammar-drill screen body (WP-C Task 4), used by BOTH
 * GenderDrill and PrepositionDrill so the production/MC rendering, the
 * correct/wrong + reference-reveal feedback, the L1–L3 level indicator, and the
 * feedback→reference deep-link live in ONE place and cannot drift between the two
 * drills.
 *
 * The screen is mode-agnostic: it renders whatever the seeded generator produced
 * — a typed PRODUCTION input when `item.drill.mode === 'production'`, or the
 * parity MC option buttons (each with its explanation) when `mode === 'mc'`. The
 * channel (`production` | `recognition`) is therefore DATA-DRIVEN, never a flag.
 *
 * NOT gamified — no points / streaks / leagues; an exam-honest production drill.
 */

/** The per-screen shape each concrete drill supplies for its generated items. */
export interface GrammarDrillEntry<TItem> {
  /** The domain item (gender / preposition) carrying its drill + metadata. */
  item: TItem;
  /** The shared discriminated drill item (production vs. mc). */
  drill: DrillItem;
  /** The §4.8 level label (`L1` | `L2` | `L3`) shown in the indicator. */
  level: string;
  /** The EXISTING WP-B reference card id this item deep-links to (§AC6). */
  referenceId: string;
}

/**
 * The CSS-module class map this body reads. Both GrammarDrill-backed screens
 * (GenderDrill / PrepositionDrill) pass the SAME shared module
 * (`styles/grammarDrillScreen.module.css`), which `composes` every class from the
 * shared `drill.module.css` — so the styling stays token-only and the shared
 * block lives in ONE place. Typed as the CSS-Modules index signature
 * so a screen's generated `styles` object assigns directly; the keys this body
 * relies on are: card, body, level, prompt, form, inputLabel, input,
 * primaryButton, options, option, optionCorrect, optionWrong, optionExplanation,
 * feedback, correct, wrong, refLink.
 */
export type GrammarDrillStyles = Readonly<Record<string, string>>;

export interface GrammarDrillProps<TItem> {
  /** i18n key stem (e.g. `gender` / `preposition`) for chrome strings. */
  i18nKey: string;
  /** Stable heading test id base, e.g. `gender-drill`. */
  testIdBase: string;
  /** The screen's CSS module (composes the shared drill chrome). */
  styles: GrammarDrillStyles;
  /** The deterministic session (already generated from the seed). */
  entries: ReadonlyArray<GrammarDrillEntry<TItem>>;
  /** Roll a fresh session id when the current one is exhausted (real visits). */
  onExhausted: () => void;
  /**
   * Persist one graded attempt. `channel` is derived from the item's drill mode
   * (`mc` ⇒ recognition, else production). Must never throw out of the drill.
   */
  onRecord: (input: {
    entry: GrammarDrillEntry<TItem>;
    userAnswer: string;
    correct: boolean;
    channel: 'production' | 'recognition';
    responseMs: number;
  }) => Promise<unknown>;
}

/** Per-item feedback after a submission. */
type Feedback =
  | { kind: 'none' }
  | { kind: 'correct' }
  | { kind: 'wrong'; expected: string };

/**
 * The reference card is shown as an in-drill OVERLAY (not a route navigation), so
 * reading the rule never unmounts the drill or loses the seeded-session position —
 * closing the overlay returns the user to exactly the item they were on.
 */
type RuleOverlay =
  | { open: false }
  | { open: true; status: 'loading' }
  | { open: true; status: 'found'; card: ReferenceCard }
  | { open: true; status: 'missing' };

export default function GrammarDrill<TItem>({
  i18nKey,
  testIdBase,
  styles,
  entries,
  onExhausted,
  onRecord,
}: GrammarDrillProps<TItem>) {
  const { t } = useTranslation();

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'none' });
  const [rule, setRule] = useState<RuleOverlay>({ open: false });
  const startRef = useRef<number>(Date.now());

  const openRule = useCallback((referenceId: string) => {
    setRule({ open: true, status: 'loading' });
    void getReferenceCard(db, referenceId)
      .then((card) => {
        setRule(card ? { open: true, status: 'found', card } : { open: true, status: 'missing' });
      })
      .catch((err: unknown) => {
        console.error('reference card load failed', err);
        setRule({ open: true, status: 'missing' });
      });
  }, []);

  const closeRule = useCallback(() => {
    setRule({ open: false });
  }, []);

  // Reset the per-item clock whenever a new item is shown.
  useEffect(() => {
    startRef.current = Date.now();
  }, [index, entries]);

  // Guard against an empty/invalid session (graceful — never crash the screen).
  const entry: GrammarDrillEntry<TItem> | undefined = entries[index];
  const drill = entry?.drill;

  const channel: 'production' | 'recognition' = useMemo(
    () => (drill?.mode === 'mc' ? 'recognition' : 'production'),
    [drill],
  );

  const grade = useCallback(
    (userAnswer: string) => {
      if (!entry || !drill || feedback.kind !== 'none') {
        return;
      }
      const responseMs = Date.now() - startRef.current;
      const correct = checkAnswer(userAnswer, drill.answer);
      setFeedback(correct ? { kind: 'correct' } : { kind: 'wrong', expected: drill.answer });
      void onRecord({ entry, userAnswer, correct, channel, responseMs }).catch(
        (err: unknown) => {
          // A telemetry write failure must never break the drill.
          console.error(`${i18nKey} attempt log failed`, err);
        },
      );
    },
    [entry, drill, feedback.kind, channel, onRecord, i18nKey],
  );

  const submitProduction = useCallback(() => {
    grade(answer);
  }, [grade, answer]);

  const pickOption = useCallback(
    (surface: string) => {
      if (feedback.kind !== 'none') {
        return;
      }
      setPicked(surface);
      grade(surface);
    },
    [grade, feedback.kind],
  );

  const next = useCallback(() => {
    setFeedback({ kind: 'none' });
    setRule({ open: false });
    setAnswer('');
    setPicked(null);
    if (index + 1 < entries.length) {
      setIndex(index + 1);
    } else {
      // Session exhausted → ask the owner for a fresh session, restart at 0.
      onExhausted();
      setIndex(0);
    }
  }, [index, entries.length, onExhausted]);

  const onProductionSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (feedback.kind === 'none') {
        submitProduction();
      } else {
        next();
      }
    },
    [feedback.kind, submitProduction, next],
  );

  return (
    <>
      {!entry || !drill ? (
        // Graceful empty-session render (AC error path) — never a crash.
        <section className={styles.card} role="status" data-testid={`${testIdBase}-empty`}>
          <p className={styles.body}>{t(`${i18nKey}.empty`)}</p>
        </section>
      ) : (
        <section className={styles.card} aria-labelledby={`${testIdBase}-task-label`}>
          <p
            className={styles.level}
            data-testid={`${testIdBase}-level`}
            id={`${testIdBase}-task-label`}
          >
            {t(`${i18nKey}.level`, { level: entry.level })}
          </p>

          <p className={styles.prompt} data-testid={`${testIdBase}-prompt`}>
            {drill.prompt}
          </p>

          {drill.mode === 'production' ? (
            <form className={styles.form} onSubmit={onProductionSubmit}>
              <label className={styles.inputLabel} htmlFor={`${testIdBase}-answer`}>
                {t(`${i18nKey}.answerLabel`)}
              </label>
              <input
                id={`${testIdBase}-answer`}
                data-testid={`${testIdBase}-answer`}
                className={styles.input}
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label={t(`${i18nKey}.answerLabel`)}
                value={answer}
                readOnly={feedback.kind !== 'none'}
                onChange={(event) => {
                  setAnswer(event.target.value);
                }}
              />
              {feedback.kind === 'none' ? (
                <button type="submit" className={styles.primaryButton}>
                  {t(`${i18nKey}.check`)}
                </button>
              ) : (
                <button type="submit" className={styles.primaryButton} autoFocus>
                  {t(`${i18nKey}.next`)}
                </button>
              )}
            </form>
          ) : (
            <>
              <ul className={styles.options}>
                {drill.options.map((option) => {
                  const revealed = feedback.kind !== 'none';
                  const isPicked = picked === option.surface;
                  // Post-submission state class: the correct option is marked
                  // correct; a wrongly-picked option is marked wrong.
                  const stateClass = !revealed
                    ? ''
                    : option.correct
                      ? ` ${styles.optionCorrect}`
                      : isPicked
                        ? ` ${styles.optionWrong}`
                        : '';
                  return (
                    <li key={option.surface}>
                      <button
                        type="button"
                        className={`${styles.option}${stateClass}`}
                        data-testid={`${testIdBase}-option`}
                        data-correct={option.correct}
                        disabled={revealed}
                        onClick={() => {
                          pickOption(option.surface);
                        }}
                      >
                        {option.surface}
                        {revealed && (isPicked || option.correct) && (
                          <span className={styles.optionExplanation}>
                            {option.explanation}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {feedback.kind !== 'none' && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  autoFocus
                  onClick={next}
                >
                  {t(`${i18nKey}.next`)}
                </button>
              )}
            </>
          )}

          {feedback.kind === 'correct' && (
            <p
              className={`${styles.feedback} ${styles.correct}`}
              role="status"
              data-testid={`${testIdBase}-feedback`}
            >
              {t(`${i18nKey}.feedback.correct`)}
            </p>
          )}
          {feedback.kind === 'wrong' && (
            <p
              className={`${styles.feedback} ${styles.wrong}`}
              role="status"
              data-testid={`${testIdBase}-feedback`}
            >
              {t(`${i18nKey}.feedback.wrong`, { answer: feedback.expected })}
            </p>
          )}

          {feedback.kind !== 'none' && (
            <button
              type="button"
              className={styles.refLink}
              data-testid={`${testIdBase}-ref-link`}
              onClick={() => {
                openRule(entry.referenceId);
              }}
            >
              {t(`${i18nKey}.reference`)}
            </button>
          )}
        </section>
      )}

      {rule.open && (
        <div
          className={styles.ruleOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={t(`${i18nKey}.reference`)}
          data-testid={`${testIdBase}-rule-overlay`}
          onClick={(event) => {
            // Click on the backdrop (not the dialog) closes the overlay.
            if (event.target === event.currentTarget) closeRule();
          }}
        >
          <div className={styles.ruleDialog}>
            <button
              type="button"
              className={styles.ruleClose}
              onClick={closeRule}
              autoFocus
              data-testid={`${testIdBase}-rule-close`}
            >
              {t(`${i18nKey}.closeReference`)}
            </button>
            {rule.status === 'loading' && <p className={styles.body}>…</p>}
            {rule.status === 'missing' && (
              <p className={styles.body}>{t(`${i18nKey}.reference`)}</p>
            )}
            {rule.status === 'found' && (
              <article data-content-id={rule.card.contentId}>
                <h2 className={styles.ruleTitle}>{rule.card.title}</h2>
                <MarkdownLite body={rule.card.body} />
              </article>
            )}
          </div>
        </div>
      )}
    </>
  );
}
