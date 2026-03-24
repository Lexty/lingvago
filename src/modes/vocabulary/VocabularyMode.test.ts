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
  it('does not place same-word cards back-to-back', async () => {
    const deckId = (await db.decks.add({
      name: 'Test',
      description: '',
      isActive: true,
      createdAt: Date.now(),
    })) as number

    // Add enough words to get a meaningful session
    const words = [
      { pt: 'olá', ru: 'привет' },
      { pt: 'casa', ru: 'дом' },
      { pt: 'água', ru: 'вода' },
      { pt: 'café', ru: 'кофе' },
      { pt: 'pão', ru: 'хлеб' },
    ]

    for (const w of words) {
      await addWordWithCards(
        { pt: w.pt, translations: { ru: w.ru }, deckId, createdAt: Date.now() },
        'ru',
      )
    }

    // Run multiple times — shuffled order should prevent consistent back-to-back
    let allBackToBack = true
    for (let run = 0; run < 5; run++) {
      const items = await mode.getSessionItems(10)
      expect(items.length).toBe(10) // 5 words × 2 directions

      let hasBackToBack = false
      for (let i = 1; i < items.length; i++) {
        if (items[i].payload.wordId === items[i - 1].payload.wordId) {
          hasBackToBack = true
          break
        }
      }
      if (!hasBackToBack) allBackToBack = false
    }

    // Over 5 runs, shuffle should prevent ALL runs from having back-to-back
    expect(allBackToBack).toBe(false)
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
