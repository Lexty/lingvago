import Dexie, { type Table } from 'dexie'
import type { Deck, Word, CardState, Session, Settings } from './schema'

export class LingvagoDatabase extends Dexie {
  decks!: Table<Deck, number>
  words!: Table<Word, number>
  cardStates!: Table<CardState, number>
  sessions!: Table<Session, number>
  settings!: Table<Settings, string>

  constructor(name = 'lingvago') {
    super(name)
    this.version(1).stores({
      decks: '++id, name',
      words: '++id, deckId, pt',
      cardStates: '++id, wordId, direction, due, state, [wordId+direction]',
      sessions: '++id, modeId, startedAt',
      settings: 'id',
    })
  }
}

export const db = new LingvagoDatabase()
