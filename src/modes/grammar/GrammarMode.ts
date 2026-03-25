import type { ComponentType } from 'react'
import { db } from '../../db/index'
import { MultipleChoice } from '../../components/exercises'
import type { LearningMode, SessionItem, Answer, ModeStats, ExerciseComponentProps } from '../types'
import { getCategories, getTenses } from './state'
import { generateConjugationItems } from './generators/conjugation'
import { generateGenderItems } from './generators/gender'
import { generateArticleItems } from './generators/articles'
import { generatePluralItems } from './generators/plural'
import { generatePrepositionItems } from './generators/prepositions'
import GrammarInput from './components/GrammarInput'
import GrammarSetup from './components/GrammarSetup'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export class GrammarMode implements LearningMode {
  readonly id = 'grammar'
  readonly title = 'Грамматика'
  readonly description = 'Спряжение, род, артикли, предлоги'
  readonly icon = '✏️'

  readonly exerciseComponents: Record<string, ComponentType<ExerciseComponentProps>> = {
    'grammar-input': GrammarInput,
    'multiple-choice': MultipleChoice,
  }

  readonly setupComponent = GrammarSetup

  async getSessionItems(count: number): Promise<SessionItem[]> {
    const categories = getCategories()
    const tenses = getTenses()
    const perCategory = Math.max(1, Math.ceil(count / categories.length))

    const items: SessionItem[] = []

    for (const cat of categories) {
      switch (cat) {
        case 'conjugation':
          items.push(...generateConjugationItems(perCategory, tenses))
          break
        case 'gender':
          items.push(...generateGenderItems(perCategory))
          break
        case 'articles':
          items.push(...generateArticleItems(perCategory))
          break
        case 'plural':
          items.push(...generatePluralItems(perCategory))
          break
        case 'prepositions':
          items.push(...generatePrepositionItems(perCategory))
          break
      }
    }

    return shuffle(items).slice(0, count)
  }

  async submitAnswer(item: SessionItem, answer: Answer): Promise<void> {
    void item
    void answer
  }

  async getStats(): Promise<ModeStats> {
    const sessions = await db.sessions.where('modeId').equals('grammar').toArray()
    const totalCards = sessions.reduce((sum, s) => sum + s.totalCards, 0)
    const correctCards = sessions.reduce((sum, s) => sum + s.correctCards, 0)

    return {
      totalItems: 0,
      dueNow: 0,
      averageRetention: totalCards > 0 ? correctCards / totalCards : 0,
      totalReviews: totalCards,
    }
  }

  async getDueCount(): Promise<number> {
    return -1
  }
}
