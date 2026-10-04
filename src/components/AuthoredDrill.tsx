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
 * The drill body for authored pack exercises (recall / cloze / build /
 * transform / choose).
 *
 * The answer is typed, except in a `choose` exercise, where the learner taps
 * the meaning of a sentence. After checking, the learner sees one of three
 * outcomes — right, right words with a wrong accent, or wrong — together with
 * the model answer, any other accepted form, and ONE short line on why. The
 * rule is available at any moment. Nothing is scored or locked: when the
 * session runs out, a fresh one starts.
 */
/** Up to this many accepted variants are listed inline; more go behind a toggle. */
const MAX_INLINE_VARIANTS = 2;

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
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const answeredRef = useRef(false);

  useEffect(() => {
    startRef.current = Date.now();
    // After "Next" the keyboard goes straight back to the answer field (but the
    // field does not steal focus when the screen first opens).
    // In a `choose` exercise there is no field: focus goes to the first option.
    if (answeredRef.current) {
      (inputRef.current ?? firstOptionRef.current)?.focus();
    }
  }, [index, entries]);

  const entry: SessionEntry | undefined = entries[index];

  const check = useCallback((given: string = answer) => {
    if (!entry || outcome !== null) return;
    const result = checkExercise(given, entry.exercise);
    setAnswer(given);
    setOutcome(result);
    void onRecord({
      entry,
      userAnswer: given,
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
  const options = group.kind === 'choose' ? (exercise.options ?? []) : undefined;
  const optionText = (id: string) => {
    const option = options?.find((o) => o.id === id);
    return option ? localized(option.text, lang) : id;
  };

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
        {options ? (
          <div className={styles.options} role="group" aria-label={t('pack.chooseLabel')}>
            {options.map((option, i) => (
              <button
                key={option.id}
                ref={i === 0 ? firstOptionRef : undefined}
                type="button"
                className={`${styles.option} ${
                  outcome !== null && option.id === exercise.answer
                    ? styles.optionRight
                    : outcome !== null && option.id === answer
                      ? styles.optionWrong
                      : ''
                }`}
                data-testid={`${testIdBase}-option-${option.id}`}
                aria-pressed={answer === option.id}
                disabled={outcome !== null}
                onClick={() => {
                  check(option.id);
                }}
              >
                {localized(option.text, lang)}
              </button>
            ))}
          </div>
        ) : (
          <>
            <label className={styles.inputLabel} htmlFor={inputId}>
              {t('pack.answerLabel')}
            </label>
            {group.kind === 'build' || group.kind === 'transform' ? (
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
          </>
        )}
        {outcome === null ? (
          options ? null : (
            <button type="submit" className={styles.primaryButton}>
              {t('pack.check')}
            </button>
          )
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
          {options ? (
            <p className={styles.feedbackAnswer} data-testid={`${testIdBase}-expected`}>
              {optionText(exercise.answer)}
            </p>
          ) : (
            <p className={styles.feedbackAnswer} lang="pt-PT" data-testid={`${testIdBase}-expected`}>
              {exercise.answer}
            </p>
          )}
          {!options && variants.length > 0 && variants.length <= MAX_INLINE_VARIANTS && (
            <p className={styles.feedbackNote}>
              {t('pack.feedback.alsoCorrect')}{' '}
              <span lang="pt-PT">{variants.join(' · ')}</span>
            </p>
          )}
          {!options && variants.length > MAX_INLINE_VARIANTS && (
            // Many near-identical full sentences (with / without Sim, a subject…)
            // would bury the explanation on a phone: they wait behind a toggle.
            <details className={styles.feedbackNote} data-testid={`${testIdBase}-variants`}>
              <summary>{t('pack.feedback.moreVariants', { count: variants.length })}</summary>
              <ul className={styles.variantList} lang="pt-PT">
                {variants.map((variant) => (
                  <li key={variant}>{variant}</li>
                ))}
              </ul>
            </details>
          )}
          <p className={styles.feedbackNote} data-testid={`${testIdBase}-why`}>
            {localized(exercise.why, lang)}
          </p>
        </div>
      )}
    </section>
  );
}
