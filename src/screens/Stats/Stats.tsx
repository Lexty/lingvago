import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/index'
import styles from './Stats.module.css'

export default function Stats() {
  const { t, i18n } = useTranslation()

  const data = useLiveQuery(async () => {
    const decks = await db.decks.toArray()
    const activeDeckIds = new Set(decks.filter((d) => d.isActive).map((d) => d.id!))
    if (activeDeckIds.size === 0) return null

    const settings = await db.settings.get('global')
    const studyLanguage = settings?.studyLanguage ?? 'ru'
    const directions = [`pt→${studyLanguage}`, `${studyLanguage}→pt`]

    const words = await db.words.where('deckId').anyOf([...activeDeckIds]).toArray()
    const wordIds = new Set(words.map((w) => w.id!))

    const allCards = await db.cardStates.where('wordId').anyOf([...wordIds]).toArray()
    const cards = allCards.filter((cs) => directions.includes(cs.direction))

    // Count by FSRS state
    const stateCounts = [0, 0, 0, 0] // New, Learning, Review, Relearning
    for (const cs of cards) {
      if (cs.state >= 0 && cs.state <= 3) stateCounts[cs.state]++
    }

    // Retention
    const reviewedCards = cards.filter((cs) => cs.reps > 0)
    const averageRetention =
      reviewedCards.length > 0
        ? reviewedCards.reduce((sum, cs) => sum + (1 - cs.lapses / cs.reps), 0) / reviewedCards.length
        : 0
    const totalReviews = cards.reduce((sum, cs) => sum + cs.reps, 0)

    // Sessions (last 20)
    const sessions = await db.sessions.orderBy('startedAt').reverse().limit(20).toArray()

    return {
      totalWords: words.length,
      learnedCount: stateCounts[2], // Review state
      newCount: stateCounts[0],
      stateCounts,
      averageRetention,
      totalReviews,
      sessions,
    }
  })

  if (data === undefined) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>{t('stats.title')}</h1>
        <p className={styles.empty}>{t('common.loading')}</p>
      </div>
    )
  }

  if (data === null) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>{t('stats.title')}</h1>
        <p className={styles.empty}>{t('decks.empty')}</p>
      </div>
    )
  }

  const { totalWords, learnedCount, newCount, stateCounts, averageRetention, totalReviews, sessions } = data
  const retentionPct = Math.round(averageRetention * 100)
  const maxStateCount = Math.max(...stateCounts, 1)

  const stateLabels = [
    { key: 'stateNew', css: styles.barFillNew },
    { key: 'stateLearning', css: styles.barFillLearning },
    { key: 'stateReview', css: styles.barFillReview },
    { key: 'stateRelearning', css: styles.barFillRelearning },
  ]

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' })

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('stats.title')}</h1>

      {/* Summary */}
      <div className={styles.summaryCard}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalWords}</span>
          <span className={styles.statLabel}>{t('stats.totalWords')}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{learnedCount}</span>
          <span className={styles.statLabel}>{t('stats.learned')}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{newCount}</span>
          <span className={styles.statLabel}>{t('stats.newCards')}</span>
        </div>
      </div>

      {/* Card state bars */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('stats.cardStates')}</h2>
        <div className={styles.barChart}>
          {stateLabels.map((s, i) => (
            <div key={s.key} className={styles.barRow}>
              <span className={styles.barLabel}>{t(`stats.${s.key}`)}</span>
              <div className={styles.barTrack}>
                <div
                  className={`${styles.barFill} ${s.css}`}
                  style={{ width: `${(stateCounts[i] / maxStateCount) * 100}%` }}
                />
              </div>
              <span className={styles.barCount}>{stateCounts[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Retention */}
      <div className={styles.retentionCard}>
        <div>
          <span className={styles.retentionLabel}>{t('stats.retention')}</span>
          <br />
          <span className={styles.retentionMeta}>
            {totalReviews} {t('stats.totalReviews')}
          </span>
        </div>
        <span className={styles.retentionValue}>{retentionPct}%</span>
      </div>

      {/* Session history */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('stats.sessions')}</h2>
        {sessions.length === 0 ? (
          <p className={styles.empty}>{t('stats.noSessions')}</p>
        ) : (
          <div className={styles.sessionList}>
            {sessions.map((s) => {
              const pct = s.totalCards > 0 ? Math.round((s.correctCards / s.totalCards) * 100) : 0
              const pctClass =
                pct >= 80 ? styles.sessionPercentGood : pct >= 50 ? styles.sessionPercentOk : styles.sessionPercentBad
              return (
                <div key={s.id} className={styles.sessionRow}>
                  <span className={styles.sessionDate}>{dateFormatter.format(s.startedAt)}</span>
                  <span className={styles.sessionScore}>
                    {s.correctCards}/{s.totalCards}
                  </span>
                  <span className={`${styles.sessionPercent} ${pctClass}`}>{pct}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
