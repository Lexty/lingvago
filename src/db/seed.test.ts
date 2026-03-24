import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './index'
import { seedDatabase } from './seed'

beforeEach(async () => {
  await db.decks.clear()
  await db.words.clear()
  await db.cardStates.clear()
  await db.sessions.clear()
  await db.settings.clear()
})

describe('seedDatabase', () => {
  it('creates starter deck with words and card states', async () => {
    await seedDatabase()

    expect(await db.decks.count()).toBe(1)
    expect(await db.words.count()).toBe(26)
    expect(await db.cardStates.count()).toBe(52) // 2 per word

    const deck = await db.decks.toArray()
    expect(deck[0].name).toBe('Starter')
    expect(deck[0].isActive).toBe(true)
  })

  it('is idempotent — skips if decks already exist', async () => {
    await seedDatabase()
    await seedDatabase() // second call

    expect(await db.decks.count()).toBe(1)
    expect(await db.words.count()).toBe(26)
  })

  it('creates card states with correct directions', async () => {
    await seedDatabase()

    const cards = await db.cardStates.toArray()
    const ptToRu = cards.filter((c) => c.direction === 'pt→ru')
    const ruToPt = cards.filter((c) => c.direction === 'ru→pt')

    expect(ptToRu.length).toBe(26)
    expect(ruToPt.length).toBe(26)
  })
})
