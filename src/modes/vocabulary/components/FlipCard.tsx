import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Rating } from 'ts-fsrs'
import type { SessionItem, Answer } from '../../types'
import styles from './FlipCard.module.css'

interface FlipCardProps {
  item: SessionItem
  onAnswer: (answer: Answer) => void
}

export default function FlipCard({ item, onAnswer }: FlipCardProps) {
  const { t } = useTranslation()
  const [flipped, setFlipped] = useState(false)
  const [trackedId, setTrackedId] = useState(item.id)
  const startTime = useRef(0)

  // Reset state during render when item changes
  if (item.id !== trackedId) {
    setTrackedId(item.id)
    setFlipped(false)
  }

  useEffect(() => {
    startTime.current = Date.now()
  }, [trackedId])

  const handleRating = useCallback(
    (rating: Rating) => {
      const timeMs = Date.now() - startTime.current
      const correct = rating >= Rating.Good
      onAnswer({
        value: item.correctAnswer,
        correct,
        fsrsRating: rating,
        timeMs,
      })
    },
    [item.correctAnswer, onAnswer],
  )

  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${flipped ? styles.flipped : ''}`}>
        <div className={styles.front}>
          <div className={styles.question}>{item.question}</div>
          <button className={styles.showButton} onClick={() => setFlipped(true)}>
            {t('study.showAnswer')}
          </button>
        </div>
        <div className={styles.back}>
          <div className={styles.answer}>{item.correctAnswer}</div>
          <div className={styles.ratingButtons}>
            <button
              className={`${styles.ratingButton} ${styles.again}`}
              onClick={() => handleRating(Rating.Again)}
            >
              {t('study.again')}
            </button>
            <button
              className={`${styles.ratingButton} ${styles.hard}`}
              onClick={() => handleRating(Rating.Hard)}
            >
              {t('study.hard')}
            </button>
            <button
              className={`${styles.ratingButton} ${styles.good}`}
              onClick={() => handleRating(Rating.Good)}
            >
              {t('study.good')}
            </button>
            <button
              className={`${styles.ratingButton} ${styles.easy}`}
              onClick={() => handleRating(Rating.Easy)}
            >
              {t('study.easy')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
