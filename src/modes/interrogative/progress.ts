// Interrogative mastery sub-axis naming + the additive §7.2 progress write (AC7).
// Mirrors `src/modes/possessive/progress.ts`: the screen layer hands a graded
// item here, and the SAME shared `recordDrillAttempt` builds the §13.1
// `AttemptRecord` and folds the `skillMastery` roll-up in a SINGLE transactional
// round-trip — so the attempt log and the mastery aggregate can never diverge.
//
// Also the DB-backed source for a session: `loadInterrogativesFromDb` reads the
// READ-ONLY `interrogatives` content store and hands it to the seeded generator
// (mirrors possData.loadPossessivesFromDb). The §6.5 eligibility gate is applied
// later by the generator, not here.

import { db } from '../../db/index.ts';
import type { AttemptRecord, InterrogativeRecord } from '../../db/index.ts';
import { recordDrillAttempt } from '../shared/index.ts';
import type { InterrogativeItem } from './session.ts';

/** Mode id used across attempts / mastery for the Interrogative drill. */
export const INT_MODE_ID = 'interrogative';
/** Skill id (the §13.1 `skill` axis) for the Interrogative drill. */
export const INT_SKILL = 'interrogative';
/** Deterministic generator class (SPEC §6.1) — also tagged on each attempt. */
export const INT_GENERATOR_CLASS = 'deterministic-seeded';

/**
 * The single authored reference card for the Interrogative drill: the 17-row
 * question-word table + the 6 rules. Every item deep-links here (there is one
 * card, unlike preposition's per-category cards).
 */
export const INT_REFERENCE_ID = 'ref-interrogative';

/**
 * Read the read-only `interrogatives` content store. Returns `[]` when content
 * has not been loaded yet, so the screen renders a graceful empty state rather
 * than crashing (error path). The §6.5 eligibility gate is applied later by the
 * session generator, not here.
 */
export async function loadInterrogativesFromDb(): Promise<InterrogativeRecord[]> {
  return db.interrogatives.toArray();
}

/**
 * Mastery subskill for an item — keyed by the semantic CATEGORY sub-axis and the
 * §4.8 LEVEL, so accuracy is tracked per question-word family and per level:
 *   `interrogative-who-L1`
 *   `interrogative-where_to-L2`
 *   `interrogative-how_much-L3`
 */
export function subskillFor(item: InterrogativeItem): string {
  return `${INT_SKILL}-${item.category}-${item.level}`;
}

/**
 * The §AC6 feedback deep-link target for an Interrogative item: always the single
 * authored `ref-interrogative` card (table + the 6 rules). Unlike preposition
 * (per-category cards), every interrogative item maps to the ONE card, so the
 * item argument is accepted (to mirror the preposition signature the screen/e2e
 * use) but does not vary the target. Returns the bare card id; the screen wraps
 * it as an in-drill overlay.
 */
export function referenceIdFor(item: InterrogativeItem): string {
  void item;
  return INT_REFERENCE_ID;
}

/** A single graded Interrogative attempt to persist (§13.1 / §7.2). */
export interface IntAttemptInput {
  sessionId: string;
  item: InterrogativeItem;
  userAnswer: string;
  correct: boolean;
  /**
   * The §13.1 channel: `recognition` for an MC item or `production` for a typed
   * item. Derived from `item.drill.mode` by the caller.
   */
  channel: AttemptRecord['channel'];
  responseMs?: number;
  ts?: Date;
}

/**
 * Persist one Interrogative attempt: builds the domain-specific `AttemptRecord`
 * (skill / subskill / channel / sourceRef) and delegates the transactional write
 * + `skillMastery` fold to the shared `recordDrillAttempt`, so the attempt log
 * and the mastery aggregate never diverge and the roll-up math lives in ONE place.
 *
 * ADDITIVE §7.2: writes ONLY the progress stores of `lingvago2`; the read-only
 * content stores, the DB name, and the schema are untouched. Returns the new
 * mastery score for the affected subskill.
 */
export async function recordInterrogativeAttempt(input: IntAttemptInput): Promise<number> {
  const { sessionId, item, userAnswer, correct, channel, responseMs } = input;
  const ts = input.ts ?? new Date();
  const subskill = subskillFor(item);

  const attempt: AttemptRecord = {
    sessionId,
    ts,
    modeId: INT_MODE_ID,
    skill: INT_SKILL,
    subskill,
    level: item.level,
    generatorClass: INT_GENERATOR_CLASS,
    channel,
    taskId: item.id,
    sourceRef: item.drill.sourceRef.id,
    prompt: item.drill.prompt,
    shownOptions:
      item.drill.mode === 'mc' ? item.drill.options.map((o) => o.surface) : undefined,
    userAnswer,
    correctAnswer: item.drill.answer,
    correct,
    responseMs,
  };

  return recordDrillAttempt(attempt, { skillId: INT_SKILL, subskillId: subskill });
}
