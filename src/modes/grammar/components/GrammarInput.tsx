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

function compareAnswer(input: string, correct: string): boolean {
  return normalize(input) === normalize(correct)
}

export default function GrammarInput({ item, onAnswer }: GrammarInputProps) {
  const { t } = useTranslation()
  const [showCheat, setShowCheat] = useState(false)

  const category = item.payload.category as string
  const isConjugation = category === 'conjugation'

  const hint = isConjugation ? t('grammar.conjugate') : t('grammar.writePlural')

  const contextLine = isConjugation ? (
    <div className={styles.context}>
      <span className={styles.person}>{item.payload.personLabel as string}</span>
      <span className={styles.separator}>·</span>
      <span className={styles.tense}>
        {t(`grammar.tense.${item.payload.tense as string}`)}
      </span>
    </div>
  ) : null

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
      {contextLine}

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
