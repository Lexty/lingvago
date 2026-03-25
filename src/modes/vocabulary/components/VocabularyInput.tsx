import { useTranslation } from 'react-i18next'
import { useLiveQuery } from 'dexie-react-hooks'
import { TextInput } from '../../../components/exercises'
import { fuzzyCompare } from '../../../components/exercises/compareUtils'
import { db } from '../../../db/index'
import type { SessionItem, Answer } from '../../types'

interface VocabularyInputProps {
  item: SessionItem
  onAnswer: (answer: Answer) => void
}

export default function VocabularyInput({ item, onAnswer }: VocabularyInputProps) {
  const { t } = useTranslation()
  const settings = useLiveQuery(() => db.settings.get('global'))
  const strictAccents = settings?.strictAccents ?? true

  const compare = (input: string, correct: string) =>
    fuzzyCompare(input, correct, { allowTypos: false, strictAccents })

  const handleAnswer = (answer: Answer) => {
    // Enrich answer with nuanced result for FSRS rating.
    // TextInput sets correct=false for 'close', which is correct for session stats.
    // We add result='close' so VocabularyMode can map it to Rating.Hard instead of Again.
    const result = compare(answer.value, item.correctAnswer)
    if (result === 'close') {
      onAnswer({ ...answer, result: 'close' })
    } else {
      onAnswer(answer)
    }
  }

  return (
    <TextInput
      item={item}
      onAnswer={handleAnswer}
      hint={t('vocabulary.typePortuguese')}
      inputMode="text"
      compareAnswer={compare}
      i18nKeys={{
        check: 'vocabulary.check',
        correct: 'vocabulary.correct',
        wrong: 'vocabulary.wrong',
        next: 'vocabulary.next',
        almostCorrect: 'vocabulary.almostCorrect',
      }}
    />
  )
}
