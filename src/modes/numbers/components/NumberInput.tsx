import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { SessionItem, Answer } from '../../types'
import { normalize, getLevel, getCheatSheet, numberToText } from '../data'
import styles from './NumberInput.module.css'

interface NumberInputProps {
  item: SessionItem
  onAnswer: (answer: Answer) => void
}

const FEEDBACK_DELAY = 1500

/** Format number with space separators: 1234567 → "1 234 567" */
function formatNumber(n: number | string): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009')
}

export default function NumberInput({ item, onAnswer }: NumberInputProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [showCheat, setShowCheat] = useState(false)
  const startTime = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const submitted = useRef(false)

  const isDigitToWord = item.payload.direction === 'digit-to-word'

  useEffect(() => {
    startTime.current = Date.now()
    inputRef.current?.focus()
  }, [])

  const checkAnswer = useCallback(() => {
    if (submitted.current || input.trim() === '') return
    submitted.current = true

    const timeMs = Date.now() - startTime.current
    let correct: boolean

    if (isDigitToWord) {
      correct = normalize(input) === normalize(item.correctAnswer)
    } else {
      // Strip spaces/dots/commas before parsing
      const cleaned = input.replace(/[\s.,]/g, '')
      const parsed = parseInt(cleaned, 10)
      correct = !isNaN(parsed) && parsed === Number(item.correctAnswer)
    }

    setFeedback(correct ? 'correct' : 'wrong')

    setTimeout(() => {
      onAnswer({ value: input.trim(), correct, timeMs })
    }, FEEDBACK_DELAY)
  }, [input, item.correctAnswer, isDigitToWord, onAnswer])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkAnswer()
    }
  }

  const cheatGroups = getCheatSheet(getLevel())

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
          ref={inputRef}
          className={`${styles.input} ${feedback === 'correct' ? styles.inputCorrect : ''} ${feedback === 'wrong' ? styles.inputWrong : ''}`}
          type="text"
          inputMode={isDigitToWord ? 'text' : 'numeric'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={feedback !== null}
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
