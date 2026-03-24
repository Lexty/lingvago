import { FSRS, Rating, type Grade } from 'ts-fsrs'
import { db } from '../../db/index'
import { toFSRSCard, fromFSRSCard } from '../../db/fsrs-helpers'
import type { LearningMode, SessionItem, Answer, ModeStats } from '../types'
import type { CardState, Word } from '../../db/schema'

const fsrs = new FSRS({})

const STABILITY_THRESHOLD_DAYS = 10

export class VocabularyMode implements LearningMode {
  readonly id = 'vocabulary'
  readonly title = 'Словарь'
  readonly description = 'Изучение слов с интервальным повторением'
  readonly icon = '📚'

  async getSessionItems(count: number): Promise<SessionItem[]> {
    const settings = await db.settings.get('global')
    const studyLanguage = settings?.studyLanguage ?? 'ru'

    // Get active deck IDs
    const activeDeckIds = await this.getActiveDeckIds()
    if (activeDeckIds.size === 0) return []

    const now = Date.now()
    const directions = [`pt→${studyLanguage}`, `${studyLanguage}→pt`]

    // Get due cards
    const dueCards = await db.cardStates
      .where('due')
      .belowOrEqual(now)
      .toArray()

    // Filter by direction and active decks
    const validDueCards: Array<{ cs: CardState; word: Word }> = []
    for (const cs of dueCards) {
      if (!directions.includes(cs.direction)) continue
      const word = await db.words.get(cs.wordId)
      if (!word || !activeDeckIds.has(word.deckId)) continue
      validDueCards.push({ cs, word })
    }

    // Sort by due (most overdue first)
    validDueCards.sort((a, b) => a.cs.due - b.cs.due)

    let selected = validDueCards.slice(0, count)

    // Fill with new cards if needed
    if (selected.length < count) {
      const remaining = count - selected.length
      const newCards = await db.cardStates
        .where('state')
        .equals(0) // State.New
        .toArray()

      const selectedWordIds = new Set(selected.map((s) => s.cs.wordId))
      const validNewCards: Array<{ cs: CardState; word: Word }> = []

      for (const cs of newCards) {
        if (!directions.includes(cs.direction)) continue
        if (selectedWordIds.has(cs.wordId)) continue
        const word = await db.words.get(cs.wordId)
        if (!word || !activeDeckIds.has(word.deckId)) continue
        if (!word.translations[studyLanguage]) continue
        validNewCards.push({ cs, word })
        selectedWordIds.add(cs.wordId)
        if (validNewCards.length >= remaining) break
      }

      selected = [...selected, ...validNewCards]
    }

    // Shuffle to avoid same-word pairs appearing back-to-back
    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selected[i], selected[j]] = [selected[j], selected[i]]
    }

    // Get all words from active decks for distractors
    const allWords = await db.words.where('deckId').anyOf([...activeDeckIds]).toArray()
    const allTranslations = allWords
      .filter((w) => w.translations[studyLanguage])
      .map((w) => ({ pt: w.pt, translation: w.translations[studyLanguage] }))

    // Build session items
    return selected.map(({ cs, word }, index) => {
      const isPtToLang = cs.direction === `pt→${studyLanguage}`
      const question = isPtToLang ? word.pt : word.translations[studyLanguage]
      const correctAnswer = isPtToLang ? word.translations[studyLanguage] : word.pt

      const exerciseType = this.getExerciseType(cs)

      let options: string[] | undefined
      if (exerciseType === 'multiple-choice') {
        options = this.generateOptions(
          correctAnswer,
          isPtToLang ? allTranslations.map((t) => t.translation) : allTranslations.map((t) => t.pt),
        )
      }

      return {
        id: `${cs.id}-${index}`,
        question,
        correctAnswer,
        exerciseType,
        options,
        payload: {
          cardStateId: cs.id,
          direction: cs.direction,
          wordId: cs.wordId,
        },
      }
    })
  }

  async submitAnswer(item: SessionItem, answer: Answer): Promise<void> {
    const cardStateId = item.payload.cardStateId as number
    const cardState = await db.cardStates.get(cardStateId)
    if (!cardState) return

    const card = toFSRSCard(cardState)
    const rating = (answer.fsrsRating ?? this.mapAnswerToRating(answer)) as Grade
    const result = fsrs.next(card, new Date(), rating)
    const updated = fromFSRSCard(result.card)

    await db.cardStates.update(cardStateId, updated)
  }

  async getStats(): Promise<ModeStats> {
    const settings = await db.settings.get('global')
    const studyLanguage = settings?.studyLanguage ?? 'ru'

    const activeDeckIds = await this.getActiveDeckIds()
    if (activeDeckIds.size === 0) {
      return { totalItems: 0, dueNow: 0, averageRetention: 0, totalReviews: 0 }
    }

    const words = await db.words.where('deckId').anyOf([...activeDeckIds]).toArray()
    const wordIds = new Set(words.map((w) => w.id!))

    const directions = [`pt→${studyLanguage}`, `${studyLanguage}→pt`]
    const allCards = await db.cardStates.where('wordId').anyOf([...wordIds]).toArray()
    const cards = allCards.filter((cs) => directions.includes(cs.direction))

    const now = Date.now()
    const dueNow = cards.filter((cs) => cs.due <= now).length
    const totalReviews = cards.reduce((sum, cs) => sum + cs.reps, 0)

    // Retention heuristic: 1 - (lapses / reps) for reviewed cards
    const reviewedCards = cards.filter((cs) => cs.reps > 0)
    const averageRetention =
      reviewedCards.length > 0
        ? reviewedCards.reduce((sum, cs) => sum + (1 - cs.lapses / cs.reps), 0) / reviewedCards.length
        : 0

    return {
      totalItems: words.length,
      dueNow,
      averageRetention,
      totalReviews,
    }
  }

  async getDueCount(): Promise<number> {
    const settings = await db.settings.get('global')
    const studyLanguage = settings?.studyLanguage ?? 'ru'

    const activeDeckIds = await this.getActiveDeckIds()
    if (activeDeckIds.size === 0) return 0

    const now = Date.now()
    const directions = [`pt→${studyLanguage}`, `${studyLanguage}→pt`]

    const dueCards = await db.cardStates.where('due').belowOrEqual(now).toArray()

    let count = 0
    for (const cs of dueCards) {
      if (!directions.includes(cs.direction)) continue
      const word = await db.words.get(cs.wordId)
      if (word && activeDeckIds.has(word.deckId)) count++
    }

    return count
  }

  private async getActiveDeckIds(): Promise<Set<number>> {
    const decks = await db.decks.toArray()
    return new Set(decks.filter((d) => d.isActive).map((d) => d.id!))
  }

  private getExerciseType(cs: CardState): 'multiple-choice' | 'flip-card' {
    // Review cards with high stability → flip card (self-assessment)
    if (cs.state === 2 && cs.stability >= STABILITY_THRESHOLD_DAYS) {
      return 'flip-card'
    }
    return 'multiple-choice'
  }

  private generateOptions(correct: string, pool: string[]): string[] {
    const distractors = pool.filter((t) => t !== correct)
    // Shuffle and pick 3
    const shuffled = distractors.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, 3)
    // Combine with correct and shuffle
    const options = [correct, ...selected]
    return options.sort(() => Math.random() - 0.5)
  }

  private mapAnswerToRating(answer: Answer): number {
    if (!answer.correct) return Rating.Again
    if (answer.timeMs < 3000) return Rating.Easy
    if (answer.timeMs <= 8000) return Rating.Good
    return Rating.Hard
  }
}
