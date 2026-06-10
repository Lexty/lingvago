// Possessive mastery sub-axis naming + the additive §7.2 progress write (AC7).
// Mirrors `src/modes/preposition/progress.ts`: the screen layer hands a graded
// item here, and the SAME shared `recordDrillAttempt` builds the §13.1
// `AttemptRecord` and folds the `skillMastery` roll-up in a SINGLE transactional
// round-trip — so the attempt log and the mastery aggregate can never diverge.
//
// Also the DB-backed source for a session: `loadPossessivesFromDb` reads the
// READ-ONLY `possessives` content store and hands it to the seeded generator
// (mirrors prepData.loadPrepositionsFromDb). The §6.5 eligibility gate is applied
// later by the generator, not here.

import { db } from '../../db/index.ts';
import type { AttemptRecord, PossessiveRecord } from '../../db/index.ts';
import { recordDrillAttempt } from '../shared/index.ts';
import type { PossessiveItem } from './session.ts';

/** Mode id used across attempts / mastery for the Possessive drill. */
export const POSS_MODE_ID = 'possessive';
/** Skill id (the §13.1 `skill` axis) for the Possessive drill. */
export const POSS_SKILL = 'possessive';
/** Deterministic generator class (SPEC §6.1) — also tagged on each attempt. */
export const POSS_GENERATOR_CLASS = 'deterministic-seeded';

/**
 * The single authored reference card for the Possessive drill: the paradigm
 * table + the 3 core rules. Every item deep-links here (there is one card, unlike
 * preposition's per-category cards).
 */
export const POSS_REFERENCE_ID = 'ref-possessive';

/**
 * Read the read-only `possessives` content store. Returns `[]` when content has
 * not been loaded yet, so the screen renders a graceful empty state rather than
 * crashing (error path). The §6.5 eligibility gate is applied later by the
 * session generator, not here.
 */
export async function loadPossessivesFromDb(): Promise<PossessiveRecord[]> {
  return db.possessives.toArray();
}

/**
 * Mastery subskill for an item — keyed by the KIND + PERSON sub-axis and the
 * §4.8 LEVEL, so accuracy is tracked per family/person and per level:
 *   `possessive-determiner-eu-L1`
 *   `possessive-dele-ele_ela_voce-L2`
 *   `possessive-determiner-nos-L3`
 *
 * Per AC5, L3 is the CONTEXT-ONLY tier (the hard dialogue items): so the trailing
 * `-L3` suffix is itself the context-attempt marker — no separate `context`
 * key segment is needed, and any subskill ending in `-L3` isolates context
 * attempts.
 */
export function subskillFor(item: PossessiveItem): string {
  return `${POSS_SKILL}-${item.kind}-${item.person}-${item.level}`;
}

/**
 * The §AC6 feedback deep-link target for a Possessive item: always the single
 * authored `ref-possessive` card (paradigm + the 3 rules). Unlike preposition
 * (per-category cards), every possessive item maps to the ONE card, so the item
 * argument is accepted (to mirror the preposition signature the screen/e2e use)
 * but does not vary the target. Returns the bare card id; the screen wraps it as
 * an in-drill overlay.
 */
export function referenceIdFor(item: PossessiveItem): string {
  void item;
  return POSS_REFERENCE_ID;
}

/** A single graded Possessive attempt to persist (§13.1 / §7.2). */
export interface PossAttemptInput {
  sessionId: string;
  item: PossessiveItem;
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
 * Persist one Possessive attempt: builds the domain-specific `AttemptRecord`
 * (skill / subskill / channel / sourceRef) and delegates the transactional write
 * + `skillMastery` fold to the shared `recordDrillAttempt`, so the attempt log
 * and the mastery aggregate never diverge and the roll-up math lives in ONE place.
 *
 * ADDITIVE §7.2: writes ONLY the progress stores of `lingvago2`; the read-only
 * content stores, the DB name, and the schema are untouched. Returns the new
 * mastery score for the affected subskill.
 */
export async function recordPossessiveAttempt(input: PossAttemptInput): Promise<number> {
  const { sessionId, item, userAnswer, correct, channel, responseMs } = input;
  const ts = input.ts ?? new Date();
  const subskill = subskillFor(item);

  const attempt: AttemptRecord = {
    sessionId,
    ts,
    modeId: POSS_MODE_ID,
    skill: POSS_SKILL,
    subskill,
    level: item.level,
    generatorClass: POSS_GENERATOR_CLASS,
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

  return recordDrillAttempt(attempt, { skillId: POSS_SKILL, subskillId: subskill });
}
