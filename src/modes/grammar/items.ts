/**
 * Grammar item definitions: maps itemId ↔ exercise content.
 *
 * Each grammar item is a unique piece of knowledge tracked by FSRS.
 * Items are seeded into GrammarCardState on first use.
 */

import { db } from '../../db/index'
import { createNewGrammarCardState } from '../../db/fsrs-helpers'
import { VERBS, PERSON_LABELS, type Tense, type Person } from './data/verbs'
import { NOUNS } from './data/nouns'
import { PREPOSITIONS } from './data/prepositions'
import { CONJUGATION_TEMPLATES, ARTICLE_TEMPLATES, PLURAL_TEMPLATES } from './data/sentences'
import { WORD_ORDER_SENTENCES } from './data/word-order'
import type { SessionItem } from '../types'
import type { GrammarCategory } from './state'

const PERSONS: Person[] = ['eu', 'tu', 'ele_ela', 'nos', 'eles_elas']
const TENSES: Tense[] = ['presente', 'preterito_perfeito', 'preterito_imperfeito']

// ─── Conjugation rule helpers ────────────────────────────────────────────────

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

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ─── Item ID generation ──────────────────────────────────────────────────────

export function conjugationItemId(person: Person, tense: Tense, verb: string): string {
  return `conj:${person}:${tense}:${verb}`
}

export function genderItemId(noun: string): string {
  return `gender:${noun}`
}

export type ArticleType = 'def' | 'indef' | 'defPl' | 'indefPl'
const ARTICLE_TYPES: ArticleType[] = ['def', 'indef', 'defPl', 'indefPl']

export function articleItemId(articleType: ArticleType, noun: string): string {
  return `article:${articleType}:${noun}`
}

export function pluralItemId(noun: string): string {
  return `plural:${noun}`
}

export function prepItemId(index: number): string {
  return `prep:${index}`
}

export function wordOrderItemId(index: number): string {
  return `wo:${index}`
}

// ─── Seed all items for a category ───────────────────────────────────────────

/**
 * Generate all GrammarCardState records for a category if not already seeded.
 * Items are created in progressive order (regular before irregular, presente first).
 */
export async function seedCategoryIfNeeded(category: GrammarCategory): Promise<void> {
  const existing = await db.grammarCardStates
    .where('category')
    .equals(category)
    .toArray()

  // Check if articles need re-seeding (old format: "article:noun" → new: "article:type:noun")
  if (category === 'articles' && existing.length > 0) {
    const hasOldFormat = existing.some((cs) => cs.itemId.split(':').length === 2)
    if (hasOldFormat) {
      await db.grammarCardStates.where('category').equals('articles').delete()
    } else {
      return // already seeded in new format
    }
  } else if (existing.length > 0) {
    return
  }

  const records: Array<Omit<import('../../db/schema').GrammarCardState, 'id'>> = []

  switch (category) {
    case 'conjugation': {
      // Progressive order: regular verbs first (ar, er, ir), then irregular
      // Within each group: presente → perfeito → imperfeito
      const regularVerbs = VERBS.filter((v) => v.group !== 'irregular')
      const irregularVerbs = VERBS.filter((v) => v.group === 'irregular')

      for (const verbGroup of [regularVerbs, irregularVerbs]) {
        for (const tense of TENSES) {
          for (const verb of verbGroup) {
            for (const person of PERSONS) {
              records.push(
                createNewGrammarCardState(
                  conjugationItemId(person, tense, verb.infinitive),
                  'conjugation',
                ),
              )
            }
          }
        }
      }
      break
    }
    case 'gender':
      for (const noun of NOUNS) {
        records.push(createNewGrammarCardState(genderItemId(noun.word), 'gender'))
      }
      break
    case 'articles':
      for (const articleType of ARTICLE_TYPES) {
        for (const noun of NOUNS) {
          records.push(createNewGrammarCardState(articleItemId(articleType, noun.word), 'articles'))
        }
      }
      break
    case 'plural':
      for (const noun of NOUNS) {
        records.push(createNewGrammarCardState(pluralItemId(noun.word), 'plural'))
      }
      break
    case 'prepositions':
      for (let i = 0; i < PREPOSITIONS.length; i++) {
        records.push(createNewGrammarCardState(prepItemId(i), 'prepositions'))
      }
      break
    case 'word_order':
      for (let i = 0; i < WORD_ORDER_SENTENCES.length; i++) {
        records.push(createNewGrammarCardState(wordOrderItemId(i), 'word_order'))
      }
      break
  }

  await db.grammarCardStates.bulkAdd(records)
}

// ─── Build SessionItem from GrammarCardState ─────────────────────────────────

export function buildSessionItem(
  cardId: number,
  itemId: string,
  category: string,
): SessionItem | null {
  switch (category) {
    case 'conjugation':
      return buildConjugationItem(cardId, itemId)
    case 'gender':
      return buildGenderItem(cardId, itemId)
    case 'articles':
      return buildArticleItem(cardId, itemId)
    case 'plural':
      return buildPluralItem(cardId, itemId)
    case 'prepositions':
      return buildPrepositionItem(cardId, itemId)
    case 'word_order':
      return buildWordOrderItem(cardId, itemId)
    default:
      return null
  }
}

function buildConjugationItem(cardId: number, itemId: string): SessionItem | null {
  // Parse: "conj:person:tense:verb"
  const parts = itemId.split(':')
  if (parts.length < 4) return null
  const person = parts[1] as Person
  const tense = parts[2] as Tense
  const infinitive = parts.slice(3).join(':')

  const verb = VERBS.find((v) => v.infinitive === infinitive)
  if (!verb) return null

  const correctAnswer = verb.conjugations[tense][person]

  const matching = CONJUGATION_TEMPLATES.filter(
    (t) => t.person === person && t.tense === tense,
  )
  const template = matching[Math.floor(Math.random() * matching.length)]
  const question = template.template.replace('{verb}', verb.infinitive)

  let rule: Record<string, string> | undefined
  if (verb.group === 'irregular') {
    const label = PERSON_LABELS[person]
    rule = {
      ru: `${verb.infinitive} — неправильный глагол: ${label} ${correctAnswer}`,
      en: `${verb.infinitive} — irregular verb: ${label} ${correctAnswer}`,
    }
  } else {
    const endings = REGULAR_ENDINGS[verb.group]?.[tense]
    if (endings) {
      rule = {
        ru: `Глаголы на -${verb.group}: ${endings}`,
        en: `-${verb.group} verbs: ${endings}`,
      }
    }
  }

  return {
    id: `conj-${cardId}`,
    question,
    correctAnswer,
    exerciseType: 'grammar-input',
    payload: {
      category: 'conjugation',
      tense,
      person,
      translation: template.translation,
      verbTranslation: verb.translation,
      rule,
      grammarCardId: cardId,
    },
  }
}

function buildGenderItem(cardId: number, itemId: string): SessionItem | null {
  const nounWord = itemId.replace('gender:', '')
  const noun = NOUNS.find((n) => n.word === nounWord)
  if (!noun) return null

  return {
    id: `gen-${cardId}`,
    question: noun.word,
    correctAnswer: noun.gender,
    exerciseType: 'multiple-choice',
    options: shuffle(['masculino', 'feminino']),
    payload: {
      category: 'gender',
      translation: noun.translation,
      hint: 'grammar.genderQuestion',
      rule: noun.genderRule,
      grammarCardId: cardId,
    },
  }
}

function buildArticleItem(cardId: number, itemId: string): SessionItem | null {
  // Parse: "article:articleType:noun"
  const parts = itemId.split(':')
  if (parts.length < 3) return null
  const articleType = parts[1] as ArticleType
  const nounWord = parts.slice(2).join(':')

  const noun = NOUNS.find((n) => n.word === nounWord)
  if (!noun) return null

  const correct = noun.articles[articleType]

  // Pick a template matching this article type
  const matching = ARTICLE_TEMPLATES.filter((t) => t.articleType === articleType)
  const template = matching[Math.floor(Math.random() * matching.length)]

  const isPlural = articleType === 'defPl' || articleType === 'indefPl'
  const nounForm = isPlural ? noun.plural : noun.word
  const question = template.template.replace('{noun}', nounForm)

  const SINGULAR_OPTIONS = ['o', 'a', 'um', 'uma']
  const PLURAL_OPTIONS = ['os', 'as', 'uns', 'umas']
  const options = shuffle(isPlural ? [...PLURAL_OPTIONS] : [...SINGULAR_OPTIONS])

  return {
    id: `art-${cardId}`,
    question,
    correctAnswer: correct,
    exerciseType: 'multiple-choice',
    options,
    payload: {
      category: 'articles',
      articleType,
      translation: noun.translation,
      hint: 'grammar.articleQuestion',
      rule: noun.gender === 'masculino'
        ? { ru: 'masculino → o/um', en: 'masculino → o/um' }
        : { ru: 'feminino → a/uma', en: 'feminino → a/uma' },
      grammarCardId: cardId,
    },
  }
}

function buildPluralItem(cardId: number, itemId: string): SessionItem | null {
  const nounWord = itemId.replace('plural:', '')
  const noun = NOUNS.find((n) => n.word === nounWord)
  if (!noun) return null

  const template = PLURAL_TEMPLATES[Math.floor(Math.random() * PLURAL_TEMPLATES.length)]
  const question = template.template.replace('{noun}', noun.word)

  return {
    id: `plr-${cardId}`,
    question,
    correctAnswer: noun.plural,
    exerciseType: 'grammar-input',
    payload: {
      category: 'plural',
      translation: noun.translation,
      rule: noun.pluralRule,
      grammarCardId: cardId,
    },
  }
}

function buildPrepositionItem(cardId: number, itemId: string): SessionItem | null {
  const index = parseInt(itemId.replace('prep:', ''), 10)
  const item = PREPOSITIONS[index]
  if (!item) return null

  return {
    id: `prep-${cardId}`,
    question: item.sentence,
    correctAnswer: item.answer,
    exerciseType: 'multiple-choice',
    options: shuffle([item.answer, ...item.distractors]),
    payload: {
      category: 'prepositions',
      translation: item.translation,
      hint: 'grammar.prepositionQuestion',
      grammarCardId: cardId,
    },
  }
}

function shuffleEnsureDifferent(
  words: string[],
  validAnswers: string[],
  punctuation: string,
): string[] {
  for (let attempt = 0; attempt < 10; attempt++) {
    const shuffled = shuffle([...words])
    const joined = (shuffled.join(' ') + punctuation).trim().toLowerCase()
    const matches = validAnswers.some(
      (a) => a.trim().toLowerCase() === joined,
    )
    if (!matches) return shuffled
  }
  return [...words].reverse()
}

function buildWordOrderItem(cardId: number, itemId: string): SessionItem | null {
  const index = parseInt(itemId.replace('wo:', ''), 10)
  const sentence = WORD_ORDER_SENTENCES[index]
  if (!sentence) return null

  const primary = sentence.answers[0]
  const punctMatch = primary.match(/([.!?]+)$/)
  const punctuation = punctMatch?.[1] ?? '.'
  const withoutPunct = primary.replace(/[.!?]+$/, '').trim()

  const words = withoutPunct.split(/\s+/)
  const shuffled = shuffleEnsureDifferent(words, sentence.answers, punctuation)

  return {
    id: `wo-${cardId}`,
    question: primary,
    correctAnswer: primary,
    exerciseType: 'word-order',
    options: shuffled,
    payload: {
      category: 'word_order',
      answers: sentence.answers,
      translation: sentence.translation,
      rule: sentence.rule,
      punctuation,
      hint: 'grammar.wordOrderQuestion',
      grammarCardId: cardId,
    },
  }
}
