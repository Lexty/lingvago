import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { SessionItem, Answer } from '../../modes/types'
import { getTranslationText } from './translationHelper'
import styles from './WordOrder.module.css'

export interface WordOrderProps {
  item: SessionItem
  onAnswer: (answer: Answer) => void
}

const FEEDBACK_DELAY = 1500

export default function WordOrder({ item, onAnswer }: WordOrderProps) {
  const { t, i18n } = useTranslation()
  const [selected, setSelected] = useState<number[]>([])
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const [trackedId, setTrackedId] = useState(item.id)
  const startTime = useRef(0)
  const pendingAnswer = useRef<Answer | null>(null)

  const words = item.options ?? []
  const punctuation = (item.payload.punctuation as string) ?? '.'
  const hintKey = item.payload.hint as string | undefined

  // Reset state during render when item changes
  if (item.id !== trackedId) {
    setTrackedId(item.id)
    setSelected([])
    setFeedback(null)
    setShowTranslation(false)
  }

  useEffect(() => {
    startTime.current = Date.now()
    pendingAnswer.current = null
  }, [trackedId])

  const selectedSet = new Set(selected)
  const allPlaced = selected.length === words.length
  const selectedWords = selected.map((i) => words[i])

  const handlePoolTap = useCallback((index: number) => {
    if (feedback !== null) return
    setSelected((prev) => {
      if (prev.includes(index)) return prev
      return [...prev, index]
    })
  }, [feedback])

  const handleAnswerTap = useCallback((index: number) => {
    if (feedback !== null) return
    setSelected((prev) => prev.filter((i) => i !== index))
  }, [feedback])

  const handleCheck = useCallback(() => {
    if (!allPlaced || feedback !== null) return

    const validAnswers = (item.payload.answers as string[]) ?? [item.correctAnswer]
    const userSentence = selectedWords.join(' ') + punctuation
    const normalized = userSentence.trim().toLowerCase()
    const correct = validAnswers.some((a) => a.trim().toLowerCase() === normalized)
    const timeMs = Date.now() - startTime.current
    const answer: Answer = { value: userSentence, correct, timeMs }

    setFeedback(correct ? 'correct' : 'wrong')

    if (correct) {
      setTimeout(() => onAnswer(answer), FEEDBACK_DELAY)
    } else {
      pendingAnswer.current = answer
    }
  }, [allPlaced, feedback, selectedWords, punctuation, item.payload.answers, item.correctAnswer, onAnswer])

  const handleNext = () => {
    if (pendingAnswer.current) onAnswer(pendingAnswer.current)
  }

  const translationText = getTranslationText(item.payload, i18n.language)

  return (
    <div className={styles.container}>
      {hintKey && <p className={styles.hint}>{t(hintKey)}</p>}

      {translationText && (
        <div className={styles.question}>{translationText}</div>
      )}

      <div
        className={`${styles.answerArea} ${feedback === 'correct' ? styles.answerCorrect : ''} ${feedback === 'wrong' ? styles.answerWrong : ''}`}
      >
        {selected.length === 0 && feedback === null && (
          <span className={styles.placeholder}>...</span>
        )}
        {selectedWords.map((word, pos) => (
          <button
            key={`answer-${selected[pos]}`}
            className={`${styles.tile} ${styles.tileSelected} ${feedback === 'correct' ? styles.tileCorrect : ''} ${feedback === 'wrong' ? styles.tileWrong : ''}`}
            onClick={() => handleAnswerTap(selected[pos])}
            disabled={feedback !== null}
          >
            {word}
          </button>
        ))}
        {selected.length > 0 && (
          <span className={styles.punctuation}>{punctuation}</span>
        )}
      </div>

      <div className={styles.pool}>
        {words.map((word, index) => (
          <button
            key={`pool-${index}`}
            className={`${styles.tile} ${selectedSet.has(index) ? styles.tileHidden : ''}`}
            onClick={() => handlePoolTap(index)}
            disabled={feedback !== null || selectedSet.has(index)}
            aria-hidden={selectedSet.has(index)}
          >
            {word}
          </button>
        ))}
      </div>

      {feedback === null && allPlaced && (
        <button className={styles.checkButton} onClick={handleCheck}>
          {t('grammar.check')}
        </button>
      )}

      {feedback === 'correct' && (
        <div className={styles.feedback}>
          <span className={styles.feedbackIcon}>✓</span>
          <span>{t('grammar.correct')}</span>
        </div>
      )}

      {feedback === 'wrong' && (
        <>
          <div className={styles.feedbackWrong}>
            <span className={styles.feedbackIcon}>✗</span>
            <span>{t('grammar.wrong')}: {item.correctAnswer}</span>
          </div>

          {(() => {
            const rule = item.payload.rule as Record<string, string> | undefined
            const ruleText = rule?.[i18n.language] ?? rule?.en ?? rule?.ru
            if (!ruleText) return null
            return <p className={styles.ruleHint}>{ruleText}</p>
          })()}

          <button className={styles.nextButton} onClick={handleNext}>
            {t('grammar.next')}
          </button>
        </>
      )}

      {!translationText && (() => {
        const fallback = getTranslationText(item.payload, i18n.language)
        if (!fallback) return null
        return (
          <>
            <button
              className={styles.translationToggle}
              onClick={() => setShowTranslation((v) => !v)}
            >
              {t('common.translation')} {showTranslation ? '▲' : '▼'}
            </button>
            {showTranslation && (
              <p className={styles.translationText}>{fallback}</p>
            )}
          </>
        )
      })()}
    </div>
  )
}
