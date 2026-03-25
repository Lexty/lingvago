import type { SessionItem } from '../../types'
import type { Tense, Person, VerbData } from '../data/verbs'
import { VERBS, PERSON_LABELS } from '../data/verbs'
import { CONJUGATION_TEMPLATES } from '../data/sentences'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

const PERSONS: Person[] = ['eu', 'tu', 'ele_ela', 'nos', 'eles_elas']

const REGULAR_ENDINGS: Record<string, Record<Tense, string>> = {
  ar: {
    presente: '-o, -as, -a, -amos, -am',
    preterito_perfeito: '-ei, -aste, -ou, -ámos, -aram',
    preterito_imperfeito: '-ava, -avas, -ava, -ávamos, -avam',
  },
  er: {
    presente: '-o, -es, -e, -emos, -em',
    preterito_perfeito: '-i, -este, -eu, -emos, -eram',
    preterito_imperfeito: '-ia, -ias, -ia, -íamos, -iam',
  },
  ir: {
    presente: '-o, -es, -e, -imos, -em',
    preterito_perfeito: '-i, -iste, -iu, -imos, -iram',
    preterito_imperfeito: '-ia, -ias, -ia, -íamos, -iam',
  },
}

function getConjugationRule(
  verb: VerbData,
  tense: Tense,
  person: Person,
): Record<string, string> | undefined {
  if (verb.group === 'irregular') {
    const form = verb.conjugations[tense][person]
    const label = PERSON_LABELS[person]
    return {
      ru: `${verb.infinitive} — неправильный глагол: ${label} ${form}`,
      en: `${verb.infinitive} — irregular verb: ${label} ${form}`,
    }
  }
  const endings = REGULAR_ENDINGS[verb.group]?.[tense]
  if (!endings) return undefined
  return {
    ru: `Глаголы на -${verb.group}: ${endings}`,
    en: `-${verb.group} verbs: ${endings}`,
  }
}

export function generateConjugationItems(count: number, tenses: Tense[]): SessionItem[] {
  const items: SessionItem[] = []

  for (let i = 0; i < count; i++) {
    const verb = VERBS[Math.floor(Math.random() * VERBS.length)]
    const tense = tenses[Math.floor(Math.random() * tenses.length)]
    const person = PERSONS[Math.floor(Math.random() * PERSONS.length)]
    const correctAnswer = verb.conjugations[tense][person]

    const matching = CONJUGATION_TEMPLATES.filter(
      (t) => t.person === person && t.tense === tense,
    )
    const template = matching[Math.floor(Math.random() * matching.length)]

    const question = template.template.replace('{verb}', verb.infinitive)

    items.push({
      id: `conj-${i}-${Date.now()}`,
      question,
      correctAnswer,
      exerciseType: 'grammar-input',
      payload: {
        category: 'conjugation',
        tense,
        person,
        translation: template.translation,
        verbTranslation: verb.translation,
        rule: getConjugationRule(verb, tense, person),
      },
    })
  }

  return shuffle(items)
}
