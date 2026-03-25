export interface Deck {
  id?: number
  name: string
  description: string
  isActive: boolean
  createdAt: number
  /** Stable identifier for built-in seed decks. Undefined for user-created decks. */
  seedId?: string
}

export interface Word {
  id?: number
  pt: string
  translations: Record<string, string>
  deckId: number
  createdAt: number
}

export interface CardState {
  id?: number
  wordId: number
  direction: string
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review: number
}

export interface GrammarCardState {
  id?: number
  itemId: string        // "conj:eu:presente:falar", "gender:casa", "plural:mão", "prep:0"
  category: string      // "conjugation" | "gender" | "articles" | "plural" | "prepositions"
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review: number
}

export interface Session {
  id?: number
  modeId: string
  startedAt: number
  finishedAt: number
  totalCards: number
  correctCards: number
}

export interface Settings {
  id: string
  sessionSize: number
  theme: 'light' | 'dark' | 'system'
  uiLanguage: string
  studyLanguage: string
  strictAccents: boolean
}
