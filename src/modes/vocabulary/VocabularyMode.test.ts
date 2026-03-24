import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/index'
import { addWordWithCards } from '../../db/operations'
import { VocabularyMode } from './VocabularyMode'

const mode = new VocabularyMode()

beforeEach(async () => {
  await db.decks.clear()
  await db.words.clear()
  await db.cardStates.clear()
  await db.sessions.clear()
  await db.settings.clear()
})

describe('VocabularyMode.getSessionItems', () => {
  it('returns items from active decks', async () => {
    const deckId = (await db.decks.add({
      name: 'Test',
      description: '',
      isActive: true,
      createdAt: Date.now(),
    })) as number

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
    const deckId = (await db.decks.add({
      name: 'Test',
      description: '',
      isActive: true,
      createdAt: Date.now(),
    })) as number

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
