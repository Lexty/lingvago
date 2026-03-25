import { describe, it, expect, beforeEach } from 'vitest'
import { FSRS, Rating, createEmptyCard } from 'ts-fsrs'
import { db } from '../../db/index'
import { addWordWithCards } from '../../db/operations'
import { fromFSRSCard } from '../../db/fsrs-helpers'
import { VocabularyMode } from './VocabularyMode'

const fsrs = new FSRS({})

/** Advance a new card to Review state with the given stability by running FSRS transitions */
function makeReviewCardFields(targetStability: number) {
  let card = createEmptyCard()
  // Graduate through Learning → Review
  const r1 = fsrs.next(card, new Date(), Rating.Good)
  card = r1.card
  const r2 = fsrs.next(card, new Date(card.due), Rating.Good)
  card = r2.card
  // Now in Review state, adjust stability to target
  const fields = fromFSRSCard(card)
  return {
    ...fields,
    stability: targetStability,
    state: 2, // Review
  }
}

/** Create a Relearning card by lapsing from Review */
function makeRelearningCardFields() {
  let card = createEmptyCard()
  // Graduate to Review
  const r1 = fsrs.next(card, new Date(), Rating.Good)
  card = r1.card
  const r2 = fsrs.next(card, new Date(card.due), Rating.Good)
  card = r2.card
  // Lapse → Relearning
  const r3 = fsrs.next(card, new Date(card.due), Rating.Again)
  card = r3.card
  return fromFSRSCard(card)
}

const mode = new VocabularyMode()

async function createDeck() {
  return (await db.decks.add({
    name: 'Test',
    description: '',
    isActive: true,
    createdAt: Date.now(),
  })) as number
}

beforeEach(async () => {
  await db.decks.clear()
  await db.words.clear()
  await db.cardStates.clear()
  await db.sessions.clear()
  await db.settings.clear()
})

describe('VocabularyMode.getSessionItems', () => {
  it('returns items from active decks', async () => {
    const deckId = await createDeck()

    await addWordWithCards(
      { pt: 'casa', translations: { ru: 'дом' }, deckId, createdAt: Date.now() },
      'ru',
    )

    const items = await mode.getSessionItems(10)
    expect(items.length).toBe(2) // pt→ru and ru→pt
    expect(items.some((i) => i.question === 'casa')).toBe(true)
    expect(items.some((i) => i.correctAnswer === 'casa')).toBe(true)
  })

  it('shuffles items so order is not deterministic', async () => {
    const deckId = await createDeck()

    // Add enough words to make shuffling observable
    const words = ['olá', 'casa', 'água', 'café', 'pão', 'leite', 'mãe', 'pai', 'filho', 'amigo']
    for (const pt of words) {
      await addWordWithCards(
        { pt, translations: { ru: pt + '_ru' }, deckId, createdAt: Date.now() },
        'ru',
      )
    }

    // Run multiple times and collect orderings
    const orderings: string[] = []
    for (let run = 0; run < 10; run++) {
      const items = await mode.getSessionItems(20)
      orderings.push(items.map((i) => i.id).join(','))
    }

    // At least 2 different orderings out of 10 runs
    const uniqueOrderings = new Set(orderings)
    expect(uniqueOrderings.size).toBeGreaterThan(1)
  })

  it('returns empty array when no active decks', async () => {
    const deckId = (await db.decks.add({
      name: 'Test',
      description: '',
      isActive: false,
      createdAt: Date.now(),
    })) as number

    await addWordWithCards(
      { pt: 'olá', translations: { ru: 'привет' }, deckId, createdAt: Date.now() },
      'ru',
    )

    const items = await mode.getSessionItems(10)
    expect(items.length).toBe(0)
  })
})

describe('exercise type progression', () => {
  it('new cards (state=0) get multiple-choice', async () => {
    const deckId = await createDeck()
    await addWordWithCards(
      { pt: 'gato', translations: { ru: 'кот' }, deckId, createdAt: Date.now() },
      'ru',
    )

    const items = await mode.getSessionItems(10)
    // All new cards should be MC
    for (const item of items) {
      expect(item.exerciseType).toBe('multiple-choice')
    }
  })

  it('lang→PT review cards with low stability get text-input', async () => {
    const deckId = await createDeck()
    const wordId = (await db.words.add({
      pt: 'gato',
      translations: { ru: 'кот' },
      deckId,
      createdAt: Date.now(),
    })) as number

    const fields = makeReviewCardFields(5)
    await db.cardStates.add({
      wordId,
      direction: 'ru→pt',
      ...fields,
      due: Date.now() - 1000,
    })

    const items = await mode.getSessionItems(10)
    const ruToPt = items.find((i) => (i.payload.direction as string) === 'ru→pt')
    expect(ruToPt).toBeDefined()
    expect(ruToPt!.exerciseType).toBe('text-input')
    expect(ruToPt!.options).toBeUndefined()
  })

  it('lang→PT review cards with high stability get flip-card', async () => {
    const deckId = await createDeck()
    const wordId = (await db.words.add({
      pt: 'gato',
      translations: { ru: 'кот' },
      deckId,
      createdAt: Date.now(),
    })) as number

    const fields = makeReviewCardFields(25)
    await db.cardStates.add({
      wordId,
      direction: 'ru→pt',
      ...fields,
      due: Date.now() - 1000,
    })

    const items = await mode.getSessionItems(10)
    const ruToPt = items.find((i) => (i.payload.direction as string) === 'ru→pt')
    expect(ruToPt).toBeDefined()
    expect(ruToPt!.exerciseType).toBe('flip-card')
  })

  it('lang→PT relearning cards (state=3) get text-input', async () => {
    const deckId = await createDeck()
    const wordId = (await db.words.add({
      pt: 'gato',
      translations: { ru: 'кот' },
      deckId,
      createdAt: Date.now(),
    })) as number

    const fields = makeRelearningCardFields()
    await db.cardStates.add({
      wordId,
      direction: 'ru→pt',
      ...fields,
      due: Date.now() - 1000,
    })

    const items = await mode.getSessionItems(10)
    const ruToPt = items.find((i) => (i.payload.direction as string) === 'ru→pt')
    expect(ruToPt).toBeDefined()
    expect(ruToPt!.exerciseType).toBe('text-input')
  })

  it('PT→lang never gets text-input regardless of state or stability', async () => {
    const deckId = await createDeck()
    const wordId = (await db.words.add({
      pt: 'gato',
      translations: { ru: 'кот' },
      deckId,
      createdAt: Date.now(),
    })) as number

    // Test Review with low stability
    const lowFields = makeReviewCardFields(5)
    await db.cardStates.add({ wordId, direction: 'pt→ru', ...lowFields, due: Date.now() - 1000 })
    let items = await mode.getSessionItems(10)
    let ptToRu = items.find((i) => (i.payload.direction as string) === 'pt→ru')
    expect(ptToRu).toBeDefined()
    expect(ptToRu!.exerciseType).toBe('flip-card')

    // Test Review with high stability
    await db.cardStates.clear()
    const highFields = makeReviewCardFields(25)
    await db.cardStates.add({ wordId, direction: 'pt→ru', ...highFields, due: Date.now() - 1000 })
    items = await mode.getSessionItems(10)
    ptToRu = items.find((i) => (i.payload.direction as string) === 'pt→ru')
    expect(ptToRu).toBeDefined()
    expect(ptToRu!.exerciseType).toBe('flip-card')

    // Test Relearning
    await db.cardStates.clear()
    const relFields = makeRelearningCardFields()
    await db.cardStates.add({ wordId, direction: 'pt→ru', ...relFields, due: Date.now() - 1000 })
    items = await mode.getSessionItems(10)
    ptToRu = items.find((i) => (i.payload.direction as string) === 'pt→ru')
    expect(ptToRu).toBeDefined()
    expect(ptToRu!.exerciseType).toBe('flip-card')
  })

  it('multiple-choice items have options, text-input items do not', async () => {
    const deckId = await createDeck()
    // Add multiple words for distractor pool
    const words = ['gato', 'casa', 'água', 'café', 'pão']
    for (const pt of words) {
      await addWordWithCards(
        { pt, translations: { ru: pt + '_ru' }, deckId, createdAt: Date.now() },
        'ru',
      )
    }

    const items = await mode.getSessionItems(20)
    for (const item of items) {
      if (item.exerciseType === 'multiple-choice') {
        expect(item.options).toBeDefined()
        expect(item.options!.length).toBe(4)
      } else if (item.exerciseType === 'text-input') {
        expect(item.options).toBeUndefined()
      }
    }
  })
})

describe('submitAnswer with result field', () => {
  it('close result maps to Rating.Hard (not Again)', async () => {
    const deckId = await createDeck()
    const wordId = (await db.words.add({
      pt: 'informação',
      translations: { ru: 'информация' },
      deckId,
      createdAt: Date.now(),
    })) as number

    const fields = makeReviewCardFields(5)
    const csId = (await db.cardStates.add({
      wordId,
      direction: 'ru→pt',
      ...fields,
      due: Date.now() - 1000,
    })) as number

    const item = {
      id: 'test-1',
      question: 'информация',
      correctAnswer: 'informação',
      exerciseType: 'text-input' as const,
      payload: { cardStateId: csId, direction: 'ru→pt', wordId },
    }

    // Submit close answer (correct=false, result='close')
    await mode.submitAnswer(item, {
      value: 'informacao',
      correct: false,
      result: 'close',
      timeMs: 5000,
    })

    const updated = await db.cardStates.get(csId)
    expect(updated).toBeDefined()
    // Rating.Hard should NOT set state to Relearning (unlike Again)
    expect(updated!.state).toBe(2) // Still Review, not Relearning (3)
  })

  it('wrong answer without result maps to Rating.Again', async () => {
    const deckId = await createDeck()
    const wordId = (await db.words.add({
      pt: 'casa',
      translations: { ru: 'дом' },
      deckId,
      createdAt: Date.now(),
    })) as number

    const fields = makeReviewCardFields(5)
    const csId = (await db.cardStates.add({
      wordId,
      direction: 'ru→pt',
      ...fields,
      due: Date.now() - 1000,
    })) as number

    const item = {
      id: 'test-2',
      question: 'дом',
      correctAnswer: 'casa',
      exerciseType: 'text-input' as const,
      payload: { cardStateId: csId, direction: 'ru→pt', wordId },
    }

    // Submit wrong answer (no result field)
    await mode.submitAnswer(item, {
      value: 'gato',
      correct: false,
      timeMs: 5000,
    })

    const updated = await db.cardStates.get(csId)
    expect(updated).toBeDefined()
    // Rating.Again sends Review card to Relearning
    expect(updated!.state).toBe(3) // Relearning
  })
})
