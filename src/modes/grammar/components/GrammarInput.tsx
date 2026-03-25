import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TextInput } from '../../../components/exercises'
import type { SessionItem, Answer } from '../../types'
import GrammarReference from './GrammarReference'
import styles from './GrammarInput.module.css'

interface GrammarInputProps {
  item: SessionItem
  onAnswer: (answer: Answer) => void
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Strip diacritics for close-match detection */
function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function compareAnswer(
  input: string,
  correct: string,
): 'exact' | 'close' | 'wrong' {
  const normInput = normalize(input)
  const normCorrect = normalize(correct)

  if (normInput === normCorrect) return 'exact'

  // Close match: same letters but different accents
  if (stripAccents(normInput) === stripAccents(normCorrect)) return 'close'

  // Close match: Levenshtein distance ≤ 1
  if (normInput.length > 2 && levenshtein(normInput, normCorrect) <= 1) return 'close'

  return 'wrong'
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []
  for (let i = 0; i <= a.length; i++) matrix[i] = [i]
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  return matrix[a.length][b.length]
}

export default function GrammarInput({ item, onAnswer }: GrammarInputProps) {
  const { t } = useTranslation()
  const [showCheat, setShowCheat] = useState(false)

  const category = item.payload.category as string
  const hint = category === 'conjugation'
    ? t('grammar.conjugate')
    : t('grammar.writePlural')

  return (
    <TextInput
      item={item}
      onAnswer={onAnswer}
      hint={hint}
      inputMode="text"
      compareAnswer={compareAnswer}
      i18nKeys={{
        check: 'grammar.check',
        correct: 'grammar.correct',
        wrong: 'grammar.wrong',
        next: 'grammar.next',
      }}
    >
      <button
        className={styles.cheatToggle}
        onClick={() => setShowCheat((v) => !v)}
      >
        {t('grammar.reference')} {showCheat ? '▲' : '▼'}
      </button>

      {showCheat && <GrammarReference category={category} />}
    </TextInput>
  )
}
