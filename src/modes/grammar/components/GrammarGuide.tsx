import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { GrammarCategory } from '../state'
import ConjugationGuide from './guide/ConjugationGuide'
import GenderGuide from './guide/GenderGuide'
import ArticleGuide from './guide/ArticleGuide'
import PluralGuide from './guide/PluralGuide'
import PrepositionGuide from './guide/PrepositionGuide'
import WordOrderGuide from './guide/WordOrderGuide'
import styles from './GrammarGuide.module.css'

const CATEGORIES: GrammarCategory[] = [
  'conjugation', 'gender', 'articles', 'plural', 'prepositions', 'word_order',
]

export interface GrammarGuideProps {
  open: boolean
  onClose: () => void
  initialCategory?: GrammarCategory
  highlightVerb?: string
}

export default function GrammarGuide({ open, onClose, initialCategory, highlightVerb }: GrammarGuideProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<GrammarCategory>(initialCategory ?? 'conjugation')
  const [trackedOpen, setTrackedOpen] = useState(false)

  // Sync activeTab when overlay opens with a new initialCategory
  if (open && !trackedOpen) {
    setTrackedOpen(true)
    if (initialCategory) setActiveTab(initialCategory)
  }
  if (!open && trackedOpen) {
    setTrackedOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  if (!open) return null

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <h2 className={styles.title}>{t('grammar.guideTitle')}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label={t('common.cancel')}>
            ✕
          </button>
        </div>
        <div className={styles.tabs}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.tab} ${activeTab === cat ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(cat)}
            >
              {t(`grammar.category.${cat}`)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {activeTab === 'conjugation' && <ConjugationGuide highlightVerb={highlightVerb} />}
        {activeTab === 'gender' && <GenderGuide />}
        {activeTab === 'articles' && <ArticleGuide />}
        {activeTab === 'plural' && <PluralGuide />}
        {activeTab === 'prepositions' && <PrepositionGuide />}
        {activeTab === 'word_order' && <WordOrderGuide />}
      </div>
    </div>,
    document.body,
  )
}
