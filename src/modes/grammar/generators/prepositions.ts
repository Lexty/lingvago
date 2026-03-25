import type { SessionItem } from '../../types'
import { PREPOSITIONS } from '../data/prepositions'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function generatePrepositionItems(count: number): SessionItem[] {
  const items = shuffle(PREPOSITIONS).slice(0, count)

  return items.map((item, i) => ({
    id: `prep-${i}-${Date.now()}`,
    question: item.sentence,
    correctAnswer: item.answer,
    exerciseType: 'multiple-choice',
    options: shuffle([item.answer, ...item.distractors]),
    payload: {
      category: 'prepositions',
      translation: item.translation,
      hint: 'grammar.prepositionQuestion',
    },
  }))
}
