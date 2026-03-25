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

const ARTICLE_OPTIONS: Record<ArticleType, string[]> = {
  def: ['o', 'a'],
  indef: ['um', 'uma'],
  defPl: ['os', 'as'],
  indefPl: ['uns', 'umas'],
}

export function generateArticleItems(count: number): SessionItem[] {
  const nouns = shuffle(NOUNS).slice(0, count)

  return nouns.map((noun, i) => {
    // Pick a random article type and matching template
    const templates = shuffle(ARTICLE_TEMPLATES)
    const template = templates[0]
    const articleType = template.articleType
    const correct = noun.articles[articleType]

    const isPlural = articleType === 'defPl' || articleType === 'indefPl'
    const nounForm = isPlural ? noun.plural : noun.word
    const question = template.template.replace('{noun}', nounForm)
    const options = shuffle(ARTICLE_OPTIONS[articleType])

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
      },
    }
  })
}
