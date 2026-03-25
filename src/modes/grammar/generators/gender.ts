import type { SessionItem } from '../../types'
import { NOUNS } from '../data/nouns'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function generateGenderItems(count: number): SessionItem[] {
  const nouns = shuffle(NOUNS).slice(0, count)

  return nouns.map((noun, i) => ({
    id: `gen-${i}-${Date.now()}`,
    question: noun.word,
    correctAnswer: noun.gender,
    exerciseType: 'multiple-choice',
    options: shuffle(['masculino', 'feminino']),
    payload: {
      category: 'gender',
      translation: noun.translation,
      hint: 'grammar.genderQuestion',
    },
  }))
}
