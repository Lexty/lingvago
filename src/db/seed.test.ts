import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './index'
import { addWordWithCards } from './operations'
import { seedDatabase } from './seed'

beforeEach(async () => {
  await db.decks.clear()
  await db.words.clear()
  await db.cardStates.clear()
  await db.sessions.clear()
  await db.settings.clear()
})

describe('seedDatabase', () => {
  it('creates all seed decks with words and card states on empty DB', async () => {
    await seedDatabase()

    expect(await db.decks.count()).toBe(3)
    expect(await db.words.count()).toBe(226) // 26 + 119 + 81
    expect(await db.cardStates.count()).toBe(452) // 2 per word

    const decks = await db.decks.toArray()
    expect(decks.map((d) => d.name)).toEqual([
      'Starter',
      'Passaporte U1–U4',
      'Frases do dia-a-dia',
    ])
    expect(decks.every((d) => d.isActive)).toBe(true)
  })

  it('is idempotent — skips all decks on second call', async () => {
    await seedDatabase()
    await seedDatabase()

    expect(await db.decks.count()).toBe(3)
    expect(await db.words.count()).toBe(226)
  })

  it('creates card states with correct directions', async () => {
    await seedDatabase()

    const cards = await db.cardStates.toArray()
    const ptToRu = cards.filter((c) => c.direction === 'pt→ru')
    const ruToPt = cards.filter((c) => c.direction === 'ru→pt')

    expect(ptToRu.length).toBe(226)
    expect(ruToPt.length).toBe(226)
  })

  it('adds missing decks when some already exist (migration)', async () => {
    // Simulate existing DB with only the old 2 decks
    const deckId1 = (await db.decks.add({
      name: 'Starter',
      description: 'Базовые слова',
      isActive: true,
      createdAt: Date.now(),
    })) as number
    await addWordWithCards(
      { pt: 'olá', translations: { ru: 'привет' }, deckId: deckId1, createdAt: Date.now() },
      'ru',
    )

    const deckId2 = (await db.decks.add({
      name: 'Passaporte U1–U4',
      description: 'Passaporte',
      isActive: true,
      createdAt: Date.now(),
    })) as number
    await addWordWithCards(
      { pt: 'casa', translations: { ru: 'дом' }, deckId: deckId2, createdAt: Date.now() },
      'ru',
    )

    // seedDatabase should add only the new deck
    await seedDatabase()

    expect(await db.decks.count()).toBe(3)
    const decks = await db.decks.toArray()
    const names = decks.map((d) => d.name)
    expect(names).toContain('Frases do dia-a-dia')

    // Old decks should keep their original word count (not re-seeded)
    const starterDeck = decks.find((d) => d.name === 'Starter')!
    const starterWords = await db.words.where('deckId').equals(starterDeck.id!).count()
    expect(starterWords).toBe(1) // only the manually added word, not re-seeded
  })

  it('adds new deck even when user has custom decks', async () => {
    // Simulate user who created their own deck
    await db.decks.add({
      name: 'My custom deck',
      description: 'User-created',
      isActive: true,
      createdAt: Date.now(),
    })

    await seedDatabase()

    // All 3 seed decks should be created alongside the custom one
    expect(await db.decks.count()).toBe(4)
    const names = (await db.decks.toArray()).map((d) => d.name)
    expect(names).toContain('Starter')
    expect(names).toContain('Passaporte U1–U4')
    expect(names).toContain('Frases do dia-a-dia')
    expect(names).toContain('My custom deck')
  })
})
