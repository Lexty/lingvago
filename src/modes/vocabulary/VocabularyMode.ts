import { FSRS, Rating, type Grade } from 'ts-fsrs'
import { db } from '../../db/index'
import { toFSRSCard, fromFSRSCard } from '../../db/fsrs-helpers'
import { MultipleChoice } from '../../components/exercises'
import type { LearningMode, SessionItem, Answer, ModeStats, ExerciseComponentProps } from '../types'
import type { ComponentType } from 'react'
import type { CardState, Word } from '../../db/schema'
import FlipCard from './components/FlipCard'
import VocabularyInput from './components/VocabularyInput'

const fsrs = new FSRS({})

const FLIP_CARD_STABILITY = 21

export class VocabularyMode implements LearningMode {
  readonly id = 'vocabulary'
  readonly title = 'Словарь'
  readonly description = 'Изучение слов с интервальным повторением'
  readonly icon = '📚'

  readonly exerciseComponents: Record<string, ComponentType<ExerciseComponentProps>> = {
    'multiple-choice': MultipleChoice,
    'text-input': VocabularyInput,
    'flip-card': FlipCard,
  }

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

  private getExerciseType(cs: CardState): 'multiple-choice' | 'text-input' | 'flip-card' {
    const isProduction = cs.direction.endsWith('→pt')

    // First encounter → always MC (recognition)
    if (cs.state === 0) return 'multiple-choice'

    // Learning → production starts typing, comprehension stays MC
    if (cs.state === 1) return isProduction ? 'text-input' : 'multiple-choice'

    if (isProduction) {
      // lang→PT: MC → text-input → flip-card
      if (cs.state === 3) return 'text-input' // Relearning: prove recall
      // state === 2 (Review)
      if (cs.stability >= FLIP_CARD_STABILITY) return 'flip-card'
      return 'text-input'
    } else {
      // PT→lang: MC → flip-card (no text-input due to translation variability)
      return 'flip-card'
    }
  }

  private generateOptions(correct: string, pool: string[]): string[] {
    const unique = [...new Set(pool.filter((t) => t !== correct))]
    if (unique.length <= 3) {
      return this.shuffle([correct, ...unique])
    }

    const correctWords = correct.split(/\s+/).length
    const correctLen = correct.length

    // Score each distractor: lower = more similar to correct answer
    const scored = unique.map((text) => ({
      text,
      score:
        Math.abs(text.split(/\s+/).length - correctWords) * 100 +
        Math.abs(text.length - correctLen),
    }))

    scored.sort((a, b) => a.score - b.score)

    // 1 confusing distractor (from top 5 most similar) + 2 random from the rest
    const confusing = this.shuffle(scored.slice(0, Math.min(5, scored.length)))[0].text
    const rest = unique.filter((t) => t !== confusing)
    const random2 = this.shuffle(rest).slice(0, 2)

    return this.shuffle([correct, confusing, ...random2])
  }

  private shuffle<T>(arr: T[]): T[] {
    const copy = [...arr]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }

  private mapAnswerToRating(answer: Answer): number {
    // Close match (accent/typo): treat as Hard — right word, wrong details
    if (answer.result === 'close') return Rating.Hard
    if (!answer.correct) return Rating.Again
    if (answer.timeMs < 3000) return Rating.Easy
    if (answer.timeMs <= 8000) return Rating.Good
    return Rating.Hard
  }
}
