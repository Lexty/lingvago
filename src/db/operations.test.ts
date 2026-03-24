import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './index'
import { addWordWithCards, deleteWord, deleteDeck } from './operations'

beforeEach(async () => {
  await db.decks.clear()
  await db.words.clear()
  await db.cardStates.clear()
})

describe('addWordWithCards', () => {
  it('creates a word and 2 card states', async () => {
    const deckId = (await db.decks.add({
      name: 'Test',
      description: '',
      isActive: true,
      createdAt: Date.now(),
    })) as number

    const wordId = await addWordWithCards(
      { pt: 'casa', translations: { ru: 'дом' }, deckId, createdAt: Date.now() },
      'ru',
    )

    expect(wordId).toBeGreaterThan(0)
    expect(await db.words.count()).toBe(1)
    expect(await db.cardStates.count()).toBe(2)

    const cards = await db.cardStates.where('wordId').equals(wordId).toArray()
    const directions = cards.map((c) => c.direction).sort()
    expect(directions).toEqual(['pt→ru', 'ru→pt'])
  })

  it('skips card states if translation for studyLanguage is missing', async () => {
    const deckId = (await db.decks.add({
      name: 'Test',
      description: '',
      isActive: true,
      createdAt: Date.now(),
    })) as number

    await addWordWithCards(
      { pt: 'casa', translations: { en: 'house' }, deckId, createdAt: Date.now() },
      'ru',
    )

    expect(await db.words.count()).toBe(1)
    expect(await db.cardStates.count()).toBe(0)
  })
})

describe('deleteWord', () => {
  it('deletes word and its card states', async () => {
    const deckId = (await db.decks.add({
      name: 'Test',
      description: '',
      isActive: true,
      createdAt: Date.now(),
    })) as number

    const wordId = await addWordWithCards(
      { pt: 'casa', translations: { ru: 'дом' }, deckId, createdAt: Date.now() },
      'ru',
    )

    await deleteWord(wordId)

    expect(await db.words.count()).toBe(0)
    expect(await db.cardStates.count()).toBe(0)
  })

  it('does not affect other words', async () => {
    const deckId = (await db.decks.add({
      name: 'Test',
      description: '',
      isActive: true,
      createdAt: Date.now(),
    })) as number

    const id1 = await addWordWithCards(
      { pt: 'casa', translations: { ru: 'дом' }, deckId, createdAt: Date.now() },
      'ru',
    )
    await addWordWithCards(
      { pt: 'água', translations: { ru: 'вода' }, deckId, createdAt: Date.now() },
      'ru',
    )

    await deleteWord(id1)

    expect(await db.words.count()).toBe(1)
    expect(await db.cardStates.count()).toBe(2)
  })
})

describe('deleteDeck', () => {
  it('deletes deck, all its words, and all card states', async () => {
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
    await addWordWithCards(
      { pt: 'água', translations: { ru: 'вода' }, deckId, createdAt: Date.now() },
      'ru',
    )

    await deleteDeck(deckId)

    expect(await db.decks.count()).toBe(0)
    expect(await db.words.count()).toBe(0)
    expect(await db.cardStates.count()).toBe(0)
  })

  it('does not affect other decks', async () => {
    const deckId1 = (await db.decks.add({
      name: 'Deck1',
      description: '',
      isActive: true,
      createdAt: Date.now(),
    })) as number
    const deckId2 = (await db.decks.add({
      name: 'Deck2',
      description: '',
      isActive: true,
      createdAt: Date.now(),
    })) as number

    await addWordWithCards(
      { pt: 'casa', translations: { ru: 'дом' }, deckId: deckId1, createdAt: Date.now() },
      'ru',
    )
    await addWordWithCards(
      { pt: 'água', translations: { ru: 'вода' }, deckId: deckId2, createdAt: Date.now() },
      'ru',
    )

    await deleteDeck(deckId1)

    expect(await db.decks.count()).toBe(1)
    expect(await db.words.count()).toBe(1)
    expect(await db.cardStates.count()).toBe(2)
  })
})
