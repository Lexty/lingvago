import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { TextInput } from '../../../components/exercises'
import { fuzzyCompare } from '../../../components/exercises/compareUtils'
import { db } from '../../../db/index'
import type { SessionItem, Answer } from '../../types'
import GrammarReference from './GrammarReference'
import styles from './GrammarInput.module.css'

interface GrammarInputProps {
  item: SessionItem
  onAnswer: (answer: Answer) => void
}

export default function GrammarInput({ item, onAnswer }: GrammarInputProps) {
  const { t } = useTranslation()
  const [showCheat, setShowCheat] = useState(false)
  const settings = useLiveQuery(() => db.settings.get('global'))
  const strictAccents = settings?.strictAccents ?? true

  const compare = (input: string, correct: string) =>
    fuzzyCompare(input, correct, { strictAccents })

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
      compareAnswer={compare}
      i18nKeys={{
        check: 'grammar.check',
        correct: 'grammar.correct',
        wrong: 'grammar.wrong',
        next: 'grammar.next',
        almostCorrect: 'grammar.almostCorrect',
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
