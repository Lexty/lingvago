import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { SessionItem, Answer } from '../../modes/types'
import { getTranslationText } from './translationHelper'
import styles from './MultipleChoice.module.css'

export interface MultipleChoiceProps {
  item: SessionItem
  onAnswer: (answer: Answer) => void
}

const FEEDBACK_DELAY = 1500

export default function MultipleChoice({ item, onAnswer }: MultipleChoiceProps) {
  const { t, i18n } = useTranslation()
  const [selected, setSelected] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [trackedId, setTrackedId] = useState(item.id)
  const startTime = useRef(0)
  const feedbackActive = useRef(false)
  const pendingAnswer = useRef<Answer | null>(null)

  // Reset state during render when item changes
  if (item.id !== trackedId) {
    setTrackedId(item.id)
    setSelected(null)
    setShowFeedback(false)
    setShowTranslation(false)
  }

  useEffect(() => {
    startTime.current = Date.now()
    feedbackActive.current = false
    pendingAnswer.current = null
  }, [trackedId])

  const handleSelect = useCallback(
    (option: string) => {
      if (feedbackActive.current) return
      feedbackActive.current = true

      setSelected(option)
      setShowFeedback(true)

      const timeMs = Date.now() - startTime.current
      const correct = option === item.correctAnswer
      const answer: Answer = { value: option, correct, timeMs }

      if (correct) {
        // Auto-advance on correct
        setTimeout(() => {
          feedbackActive.current = false
          onAnswer(answer)
        }, FEEDBACK_DELAY)
      } else {
        // Wait for manual "Next" on wrong — gives time to read rule/feedback
        pendingAnswer.current = answer
      }
    },
    [item.correctAnswer, onAnswer],
  )

  const handleNext = () => {
    if (pendingAnswer.current) {
      feedbackActive.current = false
      onAnswer(pendingAnswer.current)
    }
  }

  const getOptionClass = (option: string): string => {
    const classes = [styles.option]
    if (!showFeedback) return classes.join(' ')

    if (option === item.correctAnswer) {
      classes.push(styles.correct)
    } else if (option === selected) {
      classes.push(styles.wrong)
    }
    return classes.join(' ')
  }

  const translationText = getTranslationText(item.payload, i18n.language)
  const hintKey = item.payload.hint as string | undefined
  const isWrong = showFeedback && selected !== item.correctAnswer

  return (
    <div className={styles.container}>
      {hintKey && <p className={styles.hint}>{t(hintKey)}</p>}
      <div className={styles.question}>{item.question}</div>
      <div className={styles.optionsGrid}>
        {item.options?.map((option) => (
          <button
            key={option}
            className={getOptionClass(option)}
            onClick={() => handleSelect(option)}
            disabled={showFeedback}
          >
            {option}
          </button>
        ))}
      </div>

      {isWrong && (() => {
        const rule = item.payload.rule as Record<string, string> | undefined
        const ruleText = rule?.[i18n.language] ?? rule?.en ?? rule?.ru
        if (!ruleText) return null
        return <p className={styles.ruleHint}>{ruleText}</p>
      })()}

      {isWrong && (
        <button className={styles.nextButton} onClick={handleNext}>
          {t('grammar.next')}
        </button>
      )}

      {translationText && (
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
      )}
    </div>
  )
}
