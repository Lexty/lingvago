import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { getAllModes } from '../../modes/registry'
import { db } from '../../db/index'
import styles from './Dashboard.module.css'
import { useState, useEffect, useMemo } from 'react'
import type { ModeStats } from '../../modes/types'

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const modes = useMemo(() => getAllModes(), [])

  const wordCount = useLiveQuery(() => db.words.count())
  const [vocabStats, setVocabStats] = useState<ModeStats | null>(null)
  const [dueCounts, setDueCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    const vocabMode = modes.find((m) => m.id === 'vocabulary')
    if (vocabMode) {
      vocabMode.getStats().then(setVocabStats)
      vocabMode.getDueCount().then((c) =>
        setDueCounts((prev) => ({ ...prev, vocabulary: c })),
      )
    }
  }, [modes, wordCount]) // re-run when word count changes

  const learnedCount = vocabStats?.totalItems
    ? Math.round(vocabStats.averageRetention * vocabStats.totalItems)
    : 0
  const retentionPct = vocabStats
    ? Math.round(vocabStats.averageRetention * 100)
    : 0

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('dashboard.title')}</h1>

      <div className={styles.summaryCard}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{wordCount ?? 0}</span>
          <span className={styles.statLabel}>{t('dashboard.words')}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{learnedCount}</span>
          <span className={styles.statLabel}>{t('dashboard.learned')}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{retentionPct}%</span>
          <span className={styles.statLabel}>{t('dashboard.retention')}</span>
        </div>
      </div>

      <div className={styles.modesSection}>
        {modes.map((mode) => (
          <div key={mode.id} className={styles.modeCard}>
            <div className={styles.modeHeader}>
              <span className={styles.modeIcon}>{mode.icon}</span>
              <div className={styles.modeInfo}>
                <span className={styles.modeName}>
                  {t(`mode.${mode.id}.title`)}
                </span>
                <span className={styles.modeDue}>
                  {dueCounts[mode.id] != null
                    ? `${dueCounts[mode.id]} ${t('dashboard.due')}`
                    : t('dashboard.alwaysAvailable')}
                </span>
              </div>
            </div>
            <button
              className={styles.studyButton}
              onClick={() => navigate(`/study/${mode.id}`)}
            >
              {t('dashboard.study')}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
