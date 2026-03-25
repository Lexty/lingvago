import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { getMode } from '../../registry'
import type { GrammarCategory, Tense } from '../state'
import type { GrammarMode } from '../GrammarMode'
import GrammarReference from './GrammarReference'
import styles from './GrammarSetup.module.css'

interface GrammarSetupProps {
  onStart: () => void
}

const ALL_CATEGORIES: GrammarCategory[] = [
  'conjugation',
  'gender',
  'articles',
  'plural',
  'prepositions',
  'word_order',
]

const ALL_TENSES: Tense[] = ['presente', 'preterito_perfeito', 'preterito_imperfeito']

export default function GrammarSetup({ onStart }: GrammarSetupProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selectedCats, setSelectedCats] = useState<Set<GrammarCategory>>(
    new Set(['conjugation']),
  )
  const [selectedTenses, setSelectedTenses] = useState<Set<Tense>>(
    new Set(['presente']),
  )
  const [showCheat, setShowCheat] = useState(false)

  const toggleCategory = (cat: GrammarCategory) => {
    setSelectedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  const toggleTense = (tense: Tense) => {
    setSelectedTenses((prev) => {
      const next = new Set(prev)
      if (next.has(tense)) {
        next.delete(tense)
      } else {
        next.add(tense)
      }
      return next
    })
  }

  const canStart =
    selectedCats.size > 0 &&
    (!selectedCats.has('conjugation') || selectedTenses.size > 0)

  const handleStart = () => {
    const mode = getMode('grammar') as GrammarMode
    mode.setCategories([...selectedCats])
    mode.setTenses([...selectedTenses])
    onStart()
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('mode.grammar.title')}</h1>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('grammar.selectCategories')}</h2>
        <div className={styles.options}>
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.optionButton} ${selectedCats.has(cat) ? styles.optionActive : ''}`}
              onClick={() => toggleCategory(cat)}
            >
              {t(`grammar.category.${cat}`)}
            </button>
          ))}
        </div>
      </div>

      {selectedCats.has('conjugation') && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('grammar.selectTenses')}</h2>
          <div className={styles.options}>
            {ALL_TENSES.map((tense) => (
              <button
                key={tense}
                className={`${styles.optionButton} ${selectedTenses.has(tense) ? styles.optionActive : ''}`}
                onClick={() => toggleTense(tense)}
              >
                {t(`grammar.tense.${tense}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        className={styles.startButton}
        onClick={handleStart}
        disabled={!canStart}
      >
        {t('grammar.start')}
      </button>

      <button className={styles.backButton} onClick={() => navigate('/')}>
        {t('study.toHome')}
      </button>

      <button
        className={styles.cheatToggle}
        onClick={() => setShowCheat((v) => !v)}
      >
        {t('grammar.reference')} {showCheat ? '▲' : '▼'}
      </button>

      {showCheat && (
        <div className={styles.cheatContainer}>
          <GrammarReference category="conjugation" />
          <GrammarReference category="gender" />
          <GrammarReference category="articles" />
          <GrammarReference category="plural" />
          <GrammarReference category="prepositions" />
          <GrammarReference category="word_order" />
        </div>
      )}
    </div>
  )
}
