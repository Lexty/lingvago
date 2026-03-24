import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { setLevel, getCheatSheet, numberToText, type NumberLevel } from '../data'
import styles from './NumbersSetup.module.css'

interface NumbersSetupProps {
  onStart: () => void
}

const LEVELS: Array<{ id: NumberLevel; labelKey: string }> = [
  { id: 'hundred', labelKey: 'numbers.level100' },
  { id: 'thousand', labelKey: 'numbers.level1000' },
  { id: 'million', labelKey: 'numbers.level1m' },
]

/** Format number with space separators */
function fmt(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function NumbersSetup({ onStart }: NumbersSetupProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<NumberLevel>('hundred')
  const [showCheat, setShowCheat] = useState(false)

  const handleStart = () => {
    setLevel(selected)
    onStart()
  }

  const cheatGroups = getCheatSheet(selected)

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t('mode.numbers.title')}</h1>

      <div className={styles.levels}>
        {LEVELS.map((l) => (
          <button
            key={l.id}
            className={`${styles.levelButton} ${selected === l.id ? styles.levelActive : ''}`}
            onClick={() => setSelected(l.id)}
          >
            {t(l.labelKey)}
          </button>
        ))}
      </div>

      <button className={styles.startButton} onClick={handleStart}>
        {t('numbers.start')}
      </button>

      <button className={styles.backButton} onClick={() => navigate('/')}>
        {t('study.toHome')}
      </button>

      <button
        className={styles.cheatToggle}
        onClick={() => setShowCheat((v) => !v)}
      >
        {t('numbers.cheatSheet')} {showCheat ? '▲' : '▼'}
      </button>

      {showCheat && (
        <div className={styles.cheatSheet}>
          {cheatGroups.map((group, gi) => (
            <div key={gi} className={styles.cheatGroup}>
              {group.numbers.map(({ n, text }) => (
                <div key={n} className={styles.cheatRow}>
                  <span className={styles.cheatNumber}>{fmt(n)}</span>
                  <span className={styles.cheatText}>{text}</span>
                </div>
              ))}
            </div>
          ))}
          <div className={styles.cheatGroup}>
            <p className={styles.cheatHint}>
              {t('numbers.compositionHint')}
            </p>
            <div className={styles.cheatRow}>
              <span className={styles.cheatNumber}>21</span>
              <span className={styles.cheatText}>{numberToText(21)}</span>
            </div>
            <div className={styles.cheatRow}>
              <span className={styles.cheatNumber}>145</span>
              <span className={styles.cheatText}>{numberToText(145)}</span>
            </div>
            {selected !== 'hundred' && (
              <div className={styles.cheatRow}>
                <span className={styles.cheatNumber}>{fmt(1001)}</span>
                <span className={styles.cheatText}>{numberToText(1001)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
