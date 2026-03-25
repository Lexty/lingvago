import { useTranslation } from 'react-i18next'
import { TextInput } from '../../../components/exercises'
import { fuzzyCompare } from '../../../components/exercises/compareUtils'
import type { SessionItem, Answer } from '../../types'

interface VocabularyInputProps {
  item: SessionItem
  onAnswer: (answer: Answer) => void
}

export default function VocabularyInput({ item, onAnswer }: VocabularyInputProps) {
  const { t } = useTranslation()

  // Accent-only close matching for vocabulary: 1-char differences like
  // gata/gato are distinct words, not typos — only accent differences count.
  const compare = (input: string, correct: string) =>
    fuzzyCompare(input, correct, { allowTypos: false })

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
