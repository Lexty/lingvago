import { db } from '../../db/index'
import type { LearningMode, ModeStats, SessionItem, Answer } from '../types'
import { numberToText, getLevel, getRangesForLevel, randomInRange } from './data'

export class NumbersMode implements LearningMode {
  readonly id = 'numbers'
  readonly title = 'Числа'
  readonly description = 'Тренировка числительных'
  readonly icon = '🔢'

  async getSessionItems(count: number): Promise<SessionItem[]> {
    const ranges = getRangesForLevel(getLevel())
    const totalWeight = ranges.reduce((s, r) => s + r.weight, 0)
    const numbers = new Set<number>()

    // Weighted distribution across ranges
    for (const range of ranges) {
      const allocated = Math.round((range.weight / totalWeight) * count)
      for (let i = 0; i < allocated && numbers.size < count; i++) {
        let attempts = 0
        let n: number
        do {
          n = randomInRange(range.min, range.max)
          attempts++
        } while (numbers.has(n) && attempts < 50)
        numbers.add(n)
      }
    }

    // Fill if rounding left us short
    while (numbers.size < count) {
      const range = ranges[Math.floor(Math.random() * ranges.length)]
      numbers.add(randomInRange(range.min, range.max))
    }

    const items: SessionItem[] = []
    let index = 0
    for (const n of numbers) {
      const text = numberToText(n)
      const isDigitToWord = index % 2 === 0

      items.push({
        id: `num-${index}`,
        question: isDigitToWord ? String(n) : text,
        correctAnswer: isDigitToWord ? text : String(n),
        exerciseType: 'number-input',
        payload: {
          number: n,
          direction: isDigitToWord ? 'digit-to-word' : 'word-to-digit',
        },
      })
      index++
    }

    // Shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[items[i], items[j]] = [items[j], items[i]]
    }

    return items
  }

  async submitAnswer(item: SessionItem, answer: Answer): Promise<void> {
    void item
    void answer
  }

  async getStats(): Promise<ModeStats> {
    const sessions = await db.sessions.where('modeId').equals('numbers').toArray()

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
