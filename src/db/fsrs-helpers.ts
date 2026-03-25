import { createEmptyCard, type Card, State } from 'ts-fsrs'
import type { CardState, GrammarCardState } from './schema'

/** Shared FSRS fields present in both CardState and GrammarCardState */
interface FSRSFields {
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

export function toFSRSCard(cs: FSRSFields): Card {
  return {
    due: new Date(cs.due),
    stability: cs.stability,
    difficulty: cs.difficulty,
    elapsed_days: cs.elapsed_days,
    scheduled_days: cs.scheduled_days,
    learning_steps: cs.learning_steps,
    reps: cs.reps,
    lapses: cs.lapses,
    state: cs.state as State,
    last_review: cs.last_review ? new Date(cs.last_review) : undefined,
  }
}

export function fromFSRSCard(card: Card): FSRSFields {
  return {
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review?.getTime() ?? 0,
  }
}

export function createNewCardState(
  wordId: number,
  direction: string,
): Omit<CardState, 'id'> {
  const empty = createEmptyCard()
  const fields = fromFSRSCard(empty)
  return {
    wordId,
    direction,
    ...fields,
  }
}

export function createNewGrammarCardState(
  itemId: string,
  category: string,
): Omit<GrammarCardState, 'id'> {
  const empty = createEmptyCard()
  const fields = fromFSRSCard(empty)
  return {
    itemId,
    category,
    ...fields,
  }
}
