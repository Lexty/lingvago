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
    expect(decks.every((d) => d.seedId)).toBe(true)
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

  it('adds missing seed decks when old seed decks exist (v2→v3 migration)', async () => {
    // Simulate existing DB with old seed decks (have seedId for starter/passaporte)
    const deckId1 = (await db.decks.add({
      name: 'Starter',
      description: 'Базовые слова',
      isActive: true,
      seedId: 'starter',
      createdAt: Date.now(),
    })) as number
    await addWordWithCards(
      { pt: 'olá', translations: { ru: 'привет' }, deckId: deckId1, createdAt: Date.now() },
      'ru',
    )

    await db.decks.add({
      name: 'Passaporte U1–U4',
      description: 'Passaporte',
      isActive: true,
      seedId: 'passaporte-u1-u4',
      createdAt: Date.now(),
    })

    await seedDatabase()

    expect(await db.decks.count()).toBe(3)
    const decks = await db.decks.toArray()
    expect(decks.map((d) => d.seedId)).toContain('frases-dia-a-dia')

    // Old deck should keep its original word count (not re-seeded)
    const starterWords = await db.words.where('deckId').equals(deckId1).count()
    expect(starterWords).toBe(1)
  })

  it('seeds all decks when only user-created decks exist (no seedId)', async () => {
    await db.decks.add({
      name: 'My custom deck',
      description: 'User-created',
      isActive: true,
      createdAt: Date.now(),
    })

    await seedDatabase()

    // All 3 seed decks + 1 custom
    expect(await db.decks.count()).toBe(4)
    const decks = await db.decks.toArray()
    const seedIds = decks.filter((d) => d.seedId).map((d) => d.seedId)
    expect(seedIds).toContain('starter')
    expect(seedIds).toContain('passaporte-u1-u4')
    expect(seedIds).toContain('frases-dia-a-dia')
  })

  it('user deck with same name as seed does not block seeding', async () => {
    // User created a deck named "Starter" (no seedId)
    await db.decks.add({
      name: 'Starter',
      description: 'User version',
      isActive: true,
      createdAt: Date.now(),
    })

    await seedDatabase()

    // Both user's "Starter" and seed "Starter" should exist
    const decks = await db.decks.toArray()
    const starters = decks.filter((d) => d.name === 'Starter')
    expect(starters.length).toBe(2)
    expect(starters.some((d) => d.seedId === 'starter')).toBe(true)
    expect(starters.some((d) => !d.seedId)).toBe(true)
  })

  it('reads studyLanguage from settings (not hardcoded)', async () => {
    // Seed data only has 'ru' translations, so studyLanguage='en' means
    // no card states (addWordWithCards skips words without matching translation)
    await db.settings.put({
      id: 'global',
      sessionSize: 10,
      theme: 'system',
      uiLanguage: 'en',
      studyLanguage: 'en',
    })

    await seedDatabase()

    // Decks are created regardless of studyLanguage
    expect(await db.decks.count()).toBe(3)
    expect(await db.words.count()).toBe(226)

    // But no card states because no 'en' translations in seed data
    const cards = await db.cardStates.toArray()
    expect(cards.filter((c) => c.direction.includes('ru')).length).toBe(0)
    expect(cards.filter((c) => c.direction.includes('en')).length).toBe(0)
  })
})
