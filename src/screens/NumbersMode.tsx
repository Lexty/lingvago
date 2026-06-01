import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import {
  checkAnswer,
  generateSession,
  type NumberItem,
} from '../modes/numbers/index.ts';
import { recordNumbersAttempt } from '../modes/numbers/progress.ts';
import styles from './NumbersMode.module.css';

/** Items generated per session (a session re-rolls when exhausted). */
const SESSION_COUNT = 10;

/** A fresh, unique-enough seed for a NEW interactive session. */
function freshSeed(): string {
  return `s-${Date.now().toString(36)}-${Math.floor(
    // Non-deterministic ONLY for picking a brand-new interactive seed; the
    // generation PATH from a seed stays fully deterministic (SPEC §6.1). The
    // deterministic e2e/tests pass an explicit `seed` and never hit this.
    Math.random() * 1e6,
  ).toString(36)}`;
}

/** Per-item feedback after a submission. */
type Feedback =
  | { kind: 'none' }
  | { kind: 'correct' }
  | { kind: 'wrong'; expected: string };

export interface NumbersModeProps {
  /**
   * Fixed seed for a deterministic session (tests / e2e). When omitted, a fresh
   * seed is generated so each real visit is a new sequence.
   */
  seed?: string;
}

/**
 * NumbersMode — generative EP-numeral production drill (SPEC §1.2, route
 * `/drill/numbers`). The user TYPES the answer in both directions (digit→word
 * and word→digit), across cardinals AND ordinals. Objective string check, an
 * explicit correct/wrong + reference-answer reveal. Each attempt is logged to
 * `attempts` and folded into the `skillMastery` roll-up (§7.2). NOT gamified —
 * no points / streaks / leagues; it is an exam-honest production drill.
 */
export default function NumbersMode({ seed }: NumbersModeProps) {
  const { t } = useTranslation();

  // The active session id doubles as the generation seed and the attempts
  // `sessionId`. A fixed `seed` prop yields a deterministic session.
  const [sessionId, setSessionId] = useState<string>(() => seed ?? freshSeed());
  const items = useMemo<NumberItem[]>(
    () => generateSession(sessionId, { count: SESSION_COUNT }),
    [sessionId],
  );

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'none' });
  const startRef = useRef<number>(Date.now());

  // Reset the per-item clock whenever a new item is shown.
  useEffect(() => {
    startRef.current = Date.now();
  }, [index, sessionId]);

  // Guard against an empty/invalid session (graceful — never crash the screen).
  const current: NumberItem | undefined = items[index];

  const submit = useCallback(() => {
    if (!current || feedback.kind !== 'none') {
      return;
    }
    const correct = checkAnswer(answer, current.expected);
    const responseMs = Date.now() - startRef.current;
    setFeedback(
      correct ? { kind: 'correct' } : { kind: 'wrong', expected: current.expected },
    );
    void recordNumbersAttempt({
      sessionId,
      item: current,
      userAnswer: answer,
      correct,
      responseMs,
    }).catch((err: unknown) => {
      // A telemetry write failure must never break the drill.
      console.error('numbers attempt log failed', err);
    });
  }, [answer, current, feedback.kind, sessionId]);

  const next = useCallback(() => {
    setFeedback({ kind: 'none' });
    setAnswer('');
    if (index + 1 < items.length) {
      setIndex(index + 1);
    } else {
      // Session exhausted → roll a fresh session (endless variability).
      setSessionId(seed ?? freshSeed());
      setIndex(0);
    }
  }, [index, items.length, seed]);

  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (feedback.kind === 'none') {
        submit();
      } else {
        next();
      }
    },
    [feedback.kind, submit, next],
  );

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('numbers.title')}</h1>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            {t('numbers.nav.home')}
          </Link>
        </nav>
      </header>

      <p className={styles.intro}>{t('numbers.intro')}</p>

      {!current ? (
        // Graceful empty-session render (AC error path) — never a crash.
        <section className={styles.card} role="status">
          <p className={styles.body}>{t('numbers.empty')}</p>
        </section>
      ) : (
        <section className={styles.card} aria-labelledby="numbers-task-label">
          <p id="numbers-task-label" className={styles.label}>
            {t(
              current.direction === 'digit-to-word'
                ? 'numbers.task.digitToWord'
                : 'numbers.task.wordToDigit',
            )}{' '}
            ·{' '}
            {t(
              current.kind === 'ordinal'
                ? 'numbers.kind.ordinal'
                : 'numbers.kind.cardinal',
            )}
          </p>

          <p className={styles.prompt} data-testid="numbers-prompt">
            {current.prompt}
          </p>

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.inputLabel} htmlFor="numbers-answer">
              {t('numbers.answerLabel')}
            </label>
            <input
              id="numbers-answer"
              className={styles.input}
              type="text"
              inputMode={
                current.direction === 'word-to-digit' ? 'numeric' : 'text'
              }
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label={t('numbers.answerLabel')}
              value={answer}
              readOnly={feedback.kind !== 'none'}
              onChange={(event) => {
                setAnswer(event.target.value);
              }}
            />

            {feedback.kind === 'none' ? (
              <button type="submit" className={styles.primaryButton}>
                {t('numbers.check')}
              </button>
            ) : (
              <button type="submit" className={styles.primaryButton} autoFocus>
                {t('numbers.next')}
              </button>
            )}
          </form>

          {feedback.kind === 'correct' && (
            <p
              className={`${styles.feedback} ${styles.correct}`}
              role="status"
              data-testid="numbers-feedback"
            >
              {t('numbers.feedback.correct')}
            </p>
          )}
          {feedback.kind === 'wrong' && (
            <p
              className={`${styles.feedback} ${styles.wrong}`}
              role="status"
              data-testid="numbers-feedback"
            >
              {t('numbers.feedback.wrong', { answer: feedback.expected })}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
