import type { SessionItem } from '../../types'
import type { Tense, Person } from '../data/verbs'
import { VERBS, PERSON_LABELS } from '../data/verbs'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const PERSONS: Person[] = ['eu', 'tu', 'ele_ela', 'nos', 'eles_elas']

export function generateConjugationItems(count: number, tenses: Tense[]): SessionItem[] {
  const items: SessionItem[] = []

  for (let i = 0; i < count; i++) {
    const verb = VERBS[Math.floor(Math.random() * VERBS.length)]
    const tense = tenses[Math.floor(Math.random() * tenses.length)]
    const person = PERSONS[Math.floor(Math.random() * PERSONS.length)]
    const correctAnswer = verb.conjugations[tense][person]

    items.push({
      id: `conj-${i}-${Date.now()}`,
      question: verb.infinitive,
      correctAnswer,
      exerciseType: 'grammar-input',
      payload: {
        category: 'conjugation',
        tense,
        person,
        personLabel: PERSON_LABELS[person],
      },
    })
  }

  return shuffle(items)
}
