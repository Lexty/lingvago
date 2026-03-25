import type { SessionItem } from '../../types'
import { NOUNS } from '../data/nouns'
import { ARTICLE_TEMPLATES, type ArticleType } from '../data/sentences'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// 4 options per number: mix definite + indefinite for harder exercise
const SINGULAR_OPTIONS = ['o', 'a', 'um', 'uma']
const PLURAL_OPTIONS = ['os', 'as', 'uns', 'umas']

export function generateArticleItems(count: number): SessionItem[] {
  const nouns = shuffle(NOUNS).slice(0, count)

  return nouns.map((noun, i) => {
    const templates = shuffle(ARTICLE_TEMPLATES)
    const template = templates[0]
    const articleType: ArticleType = template.articleType
    const correct = noun.articles[articleType]

    const isPlural = articleType === 'defPl' || articleType === 'indefPl'
    const nounForm = isPlural ? noun.plural : noun.word
    const question = template.template.replace('{noun}', nounForm)
    const options = shuffle(isPlural ? [...PLURAL_OPTIONS] : [...SINGULAR_OPTIONS])

    return {
      id: `art-${i}-${Date.now()}`,
      question,
      correctAnswer: correct,
      exerciseType: 'multiple-choice',
      options,
      payload: {
        category: 'articles',
        articleType,
        translation: noun.translation,
        hint: 'grammar.articleQuestion',
      },
    }
  })
}
