import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TextInput } from '../../../components/exercises'
import type { SessionItem, Answer } from '../../types'
import { normalize, getLevel, getCheatSheet, numberToText } from '../data'
import styles from './NumberInput.module.css'

interface NumberInputProps {
  item: SessionItem
  onAnswer: (answer: Answer) => void
}

/** Format number with thin-space separators */
function formatNumber(n: number | string): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009')
}

function digitToWordCompare(input: string, correct: string): boolean {
  return normalize(input) === normalize(correct)
}

function wordToDigitCompare(input: string, correct: string): boolean {
  const cleaned = input.replace(/[\s.,]/g, '')
  const parsed = parseInt(cleaned, 10)
  return !isNaN(parsed) && parsed === Number(correct)
}

export default function NumberInput({ item, onAnswer }: NumberInputProps) {
  const { t } = useTranslation()
  const [showCheat, setShowCheat] = useState(false)

  const isDigitToWord = item.payload.direction === 'digit-to-word'

  const cheatGroups = useMemo(() => getCheatSheet(getLevel()), [])

  return (
    <TextInput
      item={item}
      onAnswer={onAnswer}
      hint={isDigitToWord ? t('numbers.writeWord') : t('numbers.writeNumber')}
      inputMode={isDigitToWord ? 'text' : 'numeric'}
      compareAnswer={isDigitToWord ? digitToWordCompare : wordToDigitCompare}
      formatQuestion={isDigitToWord ? (q) => formatNumber(q) : undefined}
      formatCorrectAnswer={isDigitToWord ? undefined : (a) => formatNumber(a)}
      i18nKeys={{
        check: 'numbers.check',
        correct: 'numbers.correct',
        wrong: 'numbers.wrong',
        next: 'numbers.next',
      }}
    >
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
                  <span className={styles.cheatNumber}>{formatNumber(n)}</span>
                  <span className={styles.cheatText}>{text}</span>
                </div>
              ))}
            </div>
          ))}
          <div className={styles.cheatGroup}>
            <p className={styles.cheatHint}>{t('numbers.compositionHint')}</p>
            <div className={styles.cheatRow}>
              <span className={styles.cheatNumber}>21</span>
              <span className={styles.cheatText}>{numberToText(21)}</span>
            </div>
            <div className={styles.cheatRow}>
              <span className={styles.cheatNumber}>145</span>
              <span className={styles.cheatText}>{numberToText(145)}</span>
            </div>
          </div>
        </div>
      )}
    </TextInput>
  )
}
