import type { ComponentType } from 'react'
import { FSRS, Rating, type Grade } from 'ts-fsrs'
import { db } from '../../db/index'
import { toFSRSCard, fromFSRSCard } from '../../db/fsrs-helpers'
import { MultipleChoice, WordOrder } from '../../components/exercises'
import type { LearningMode, SessionItem, Answer, ModeStats, ExerciseComponentProps } from '../types'
import type { GrammarCategory, Tense } from './state'
import { seedCategoryIfNeeded, buildSessionItem } from './items'
import GrammarInput from './components/GrammarInput'
import GrammarSetup from './components/GrammarSetup'

const fsrs = new FSRS({})

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
    'word-order': WordOrder,
  }

  readonly setupComponent = GrammarSetup

  // Instance state (replaces module globals)
  private categories: GrammarCategory[] = ['conjugation']
  private tenses: Tense[] = ['presente']

  setCategories(categories: GrammarCategory[]): void {
    this.categories = categories
  }

  getCategories(): GrammarCategory[] {
    return this.categories
  }

  setTenses(tenses: Tense[]): void {
    this.tenses = tenses
  }

  getTenses(): Tense[] {
    return this.tenses
  }

  async getSessionItems(count: number): Promise<SessionItem[]> {
    // Seed all selected categories
    for (const cat of this.categories) {
      await seedCategoryIfNeeded(cat)
    }

    const now = Date.now()
    const items: SessionItem[] = []

    // 1. Get due review cards (state > 0, i.e. previously studied)
    const allDue = await db.grammarCardStates
      .where('due')
      .belowOrEqual(now)
      .toArray()

    // Filter: only reviewed cards + selected categories + tenses
    const filteredDue = allDue.filter((cs) => {
      if (cs.state === 0) return false // New cards go to step 2 for balanced distribution
      if (!this.categories.includes(cs.category as GrammarCategory)) return false
      if (cs.category === 'conjugation') {
        const tense = cs.itemId.split(':')[2]
        if (!this.tenses.includes(tense as Tense)) return false
      }
      return true
    })

    // Sort by due (most overdue first)
    filteredDue.sort((a, b) => a.due - b.due)

    // Build SessionItems from due cards
    for (const cs of filteredDue) {
      if (items.length >= count) break
      const item = buildSessionItem(cs.id!, cs.itemId, cs.category)
      if (item) items.push(item)
    }

    // 2. Fill remaining with new cards (state=0), balanced across categories
    if (items.length < count) {
      const remaining = count - items.length
      const usedIds = new Set(filteredDue.map((cs) => cs.id))

      const newCards = await db.grammarCardStates
        .where('state')
        .equals(0)
        .toArray()

      // Group new cards by bucket (category, or category:tense for conjugation)
      const byBucket = new Map<string, typeof newCards>()
      for (const cs of newCards) {
        if (usedIds.has(cs.id)) continue
        if (!this.categories.includes(cs.category as GrammarCategory)) continue
        let bucket = cs.category
        if (cs.category === 'conjugation') {
          const tense = cs.itemId.split(':')[2]
          if (!this.tenses.includes(tense as Tense)) continue
          bucket = `conjugation:${tense}` // separate bucket per tense
        }
        const list = byBucket.get(bucket) ?? []
        list.push(cs)
        byBucket.set(bucket, list)
      }

      // Sort each bucket by id (progressive)
      for (const list of byBucket.values()) {
        list.sort((a, b) => a.id! - b.id!)
      }

      // Round-robin across buckets
      const perBucket = Math.max(1, Math.ceil(remaining / byBucket.size))
      const selected: typeof newCards = []
      for (const list of byBucket.values()) {
        selected.push(...list.slice(0, perBucket))
      }

      for (const cs of selected.slice(0, remaining)) {
        const item = buildSessionItem(cs.id!, cs.itemId, cs.category)
        if (item) items.push(item)
      }
    }

    return shuffle(items)
  }

  async submitAnswer(item: SessionItem, answer: Answer): Promise<void> {
    const grammarCardId = item.payload.grammarCardId as number | undefined
    if (!grammarCardId) return

    const cardState = await db.grammarCardStates.get(grammarCardId)
    if (!cardState) return

    const card = toFSRSCard(cardState)
    const rating = this.mapAnswerToRating(answer) as Grade
    const result = fsrs.next(card, new Date(), rating)
    const updated = fromFSRSCard(result.card)

    await db.grammarCardStates.update(grammarCardId, updated)
  }

  async getStats(): Promise<ModeStats> {
    const sessions = await db.sessions.where('modeId').equals('grammar').toArray()
    const totalCards = sessions.reduce((sum, s) => sum + s.totalCards, 0)
    const correctCards = sessions.reduce((sum, s) => sum + s.correctCards, 0)

    const allCards = await db.grammarCardStates.count()
    const all = await db.grammarCardStates.toArray()
    const reviewedCards = all.filter((cs) => cs.reps > 0).length

    return {
      totalItems: allCards,
      dueNow: await this.getDueCount(),
      averageRetention: totalCards > 0 ? correctCards / totalCards : 0,
      totalReviews: reviewedCards,
    }
  }

  async getDueCount(): Promise<number> {
    const now = Date.now()
    return await db.grammarCardStates
      .where('due')
      .belowOrEqual(now)
      .count()
  }

  private mapAnswerToRating(answer: Answer): number {
    if (!answer.correct) return Rating.Again
    if (answer.timeMs < 3000) return Rating.Easy
    if (answer.timeMs <= 8000) return Rating.Good
    return Rating.Hard
  }
}
