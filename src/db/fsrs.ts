// Pure FSRS scheduling shim (SPEC §8 rating mapping, §13.1 before/after
// snapshots).
//
// SCOPE: this is a thin wrapper around ts-fsrs ONLY — rate -> next cardState and
// before/after snapshot helpers. It deliberately does NOT log attempts, record
// sessions, or compute mastery; those flows belong to a later WP. No side
// effects, no database access here.

import {
  type Card,
  type Grade,
  Rating,
  type RecordLogItem,
  State,
  createEmptyCard,
  fsrs,
  type FSRS,
  generatorParameters,
} from 'ts-fsrs';
import type { CardStateRecord, FsrsCard } from './schema.ts';

export { Rating, State, createEmptyCard };
export type { Card, Grade };

/** Process-wide scheduler (default ts-fsrs parameters). */
export const scheduler: FSRS = fsrs(generatorParameters());

/** A fresh, unseen card (state = New). Thin re-export of `createEmptyCard`. */
export function newCard(now: Date = new Date()): FsrsCard {
  return createEmptyCard(now);
}

/** True when a value is one of the four graded ratings (not `Manual`). */
export function isGrade(rating: unknown): rating is Grade {
  return (
    rating === Rating.Again ||
    rating === Rating.Hard ||
    rating === Rating.Good ||
    rating === Rating.Easy
  );
}

/** Before/after FSRS snapshot pair for telemetry (SPEC §13.1). */
export interface FsrsSnapshot {
  before: FsrsCard;
  after: FsrsCard;
}

/** Result of rating a card: the next card plus the before/after snapshot. */
export interface ScheduleResult {
  /** Next FSRS card state to persist into `cardStates`. */
  card: FsrsCard;
  /** ts-fsrs review log for the applied rating. */
  log: RecordLogItem['log'];
  /** Before/after snapshot (§13.1) for the attempt record. */
  snapshot: FsrsSnapshot;
}

/**
 * Apply a rating to a card and return the next state + before/after snapshot.
 *
 * @throws RangeError on an invalid (non-graded) rating, so callers fail fast
 * rather than silently scheduling with a `Manual`/garbage rating.
 */
export function rateCard(
  card: FsrsCard,
  rating: Grade,
  now: Date = new Date(),
): ScheduleResult {
  if (!isGrade(rating)) {
    throw new RangeError(
      `rateCard: invalid rating ${String(rating)} (expected Again/Hard/Good/Easy)`,
    );
  }
  // ts-fsrs.next() does not mutate the input card, but clone the pre-rating
  // state defensively so the snapshot stays stable for telemetry (§13.1).
  const before: FsrsCard = { ...card };
  const result = scheduler.next(card, now, rating);
  const after: FsrsCard = result.card;
  return {
    card: after,
    log: result.log,
    snapshot: { before, after },
  };
}

/**
 * Build a persistable `cardStates` record from a card + stable id.
 *
 * Caches `due`/`state`/`lastReview` for indexed scheduling queries (§7.2).
 */
export function toCardStateRecord(
  id: string,
  card: FsrsCard,
  updatedAt: Date = new Date(),
): CardStateRecord {
  return {
    id,
    card,
    due: card.due,
    state: card.state,
    lastReview: card.last_review,
    updatedAt,
  };
}

/**
 * Convenience: rate a stored card and produce the next `cardStates` record plus
 * the before/after snapshot for the attempt log — without touching the DB.
 */
export function rateCardStateRecord(
  record: CardStateRecord,
  rating: Grade,
  now: Date = new Date(),
): { record: CardStateRecord; snapshot: FsrsSnapshot; log: RecordLogItem['log'] } {
  const result = rateCard(record.card, rating, now);
  return {
    record: toCardStateRecord(record.id, result.card, now),
    snapshot: result.snapshot,
    log: result.log,
  };
}
