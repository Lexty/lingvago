// Shared progress writer for the production-first drills (SPEC §7.2 read-write
// progress, §13.1 attempts log). The gender / preposition (and, since this
// extraction, numbers / conjugation) drills all persist ONE graded attempt and
// fold it into the running `skillMastery` roll-up for its subskill — in a single
// transaction so the log and the aggregate never diverge. Each mode builds its
// own domain-specific `AttemptRecord` (skill / subskill / channel / sourceRef),
// then hands it here so the transaction + mastery math live in exactly ONE
// place (a mastery-formula fix is made once, not per-mode).
//
// ADDITIVE §7.2: writes ONLY the progress stores (`attempts`, `skillMastery`) of
// the existing `lingvago2` database — it does NOT touch the read-only §7.1
// content stores, the DB name, or the schema.

import { db } from '../../db/index.ts';
import type { AttemptRecord } from '../../db/index.ts';

/** The identity of the `skillMastery` row an attempt rolls into. */
export interface MasteryKey {
  /** The §13.1 `skill` axis (e.g. `gender-article`, `preposition`). */
  skillId: string;
  /** The mastery subskill (e.g. `gender-article-definite-L1`). */
  subskillId: string;
}

/**
 * Persist one already-built `AttemptRecord` to `attempts` AND fold it into the
 * running `skillMastery` roll-up for `masteryKey` — in a single transaction so
 * the log and the aggregate never diverge.
 *
 * The mastery score is the simple running share-correct: it reconstructs the
 * prior correct-count from `mastery × attempts` (rounded), increments, and
 * recomputes `nextCorrect / nextAttempts`. The `skillMastery` row id is
 * `${skillId}:${subskillId}`. Returns the new mastery score for the subskill.
 */
export async function recordDrillAttempt(
  attempt: AttemptRecord,
  masteryKey: MasteryKey,
): Promise<number> {
  const { skillId, subskillId } = masteryKey;
  const masteryId = `${skillId}:${subskillId}`;

  return db.transaction('rw', db.attempts, db.skillMastery, async () => {
    await db.attempts.add(attempt);

    const prev = await db.skillMastery.get(masteryId);
    const prevAttempts = prev?.attempts ?? 0;
    const prevCorrect = Math.round((prev?.mastery ?? 0) * prevAttempts);
    const nextAttempts = prevAttempts + 1;
    const nextCorrect = prevCorrect + (attempt.correct ? 1 : 0);
    const nextMastery = nextCorrect / nextAttempts;

    await db.skillMastery.put({
      id: masteryId,
      skillId,
      subskillId,
      mastery: nextMastery,
      attempts: nextAttempts,
      updatedAt: attempt.ts,
    });

    return nextMastery;
  });
}
