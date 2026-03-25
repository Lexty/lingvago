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

type ArticleType = 'def' | 'indef' | 'defPl' | 'indefPl'

const ARTICLE_OPTIONS: Record<ArticleType, string[]> = {
  def: ['o', 'a'],
  indef: ['um', 'uma'],
  defPl: ['os', 'as'],
  indefPl: ['uns', 'umas'],
}

const ARTICLE_TYPES: ArticleType[] = ['def', 'indef', 'defPl', 'indefPl']

export function generateArticleItems(count: number): SessionItem[] {
  const nouns = shuffle(NOUNS).slice(0, count)

  return nouns.map((noun, i) => {
    const articleType = ARTICLE_TYPES[Math.floor(Math.random() * ARTICLE_TYPES.length)]
    const correct = noun.articles[articleType]
    const options = shuffle(ARTICLE_OPTIONS[articleType])
    const displayWord = articleType === 'defPl' || articleType === 'indefPl'
      ? noun.plural
      : noun.word

    return {
      id: `art-${i}-${Date.now()}`,
      question: displayWord,
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
