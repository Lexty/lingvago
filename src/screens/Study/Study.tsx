import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { getMode } from '../../modes/registry'
import { useSession } from '../../hooks/useSession'
import { db } from '../../db/index'
import type { LearningMode } from '../../modes/types'
import type { GrammarCategory } from '../../modes/grammar/state'
import GrammarGuide from '../../modes/grammar/components/GrammarGuide'
import SessionSummary from './SessionSummary'
import styles from './Study.module.css'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function Study() {
  const { modeId } = useParams<{ modeId: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [setupDone, setSetupDone] = useState(false)

  const settings = useLiveQuery(() => db.settings.get('global'))

  const mode = getMode(modeId ?? '')

  if (settings === undefined) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>{t('common.loading')}</div>
      </div>
    )
  }

  if (!mode) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{t('study.error')}</p>
          <button className={styles.retryButton} onClick={() => navigate('/')}>
            {t('study.toHome')}
          </button>
        </div>
      </div>
    )
  }

  const SetupComponent = mode.setupComponent

  if (SetupComponent && !setupDone) {
    return (
      <div className={styles.container}>
        <SetupComponent onStart={() => setSetupDone(true)} />
      </div>
    )
  }

  return <StudySession mode={mode} sessionSize={settings?.sessionSize ?? 10} />
}

function StudySession({ mode, sessionSize }: { mode: LearningMode; sessionSize: number }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const session = useSession(mode, sessionSize)
  const [guideOpen, setGuideOpen] = useState(false)
  const isGrammar = mode.id === 'grammar'

  if (session.status === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>{t('common.loading')}</div>
      </div>
    )
  }

  if (session.status === 'error') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{t('study.error')}</p>
          <p className={styles.errorDetail}>{session.error}</p>
          <button className={styles.retryButton} onClick={session.startSession}>
            {t('study.retry')}
          </button>
        </div>
      </div>
    )
  }

  if (session.status === 'finished') {
    return (
      <SessionSummary
        correctCount={session.correctCount}
        totalCount={session.totalCount}
        elapsedTime={session.elapsedTime}
        onStudyMore={session.startSession}
        onGoHome={() => navigate('/')}
      />
    )
  }

  const { currentItem, currentIndex, totalCount, elapsedTime } = session

  const ExerciseComponent = currentItem
    ? mode.exerciseComponents[currentItem.exerciseType]
    : undefined

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.progress}>
          {t('study.progress', {
            current: currentIndex + 1,
            total: totalCount,
          })}
        </span>
        {isGrammar && (
          <button className={styles.guideButton} onClick={() => setGuideOpen(true)} aria-label={t('grammar.openGuide')}>
            &#128214;
          </button>
        )}
        <span className={styles.timer}>{formatTime(elapsedTime)}</span>
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${((currentIndex + 1) / totalCount) * 100}%` }}
        />
      </div>

      {ExerciseComponent && currentItem && (
        <ExerciseComponent item={currentItem} onAnswer={session.submitAnswer} />
      )}

      {isGrammar && (
        <GrammarGuide
          key={guideOpen ? 'open' : 'closed'}
          open={guideOpen}
          onClose={() => setGuideOpen(false)}
          initialCategory={currentItem?.payload?.category as GrammarCategory | undefined}
          highlightVerb={currentItem?.payload?.infinitive as string | undefined}
        />
      )}
    </div>
  )
}
