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

  it('backfills seedId on pre-v3 decks and does not duplicate them', async () => {
    // Simulate pre-v3 DB: decks exist but without seedId (the actual bug)
    const deckId1 = (await db.decks.add({
      name: 'Starter',
      description: 'Базовые слова',
      isActive: true,
      createdAt: Date.now(),
      // no seedId — this is the pre-v3 state
    })) as number
    await addWordWithCards(
      { pt: 'olá', translations: { ru: 'привет' }, deckId: deckId1, createdAt: Date.now() },
      'ru',
    )

    await db.decks.add({
      name: 'Passaporte U1–U4',
      description: 'Passaporte',
      isActive: true,
      createdAt: Date.now(),
    })

    await seedDatabase()

    // No duplicates: 2 old + 1 new = 3 total
    expect(await db.decks.count()).toBe(3)
    const decks = await db.decks.toArray()

    // seedId was backfilled on old decks
    const starter = decks.find((d) => d.name === 'Starter')!
    expect(starter.seedId).toBe('starter')
    const passaporte = decks.find((d) => d.name === 'Passaporte U1–U4')!
    expect(passaporte.seedId).toBe('passaporte-u1-u4')

    // New deck was added
    expect(decks.map((d) => d.seedId)).toContain('frases-dia-a-dia')

    // Old deck kept its original words (not re-seeded)
    const starterWords = await db.words.where('deckId').equals(deckId1).count()
    expect(starterWords).toBe(1)
  })

  it('seeds all decks when only user-created decks exist (no matching name)', async () => {
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

  it('reads studyLanguage from settings (not hardcoded)', async () => {
    // Seed data only has 'ru' translations, so studyLanguage='en' means
    // no card states (addWordWithCards skips words without matching translation)
    await db.settings.put({
      id: 'global',
      sessionSize: 10,
      theme: 'system',
      uiLanguage: 'en',
      studyLanguage: 'en',
      strictAccents: true,
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
