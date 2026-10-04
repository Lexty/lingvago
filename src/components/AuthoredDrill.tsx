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
  /**
   * Persist one checked attempt (or a «show the answer», outcome `revealed`),
   * resolving to its id. Must never throw out of the drill.
   */
  onRecord: (input: {
    entry: SessionEntry;
    userAnswer: string;
    outcome: DrillOutcome;
    support?: 'gloss';
    responseMs: number;
  }) => Promise<number | void>;
  /** Note on a logged wrong answer that the sentence was not understood. */
  onSelfReport?: (attemptId: number) => Promise<void>;
}

/** A checked answer, or the answer shown on request without answering. */
type DrillOutcome = CheckOutcome | 'revealed';

export default function AuthoredDrill({
  testIdBase,
  entries,
  onExhausted,
  onRecord,
  onSelfReport,
}: AuthoredDrillProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [outcome, setOutcome] = useState<DrillOutcome | null>(null);
  /** «I don't understand»: the prompt's word meanings are open. */
  const [helpOpen, setHelpOpen] = useState(false);
  /** «I didn't understand» on a wrong answer: asked, then saved (or not). */
  const [selfReport, setSelfReport] = useState<'none' | 'asked' | 'saved'>('none');
  const selfReported = selfReport !== 'none';
  /**
   * The CURRENT card's attempt being saved, resolving to its id (null when it
   * was not saved). Each attempt keeps its own promise, so a self-report always
   * lands on the answer it was made for, even if that save is still running or
   * an older one finishes later.
   */
  const attemptRef = useRef<Promise<number | null> | null>(null);
  /** Bumped on every new card, so a late save never updates the next card's UI. */
  const cardTokenRef = useRef(0);
  const startRef = useRef<number>(Date.now());
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
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

  // A button the learner just pressed («show the answer», «I didn't
  // understand») goes away; keyboard focus moves on to «Next» instead of
  // falling back to the page.
  useEffect(() => {
    if (outcome === null) return;
    const active = document.activeElement;
    if (active === null || active === document.body) nextRef.current?.focus();
  }, [outcome, selfReport]);

  const record = useCallback(
    (given: string, result: DrillOutcome) => {
      if (!entry) return;
      attemptRef.current = onRecord({
        entry,
        userAnswer: given,
        outcome: result,
        ...(helpOpen && result !== 'revealed' ? { support: 'gloss' as const } : {}),
        responseMs: Date.now() - startRef.current,
      })
        .then((id) => (typeof id === 'number' ? id : null))
        .catch((err: unknown) => {
          // A telemetry write failure must never break the drill.
          console.error('pack attempt log failed', err);
          return null;
        });
    },
    [entry, helpOpen, onRecord],
  );

  const check = useCallback((given: string = answer) => {
    if (!entry || outcome !== null) return;
    const result = checkExercise(given, entry.exercise);
    setAnswer(given);
    setOutcome(result);
    record(given, result);
  }, [entry, outcome, answer, record]);

  /** «Show the answer»: the item is viewed, not answered. */
  const reveal = useCallback(() => {
    if (!entry || outcome !== null) return;
    setOutcome('revealed');
    record(answer, 'revealed');
  }, [entry, outcome, answer, record]);

  const reportNotUnderstood = useCallback(() => {
    // The help opens at once; «noted» appears only once the note is saved.
    setSelfReport('asked');
    const attempt = attemptRef.current;
    const token = cardTokenRef.current;
    if (!attempt || !onSelfReport) return;
    void attempt
      .then(async (id) => {
        if (id === null) return;
        await onSelfReport(id);
        if (cardTokenRef.current === token) setSelfReport('saved');
      })
      .catch((err: unknown) => {
        console.error('pack self-report log failed', err);
      });
  }, [onSelfReport]);

  const next = useCallback(() => {
    answeredRef.current = true;
    setOutcome(null);
    setAnswer('');
    setHelpOpen(false);
    setSelfReport('none');
    attemptRef.current = null;
    cardTokenRef.current += 1;
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
  const glosses = exercise.gloss ?? [];
  const hasHelp = glosses.length > 0;
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
        <div className={styles.tools}>
          {hasHelp && outcome === null && (
            <button
              type="button"
              className={styles.toolButton}
              aria-expanded={helpOpen}
              data-testid={`${testIdBase}-help`}
              onClick={() => {
                setHelpOpen(true);
              }}
            >
              {t('pack.help.open')}
            </button>
          )}
          {group.ruleId !== undefined && (
            // Keyed by exercise so an open rule never carries over to the next one.
            <RuleLink key={exercise.id} referenceId={group.ruleId} testIdBase={testIdBase} />
          )}
        </div>
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

      {(helpOpen || selfReported) && glosses.length > 0 && (
        <div className={styles.help} data-testid={`${testIdBase}-glosses`}>
          <p className={styles.helpTitle}>{t('pack.help.title')}</p>
          <ul className={styles.glossList}>
            {glosses.map((g) => (
              <li key={g.pt}>
                <span lang="pt-PT" className={styles.glossPt}>
                  {g.pt}
                </span>{' '}
                — {localized({ ru: g.ru, en: g.en }, lang)}
              </li>
            ))}
          </ul>
          {outcome === null && (
            <button
              type="button"
              className={styles.toolButton}
              data-testid={`${testIdBase}-reveal`}
              onClick={reveal}
            >
              {t('pack.help.reveal')}
            </button>
          )}
        </div>
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
          <button type="submit" className={styles.primaryButton} autoFocus ref={nextRef}>
            {t('pack.next')}
          </button>
        )}
      </form>

      {outcome !== null && (
        <div
          className={`${styles.feedback} ${outcome === 'correct' ? styles.correct : outcome === 'accent' ? styles.accent : outcome === 'revealed' ? styles.revealed : styles.wrong}`}
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
          {exercise.meaning && (
            <details
              className={styles.feedbackNote}
              open={helpOpen || selfReported || outcome === 'revealed'}
              data-testid={`${testIdBase}-meaning`}
            >
              <summary>{t('pack.help.meaning')}</summary>
              <p className={styles.meaning}>{localized(exercise.meaning, lang)}</p>
            </details>
          )}
          {outcome === 'wrong' && hasHelp && !helpOpen && (
            selfReported ? (
              selfReport === 'saved' && (
                <p className={styles.feedbackNote} data-testid={`${testIdBase}-self-reported`}>
                  {t('pack.help.selfReported')}
                </p>
              )
            ) : (
              <button
                type="button"
                className={styles.toolButton}
                data-testid={`${testIdBase}-self-report`}
                onClick={reportNotUnderstood}
              >
                {t('pack.help.selfReport')}
              </button>
            )
          )}
        </div>
      )}
    </section>
  );
}
