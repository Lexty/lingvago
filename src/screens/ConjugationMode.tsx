import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  checkAnswer,
  generateSession,
  loadVerbDataFromDb,
  pronounFor,
  recordConjugationAttempt,
  type ConjugationItem,
  type Person,
} from '../modes/conjugation/index.ts';
import styles from './ConjugationMode.module.css';

/** Items generated per session (a session re-rolls when exhausted). */
const SESSION_COUNT = 10;

/** A fresh, unique-enough seed for a NEW interactive session. */
function freshSeed(): string {
  return `c-${Date.now().toString(36)}-${Math.floor(
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

/** Blank answers keyed by person (assemble-table input model). */
type TableAnswers = Record<Person, string>;

const EMPTY_TABLE_ANSWERS: TableAnswers = {
  eu: '',
  tu: '',
  voce_ele_ela: '',
  nos: '',
  voces_eles_elas: '',
};

export interface ConjugationModeProps {
  /**
   * Fixed seed for a deterministic session (tests / e2e). When omitted, a fresh
   * seed is generated so each real visit is a new sequence.
   */
  seed?: string;
}

/**
 * ConjugationMode — generative EP present-tense production drill (SPEC §1.2,
 * route `/drill/conjugation`). Two task types: (a) given a person + infinitive,
 * TYPE the single form; (b) assemble-table — TYPE all 5 present forms. Only
 * exam-eligible verbs appear (the engine applies the §6.5 gate). Objective
 * string check with a correct/wrong + reference-answer reveal. Each attempt is
 * logged to `attempts` and folded into the `skillMastery` roll-up (§7.2). NOT
 * gamified — no points / streaks / leagues; an exam-honest production drill.
 */
export default function ConjugationMode({ seed }: ConjugationModeProps) {
  const { t } = useTranslation();

  // The verb inventory comes from the read-only content stores (verbs ⨝
  // conjugationTables). `useLiveQuery` re-resolves once content has loaded, so a
  // pre-load render shows the graceful empty state instead of crashing.
  const verbs = useLiveQuery(() => loadVerbDataFromDb(), []);

  // The active session id doubles as the generation seed and the attempts
  // `sessionId`. A fixed `seed` prop yields a deterministic session.
  const [sessionId, setSessionId] = useState<string>(() => seed ?? freshSeed());
  const items = useMemo<ConjugationItem[]>(
    () => (verbs ? generateSession(sessionId, verbs, { count: SESSION_COUNT }) : []),
    [sessionId, verbs],
  );

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [tableAnswers, setTableAnswers] = useState<TableAnswers>(EMPTY_TABLE_ANSWERS);
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'none' });
  const startRef = useRef<number>(Date.now());

  // Reset the per-item clock whenever a new item is shown.
  useEffect(() => {
    startRef.current = Date.now();
  }, [index, sessionId]);

  // Guard against an empty/invalid session (graceful — never crash the screen).
  const current: ConjugationItem | undefined = items[index];

  const submit = useCallback(() => {
    if (!current || feedback.kind !== 'none') {
      return;
    }
    const responseMs = Date.now() - startRef.current;

    let correct: boolean;
    let userAnswer: string;
    let expected: string;
    if (current.type === 'fill-form') {
      correct = checkAnswer(answer, current.expected);
      userAnswer = answer;
      expected = current.expected;
    } else {
      // assemble-table: EVERY person must match for the item to be correct.
      correct = current.persons.every((p) =>
        checkAnswer(tableAnswers[p], current.expected[p]),
      );
      userAnswer = current.persons.map((p) => tableAnswers[p]).join(' / ');
      expected = current.persons.map((p) => current.expected[p]).join(' / ');
    }

    setFeedback(correct ? { kind: 'correct' } : { kind: 'wrong', expected });
    void recordConjugationAttempt({
      sessionId,
      item: current,
      userAnswer,
      correct,
      responseMs,
    }).catch((err: unknown) => {
      // A telemetry write failure must never break the drill.
      console.error('conjugation attempt log failed', err);
    });
  }, [answer, tableAnswers, current, feedback.kind, sessionId]);

  const next = useCallback(() => {
    setFeedback({ kind: 'none' });
    setAnswer('');
    setTableAnswers(EMPTY_TABLE_ANSWERS);
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
        <h1 className={styles.title}>{t('conjugation.title')}</h1>
        <nav className={styles.nav}>
          <Link to="/" className={styles.navLink}>
            {t('conjugation.nav.home')}
          </Link>
        </nav>
      </header>

      <p className={styles.intro}>{t('conjugation.intro')}</p>

      {!current ? (
        // Graceful empty-session render (AC error path) — never a crash.
        <section className={styles.card} role="status">
          <p className={styles.body}>{t('conjugation.empty')}</p>
        </section>
      ) : (
        <section className={styles.card} aria-labelledby="conjugation-task-label">
          <p id="conjugation-task-label" className={styles.label}>
            {t(
              current.type === 'assemble-table'
                ? 'conjugation.task.assembleTable'
                : 'conjugation.task.fillForm',
            )}
          </p>

          <p className={styles.prompt} data-testid="conjugation-prompt">
            {current.prompt}
          </p>

          <form className={styles.form} onSubmit={onSubmit}>
            {current.type === 'fill-form' ? (
              <>
                <label className={styles.inputLabel} htmlFor="conjugation-answer">
                  {t('conjugation.answerLabel')}
                </label>
                <input
                  id="conjugation-answer"
                  className={styles.input}
                  type="text"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-label={t('conjugation.answerLabel')}
                  value={answer}
                  readOnly={feedback.kind !== 'none'}
                  onChange={(event) => {
                    setAnswer(event.target.value);
                  }}
                />
              </>
            ) : (
              <div className={styles.tableGrid}>
                {current.persons.map((person) => (
                  <div className={styles.tableRow} key={person}>
                    <label
                      className={styles.tableLabel}
                      htmlFor={`conjugation-${person}`}
                    >
                      {pronounFor(person)}
                    </label>
                    <input
                      id={`conjugation-${person}`}
                      className={styles.input}
                      type="text"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-testid={`conjugation-input-${person}`}
                      value={tableAnswers[person]}
                      readOnly={feedback.kind !== 'none'}
                      onChange={(event) => {
                        const value = event.target.value;
                        setTableAnswers((prev) => ({ ...prev, [person]: value }));
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {feedback.kind === 'none' ? (
              <button type="submit" className={styles.primaryButton}>
                {t('conjugation.check')}
              </button>
            ) : (
              <button type="submit" className={styles.primaryButton} autoFocus>
                {t('conjugation.next')}
              </button>
            )}
          </form>

          {feedback.kind === 'correct' && (
            <p
              className={`${styles.feedback} ${styles.correct}`}
              role="status"
              data-testid="conjugation-feedback"
            >
              {t('conjugation.feedback.correct')}
            </p>
          )}
          {feedback.kind === 'wrong' && (
            <p
              className={`${styles.feedback} ${styles.wrong}`}
              role="status"
              data-testid="conjugation-feedback"
            >
              {t('conjugation.feedback.wrong', { answer: feedback.expected })}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
