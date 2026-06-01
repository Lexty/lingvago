import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './index.ts';
import {
  type Grade,
  Rating,
  State,
  isGrade,
  newCard,
  rateCard,
  rateCardStateRecord,
  toCardStateRecord,
} from './fsrs.ts';

describe('fsrs scheduling shim', () => {
  it('newCard produces a fresh New card', () => {
    const card = newCard();
    expect(card.state).toBe(State.New);
    expect(card.reps).toBe(0);
    expect(card.due).toBeInstanceOf(Date);
  });

  it('rateCard with Good yields a valid next due/state and snapshot', () => {
    const now = new Date('2026-05-31T12:00:00.000Z');
    const card = newCard(now);
    const result = rateCard(card, Rating.Good, now);

    // Next state advanced past New, with a future due date.
    expect(result.card.state).not.toBe(State.New);
    expect(result.card.reps).toBe(1);
    expect(result.card.due.getTime()).toBeGreaterThan(now.getTime());

    // Before/after snapshot is populated (§13.1).
    expect(result.snapshot.before.state).toBe(State.New);
    expect(result.snapshot.after).toEqual(result.card);
    expect(result.snapshot.before).not.toBe(result.snapshot.after);
    expect(result.log.rating).toBe(Rating.Good);
  });

  it('Again schedules sooner than Easy for the same card', () => {
    const now = new Date('2026-05-31T12:00:00.000Z');
    const card = newCard(now);
    const again = rateCard(card, Rating.Again, now).card;
    const easy = rateCard(card, Rating.Easy, now).card;
    expect(again.due.getTime()).toBeLessThan(easy.due.getTime());
  });

  it('does not mutate the input card', () => {
    const now = new Date('2026-05-31T12:00:00.000Z');
    const card = newCard(now);
    const before = { ...card };
    rateCard(card, Rating.Hard, now);
    expect(card).toEqual(before);
  });

  it('toCardStateRecord caches due/state/lastReview from the card', () => {
    const now = new Date('2026-05-31T12:00:00.000Z');
    const next = rateCard(newCard(now), Rating.Good, now).card;
    const record = toCardStateRecord('word:42:recognition', next, now);
    expect(record.id).toBe('word:42:recognition');
    expect(record.due).toEqual(next.due);
    expect(record.state).toBe(next.state);
    expect(record.lastReview).toEqual(next.last_review);
    expect(record.updatedAt).toEqual(now);
  });

  describe('invalid input handling', () => {
    it('isGrade rejects Manual and garbage ratings', () => {
      expect(isGrade(Rating.Good)).toBe(true);
      expect(isGrade(Rating.Again)).toBe(true);
      expect(isGrade(Rating.Manual)).toBe(false);
      expect(isGrade(99)).toBe(false);
      expect(isGrade(undefined)).toBe(false);
      expect(isGrade('Good')).toBe(false);
    });

    it('rateCard throws a RangeError on an invalid rating instead of crashing', () => {
      const card = newCard();
      // Deliberately feed invalid values to exercise the runtime guard. Cast via
      // `unknown` (with no type-directive of any kind) so the call still compiles.
      expect(() => rateCard(card, 99 as unknown as Grade)).toThrow(RangeError);
      expect(() => rateCard(card, Rating.Manual as unknown as Grade)).toThrow(
        /invalid rating/,
      );
    });
  });
});

describe('fsrs <-> cardStates persistence (fake-indexeddb)', () => {
  beforeEach(async () => {
    await db.open();
  });
  afterEach(async () => {
    await db.cardStates.clear();
  });

  it('persists and reads back a rated card via the helper', async () => {
    const now = new Date('2026-05-31T12:00:00.000Z');
    const id = 'word:1:recognition';
    const initial = toCardStateRecord(id, newCard(now), now);
    await db.cardStates.put(initial);

    const stored = await db.cardStates.get(id);
    expect(stored).toBeDefined();

    const { record, snapshot } = rateCardStateRecord(stored!, Rating.Good, now);
    await db.cardStates.put(record);

    const updated = await db.cardStates.get(id);
    expect(updated?.state).not.toBe(State.New);
    expect(updated?.due).toBeInstanceOf(Date);
    expect(updated?.card.reps).toBe(1);
    // Snapshot captured the pre-rating (New) state for telemetry.
    expect(snapshot.before.state).toBe(State.New);
    expect(snapshot.after.state).toBe(updated?.state);
  });

  it('queries due cards via the due index', async () => {
    const now = new Date('2026-05-31T12:00:00.000Z');
    await db.cardStates.bulkPut([
      toCardStateRecord('a', newCard(now), now),
      toCardStateRecord('b', rateCard(newCard(now), Rating.Easy, now).card, now),
    ]);
    const soon = new Date(now.getTime() + 60 * 1000);
    const due = await db.cardStates.where('due').belowOrEqual(soon).toArray();
    // The freshly-created New card 'a' is due ~now; the Easy card 'b' is far in
    // the future. The index MUST include 'a' and EXCLUDE 'b' — asserting the
    // exclusion is what proves the due index actually filters by date (a broken
    // or missing index that returned all rows would fail here).
    const ids = due.map((r) => r.id);
    expect(ids).toContain('a');
    expect(ids).not.toContain('b');
    expect(ids).toEqual(['a']);
  });
});
