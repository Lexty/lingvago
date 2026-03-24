import { useState, useEffect, useRef, useCallback } from 'react'
import type { SessionItem, Answer } from '../../types'
import styles from './MultipleChoice.module.css'

interface MultipleChoiceProps {
  item: SessionItem
  onAnswer: (answer: Answer) => void
}

const FEEDBACK_DELAY = 1500

export default function MultipleChoice({ item, onAnswer }: MultipleChoiceProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const startTime = useRef(0)
  const feedbackActive = useRef(false)

  // Set start time on mount (parent keys this component by item.id)
  useEffect(() => {
    startTime.current = Date.now()
  }, [])

  const handleSelect = useCallback(
    (option: string) => {
      if (feedbackActive.current) return
      feedbackActive.current = true

      setSelected(option)
      setShowFeedback(true)

      const timeMs = Date.now() - startTime.current
      const correct = option === item.correctAnswer

      setTimeout(() => {
        feedbackActive.current = false
        onAnswer({ value: option, correct, timeMs })
      }, FEEDBACK_DELAY)
    },
    [item.correctAnswer, onAnswer],
  )

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

  return (
    <div className={styles.container}>
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
    </div>
  )
}
