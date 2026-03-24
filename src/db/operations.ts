import { db } from './index'
import { createNewCardState } from './fsrs-helpers'
import type { Word } from './schema'

/**
 * Ensure a default Settings record exists. Idempotent.
 */
export async function ensureSettings(): Promise<void> {
  const existing = await db.settings.get('global')
  if (existing) return

  await db.settings.put({
    id: 'global',
    sessionSize: 10,
    theme: 'system',
    uiLanguage: navigator.language.startsWith('ru') ? 'ru' : 'en',
    studyLanguage: 'ru',
  })
}

/**
 * Add a word and its two CardStates in a single transaction.
 * Returns the new word ID.
 */
export async function addWordWithCards(
  word: Omit<Word, 'id'>,
  studyLanguage: string,
): Promise<number> {
  return await db.transaction('rw', [db.words, db.cardStates], async () => {
    const wordId = (await db.words.add(word)) as number

    if (word.translations[studyLanguage]) {
      const cs1 = createNewCardState(wordId, `pt→${studyLanguage}`)
      const cs2 = createNewCardState(wordId, `${studyLanguage}→pt`)
      await db.cardStates.bulkAdd([cs1, cs2])
    }

    return wordId
  })
}

/**
 * Bulk-add words with their CardStates in a single transaction.
 * Returns the count of inserted words.
 */
export async function bulkAddWordsWithCards(
  words: Array<Omit<Word, 'id'>>,
  studyLanguage: string,
): Promise<number> {
  return await db.transaction('rw', [db.words, db.cardStates], async () => {
    let count = 0
    for (const word of words) {
      const wordId = (await db.words.add(word)) as number
      if (word.translations[studyLanguage]) {
        const cs1 = createNewCardState(wordId, `pt→${studyLanguage}`)
        const cs2 = createNewCardState(wordId, `${studyLanguage}→pt`)
        await db.cardStates.bulkAdd([cs1, cs2])
      }
      count++
    }
    return count
  })
}

/**
 * Delete a word and all its CardStates in a single transaction.
 */
export async function deleteWord(wordId: number): Promise<void> {
  await db.transaction('rw', [db.words, db.cardStates], async () => {
    await db.cardStates.where('wordId').equals(wordId).delete()
    await db.words.delete(wordId)
  })
}

/**
 * Delete a deck, all its words, and all their CardStates in a single transaction.
 */
export async function deleteDeck(deckId: number): Promise<void> {
  await db.transaction('rw', [db.decks, db.words, db.cardStates], async () => {
    const words = await db.words.where('deckId').equals(deckId).toArray()
    const wordIds = words.map((w) => w.id!)

    if (wordIds.length > 0) {
      await db.cardStates.where('wordId').anyOf(wordIds).delete()
      await db.words.where('deckId').equals(deckId).delete()
    }

    await db.decks.delete(deckId)
  })
}
