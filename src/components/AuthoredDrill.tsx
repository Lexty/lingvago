import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type CheckOutcome,
  type SessionEntry,
  acceptedAnswers,
  checkExercise,
  localized,
} from '../packs/index.ts';
import RuleLink from './RuleLink.tsx';
import styles from './AuthoredDrill.module.css';

/**
 * The drill body for authored pack exercises (recall / cloze / build).
 *
 * The answer is always typed. After checking, the learner sees one of three
 * outcomes — right, right words with a wrong accent, or wrong — together with
 * the model answer, any other accepted form, and ONE short line on why. The
 * rule is available at any moment. Nothing is scored or locked: when the
 * session runs out, a fresh one starts.
 */
export interface AuthoredDrillProps {
  testIdBase: string;
  /** The session, already built and ordered. */
  entries: readonly SessionEntry[];
  /** Roll a fresh session when the current one is exhausted. */
  onExhausted: () => void;
  /** Persist one checked attempt. Must never throw out of the drill. */
  onRecord: (input: {
    entry: SessionEntry;
    userAnswer: string;
    outcome: CheckOutcome;
    responseMs: number;
  }) => Promise<unknown>;
}

export default function AuthoredDrill({
  testIdBase,
  entries,
  onExhausted,
  onRecord,
}: AuthoredDrillProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const startRef = useRef<number>(Date.now());
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const answeredRef = useRef(false);

  useEffect(() => {
    startRef.current = Date.now();
    // After "Next" the keyboard goes straight back to the answer field (but the
    // field does not steal focus when the screen first opens).
    if (answeredRef.current) {
      inputRef.current?.focus();
    }
  }, [index, entries]);

  const entry: SessionEntry | undefined = entries[index];

  const check = useCallback(() => {
    if (!entry || outcome !== null) return;
    const result = checkExercise(answer, entry.exercise);
    setOutcome(result);
    void onRecord({
      entry,
      userAnswer: answer,
      outcome: result,
      responseMs: Date.now() - startRef.current,
    }).catch((err: unknown) => {
      // A telemetry write failure must never break the drill.
      console.error('pack attempt log failed', err);
    });
  }, [entry, outcome, answer, onRecord]);

  const next = useCallback(() => {
    answeredRef.current = true;
    setOutcome(null);
    setAnswer('');
    if (index + 1 < entries.length) {
      setIndex(index + 1);
    } else {
      onExhausted();
      setIndex(0);
    }
  }, [index, entries.length, onExhausted]);

  const onSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (outcome === null) check();
      else next();
    },
    [outcome, check, next],
  );

  if (!entry) {
    return (
      <section className={styles.card} role="status" data-testid={`${testIdBase}-empty`}>
        <p className={styles.body}>{t('pack.empty')}</p>
      </section>
    );
  }

  const { group, exercise } = entry;
  const variants = acceptedAnswers(exercise).slice(1);
  const inputId = `${testIdBase}-answer`;

  return (
    <section className={styles.card} aria-labelledby={`${testIdBase}-task-label`}>
      <div className={styles.cardTop}>
        <p className={styles.label} id={`${testIdBase}-task-label`} data-testid={`${testIdBase}-group`}>
          {localized(group.title, lang)}
        </p>
        {group.ruleId !== undefined && (
          // Keyed by exercise so an open rule never carries over to the next one.
          <RuleLink key={exercise.id} referenceId={group.ruleId} testIdBase={testIdBase} />
        )}
      </div>

      <p className={styles.instruction}>{localized(group.instruction, lang)}</p>

      {exercise.prompt !== undefined && (
        <p className={styles.prompt} lang="pt-PT" data-testid={`${testIdBase}-prompt`}>
          {exercise.prompt}
        </p>
      )}
      {exercise.cue !== undefined && (
        <p
          className={exercise.prompt === undefined ? styles.prompt : styles.cue}
          data-testid={`${testIdBase}-cue`}
        >
          {localized(exercise.cue, lang)}
        </p>
      )}

      <form className={styles.form} onSubmit={onSubmit}>
        <label className={styles.inputLabel} htmlFor={inputId}>
          {t('pack.answerLabel')}
        </label>
        {group.kind === 'build' ? (
          // A whole sentence wraps instead of scrolling sideways. Enter checks
          // (a sentence has no line breaks), like in the single-line field.
          <textarea
            ref={inputRef}
            id={inputId}
            data-testid={inputId}
            className={`${styles.input} ${styles.sentence}`}
            rows={2}
            lang="pt-PT"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={answer}
            readOnly={outcome !== null}
            onChange={(event) => {
              setAnswer(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
        ) : (
          <input
            ref={inputRef}
            id={inputId}
            data-testid={inputId}
            className={styles.input}
            type="text"
            lang="pt-PT"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={answer}
            readOnly={outcome !== null}
            onChange={(event) => {
              setAnswer(event.target.value);
            }}
          />
        )}
        {outcome === null ? (
          <button type="submit" className={styles.primaryButton}>
            {t('pack.check')}
          </button>
        ) : (
          <button type="submit" className={styles.primaryButton} autoFocus>
            {t('pack.next')}
          </button>
        )}
      </form>

      {outcome !== null && (
        <div
          className={`${styles.feedback} ${outcome === 'correct' ? styles.correct : outcome === 'accent' ? styles.accent : styles.wrong}`}
          role="status"
          data-testid={`${testIdBase}-feedback`}
          data-outcome={outcome}
        >
          <p className={styles.feedbackHead}>{t(`pack.feedback.${outcome}`)}</p>
          {/* The model answer is always shown — also after a correct variant. */}
          <p className={styles.feedbackAnswer} lang="pt-PT" data-testid={`${testIdBase}-expected`}>
            {exercise.answer}
          </p>
          {variants.length > 0 && (
            <p className={styles.feedbackNote}>
              {t('pack.feedback.alsoCorrect')}{' '}
              <span lang="pt-PT">{variants.join(' · ')}</span>
            </p>
          )}
          <p className={styles.feedbackNote} data-testid={`${testIdBase}-why`}>
            {localized(exercise.why, lang)}
          </p>
        </div>
      )}
    </section>
  );
}
