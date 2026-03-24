import { useTranslation } from 'react-i18next'
import styles from './SessionSummary.module.css'

interface SessionSummaryProps {
  correctCount: number
  totalCount: number
  elapsedTime: number
  onStudyMore: () => void
  onGoHome: () => void
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins} мин ${secs} сек`
  }
  return `${secs} сек`
}

export default function SessionSummary({
  correctCount,
  totalCount,
  elapsedTime,
  onStudyMore,
  onGoHome,
}: SessionSummaryProps) {
  const { t } = useTranslation()

  const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

  // SVG ring parameters
  const size = 160
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  if (totalCount === 0) {
    return (
      <div className={styles.container}>
        <p className={styles.noCards}>{t('study.noCards')}</p>
        <button className={styles.homeButton} onClick={onGoHome}>
          {t('study.toHome')}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t('study.sessionComplete')}</h2>

      <div className={styles.ringContainer}>
        <svg width={size} height={size} className={styles.ring}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-bg-secondary)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className={styles.ringText}>
          <span className={styles.ringScore}>
            {correctCount}/{totalCount}
          </span>
          <span className={styles.ringPercent}>{percentage}%</span>
        </div>
      </div>

      <div className={styles.time}>
        <span className={styles.timeLabel}>{t('study.time')}</span>
        <span className={styles.timeValue}>{formatDuration(elapsedTime)}</span>
      </div>

      <div className={styles.actions}>
        <button className={styles.studyMoreButton} onClick={onStudyMore}>
          {t('study.studyMore')}
        </button>
        <button className={styles.homeButton} onClick={onGoHome}>
          {t('study.toHome')}
        </button>
      </div>
    </div>
  )
}
