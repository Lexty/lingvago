import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SessionItem, Answer } from '../../types'
import { normalize, getLevel, getCheatSheet, numberToText } from '../data'
import styles from './NumberInput.module.css'

interface NumberInputProps {
  item: SessionItem
  onAnswer: (answer: Answer) => void
}

const FEEDBACK_DELAY = 1500

/** Format number with space separators */
function formatNumber(n: number | string): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009')
}

/**
 * NumberInput manages its own reset cycle via `itemId` state.
 * When parent passes a new item, we detect the mismatch and
 * reset synchronously during render (no effect needed for setState).
 * This keeps the same DOM <input> alive so mobile keyboard stays open.
 */
export default function NumberInput({ item, onAnswer }: NumberInputProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [showCheat, setShowCheat] = useState(false)
  const [trackedId, setTrackedId] = useState(item.id)
  const startTime = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const submitted = useRef(false)
  const pendingAnswer = useRef<Answer | null>(null)

  // Reset state during render when item changes (React-approved pattern)
  if (item.id !== trackedId) {
    setTrackedId(item.id)
    setInput('')
    setFeedback(null)
  }

  const isDigitToWord = item.payload.direction === 'digit-to-word'

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
    let correct: boolean

    if (isDigitToWord) {
      correct = normalize(input) === normalize(item.correctAnswer)
    } else {
      const cleaned = input.replace(/[\s.,]/g, '')
      const parsed = parseInt(cleaned, 10)
      correct = !isNaN(parsed) && parsed === Number(item.correctAnswer)
    }

    setFeedback(correct ? 'correct' : 'wrong')
    const answer: Answer = { value: input.trim(), correct, timeMs }

    if (correct) {
      setTimeout(() => onAnswer(answer), FEEDBACK_DELAY)
    } else {
      pendingAnswer.current = answer
    }
  }, [input, item.correctAnswer, isDigitToWord, onAnswer])

  const handleNext = () => {
    if (pendingAnswer.current) onAnswer(pendingAnswer.current)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (feedback === 'wrong') {
        handleNext()
      } else if (feedback === null) {
        checkAnswer()
      }
    }
  }

  const cheatGroups = useMemo(() => getCheatSheet(getLevel()), [])

  return (
    <div className={styles.container}>
      <p className={styles.hint}>
        {isDigitToWord ? t('numbers.writeWord') : t('numbers.writeNumber')}
      </p>
      <div className={styles.question}>
        {isDigitToWord ? formatNumber(item.question) : item.question}
      </div>

      <div className={styles.inputArea}>
        <input
          key={item.id}
          ref={inputRef}
          className={`${styles.input} ${feedback === 'correct' ? styles.inputCorrect : ''} ${feedback === 'wrong' ? styles.inputWrong : ''}`}
          type="text"
          inputMode={isDigitToWord ? 'text' : 'numeric'}
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
            {t('numbers.check')}
          </button>
        )}
      </div>

      {feedback !== null && (
        <div className={`${styles.feedback} ${feedback === 'correct' ? styles.feedbackCorrect : styles.feedbackWrong}`}>
          <span className={styles.feedbackIcon}>{feedback === 'correct' ? '✓' : '✗'}</span>
          <span>
            {feedback === 'correct'
              ? t('numbers.correct')
              : `${t('numbers.wrong')}: ${isDigitToWord ? item.correctAnswer : formatNumber(item.correctAnswer)}`}
          </span>
        </div>
      )}

      {feedback === 'wrong' && (
        <button className={styles.nextButton} onClick={handleNext}>
          {t('numbers.next')}
        </button>
      )}

      <button
        className={styles.cheatToggle}
        onClick={() => setShowCheat((v) => !v)}
      >
        {t('numbers.cheatSheet')} {showCheat ? '▲' : '▼'}
      </button>

      {showCheat && (
        <div className={styles.cheatSheet}>
          {cheatGroups.map((group, gi) => (
            <div key={gi} className={styles.cheatGroup}>
              {group.numbers.map(({ n, text }) => (
                <div key={n} className={styles.cheatRow}>
                  <span className={styles.cheatNumber}>{formatNumber(n)}</span>
                  <span className={styles.cheatText}>{text}</span>
                </div>
              ))}
            </div>
          ))}
          <div className={styles.cheatGroup}>
            <p className={styles.cheatHint}>{t('numbers.compositionHint')}</p>
            <div className={styles.cheatRow}>
              <span className={styles.cheatNumber}>21</span>
              <span className={styles.cheatText}>{numberToText(21)}</span>
            </div>
            <div className={styles.cheatRow}>
              <span className={styles.cheatNumber}>145</span>
              <span className={styles.cheatText}>{numberToText(145)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
