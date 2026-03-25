import type { SessionItem } from '../../types'
import { NOUNS } from '../data/nouns'
import { PLURAL_TEMPLATES } from '../data/sentences'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function generatePluralItems(count: number): SessionItem[] {
  const nouns = shuffle(NOUNS).slice(0, count)

  return nouns.map((noun, i) => {
    const template = PLURAL_TEMPLATES[Math.floor(Math.random() * PLURAL_TEMPLATES.length)]
    const question = template.template.replace('{noun}', noun.word)

    return {
      id: `plr-${i}-${Date.now()}`,
      question,
      correctAnswer: noun.plural,
      exerciseType: 'grammar-input',
      payload: {
        category: 'plural',
        translation: noun.translation,
        rule: noun.pluralRule,
      },
    }
  })
}
