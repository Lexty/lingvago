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
  it('creates seed decks with words and card states', async () => {
    await seedDatabase()

    expect(await db.decks.count()).toBe(2)
    expect(await db.words.count()).toBe(145) // 26 Starter + 119 Passaporte
    expect(await db.cardStates.count()).toBe(290) // 2 per word

    const decks = await db.decks.toArray()
    expect(decks.map((d) => d.name)).toEqual(['Starter', 'Passaporte U1–U4'])
    expect(decks.every((d) => d.isActive)).toBe(true)
  })

  it('is idempotent — skips if decks already exist', async () => {
    await seedDatabase()
    await seedDatabase() // second call

    expect(await db.decks.count()).toBe(2)
    expect(await db.words.count()).toBe(145)
  })

  it('creates card states with correct directions', async () => {
    await seedDatabase()

    const cards = await db.cardStates.toArray()
    const ptToRu = cards.filter((c) => c.direction === 'pt→ru')
    const ruToPt = cards.filter((c) => c.direction === 'ru→pt')

    expect(ptToRu.length).toBe(145)
    expect(ruToPt.length).toBe(145)
  })
})
