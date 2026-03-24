import { createEmptyCard, type Card, State } from 'ts-fsrs'
import type { CardState } from './schema'

export function toFSRSCard(cs: CardState): Card {
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

export function fromFSRSCard(card: Card): Partial<CardState> {
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
  } as Omit<CardState, 'id'>
}
