import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { SessionItem, Answer } from '../../modes/types'
import { getTranslationText } from './translationHelper'
import styles from './TextInput.module.css'

export interface TextInputProps {
  item: SessionItem
  onAnswer: (answer: Answer) => void
  /** Hint text shown above the question */
  hint?: string
  /** Input mode for mobile keyboard */
  inputMode?: 'text' | 'numeric'
  /** Custom answer comparison. Return boolean or 'exact'|'close'|'wrong' for nuanced feedback */
  compareAnswer?: (userInput: string, correctAnswer: string) => boolean | 'exact' | 'close' | 'wrong'
  /** Format question for display. Default: identity */
  formatQuestion?: (question: string) => string
  /** Format correct answer in "Wrong: ..." feedback. Default: identity */
  formatCorrectAnswer?: (answer: string) => string
  /** Extra content rendered between feedback and cheat sheet area */
  children?: React.ReactNode
  /** i18n keys override. Defaults to generic study.* keys */
  i18nKeys?: { check: string; correct: string; wrong: string; next: string; almostCorrect?: string }
}

const FEEDBACK_DELAY = 1500

function defaultCompare(input: string, correct: string): boolean {
  return input.trim().toLowerCase() === correct.trim().toLowerCase()
}

/**
 * Shared text-input exercise component.
 *
 * Manages its own reset cycle via `trackedId` state.
 * When parent passes a new item, we detect the mismatch and
 * reset synchronously during render (no effect needed for setState).
 * This keeps the same DOM alive so mobile keyboard stays open.
 */
export default function TextInput({
  item,
  onAnswer,
  hint,
  inputMode = 'text',
  compareAnswer = defaultCompare,
  formatQuestion,
  formatCorrectAnswer,
  children,
  i18nKeys,
}: TextInputProps) {
  const { t, i18n } = useTranslation()
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'close' | 'wrong' | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const [trackedId, setTrackedId] = useState(item.id)
  const startTime = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const submitted = useRef(false)
  const pendingAnswer = useRef<Answer | null>(null)

  const keys = {
    check: i18nKeys?.check ?? 'numbers.check',
    correct: i18nKeys?.correct ?? 'numbers.correct',
    wrong: i18nKeys?.wrong ?? 'numbers.wrong',
    next: i18nKeys?.next ?? 'numbers.next',
    almostCorrect: i18nKeys?.almostCorrect ?? 'grammar.almostCorrect',
  }

  // Reset state during render when item changes (React-approved pattern)
  if (item.id !== trackedId) {
    setTrackedId(item.id)
    setInput('')
    setFeedback(null)
    setShowTranslation(false)
  }

  // Reset refs and re-focus when item changes
  useEffect(() => {
    submitted.current = false
    pendingAnswer.current = null
    startTime.current = Date.now()
    inputRef.current?.focus()
  }, [trackedId])

  const checkAnswer = useCallback(() => {
    if (submitted.current || input.trim() === '') return
    submitted.current = true

    const timeMs = Date.now() - startTime.current
    const result = compareAnswer(input, item.correctAnswer)

    // Normalize result: boolean → 'exact'/'wrong', string passthrough
    const resultStr = typeof result === 'boolean'
      ? (result ? 'exact' : 'wrong')
      : result

    const isCorrect = resultStr === 'exact'
    const feedbackType = resultStr === 'exact' ? 'correct' as const
      : resultStr === 'close' ? 'close' as const
      : 'wrong' as const

    setFeedback(feedbackType)
    const answer: Answer = { value: input.trim(), correct: isCorrect, timeMs }

    if (isCorrect) {
      setTimeout(() => onAnswer(answer), FEEDBACK_DELAY)
    } else {
      pendingAnswer.current = answer
    }
  }, [input, item.correctAnswer, compareAnswer, onAnswer])

  const handleNext = () => {
    if (pendingAnswer.current) onAnswer(pendingAnswer.current)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (feedback === 'wrong' || feedback === 'close') {
        handleNext()
      } else if (feedback === null) {
        checkAnswer()
      }
    }
  }

  const displayQuestion = formatQuestion ? formatQuestion(item.question) : item.question
  const displayCorrect = formatCorrectAnswer
    ? formatCorrectAnswer(item.correctAnswer)
    : item.correctAnswer

  return (
    <div className={styles.container}>
      {hint && <p className={styles.hint}>{hint}</p>}
      <div className={styles.question}>{displayQuestion}</div>

      <div className={styles.inputArea}>
        <input
          key={item.id}
          ref={inputRef}
          className={`${styles.input} ${feedback === 'correct' ? styles.inputCorrect : ''} ${feedback === 'close' ? styles.inputClose : ''} ${feedback === 'wrong' ? styles.inputWrong : ''}`}
          type="text"
          inputMode={inputMode}
          value={input}
          onChange={(e) => {
            if (!submitted.current) setInput(e.target.value)
          }}
          onKeyDown={handleKeyDown}
          readOnly={feedback !== null}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        {feedback === null && (
          <button
            className={styles.checkButton}
            onClick={checkAnswer}
            disabled={input.trim() === ''}
          >
            {t(keys.check)}
          </button>
        )}
      </div>

      {feedback !== null && (
        <div
          className={`${styles.feedback} ${feedback === 'correct' ? styles.feedbackCorrect : feedback === 'close' ? styles.feedbackClose : styles.feedbackWrong}`}
        >
          <span className={styles.feedbackIcon}>
            {feedback === 'correct' ? '✓' : feedback === 'close' ? '≈' : '✗'}
          </span>
          <span>
            {feedback === 'correct'
              ? t(keys.correct)
              : feedback === 'close'
                ? `${t(keys.almostCorrect)}: ${displayCorrect}`
                : `${t(keys.wrong)}: ${displayCorrect}`}
          </span>
        </div>
      )}

      {(feedback === 'wrong' || feedback === 'close') && (() => {
        const rule = item.payload.rule as Record<string, string> | undefined
        const ruleText = rule?.[i18n.language] ?? rule?.en ?? rule?.ru
        if (!ruleText) return null
        return <p className={styles.ruleHint}>{ruleText}</p>
      })()}

      {(feedback === 'wrong' || feedback === 'close') && (
        <button className={styles.nextButton} onClick={handleNext}>
          {t(keys.next)}
        </button>
      )}

      {(() => {
        const translationText = getTranslationText(item.payload, i18n.language)
        if (!translationText) return null
        return (
          <>
            <button
              className={styles.translationToggle}
              onClick={() => setShowTranslation((v) => !v)}
            >
              {t('common.translation')} {showTranslation ? '▲' : '▼'}
            </button>
            {showTranslation && (
              <p className={styles.translationText}>{translationText}</p>
            )}
          </>
        )
      })()}

      {children}
    </div>
  )
}
