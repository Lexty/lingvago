// ConjugationMode progress persistence (SPEC §7.2 read-write progress, §13.1
// attempts log; T8 Task 3 / AC8). ADDITIVE: writes ONLY the §7.2 progress
// stores (`attempts`, `skillMastery`) of the existing `lingvago2` database — it
// does NOT touch the read-only §7.1 content stores, the DB name, or the schema.
//
// Mastery here is the simple AC8 roll-up (running share-correct per subskill);
// the rich mastery engine is a later WP. The subskill mixes the verb's
// conjugation GROUP with the TASK TYPE (contract: «subskill по группе/типу»),
// e.g. `conjugation--ar-fill-form` / `conjugation--ir-assemble-table`, so a
// learner's accuracy is tracked per group and per task kind.

import type { AttemptRecord } from '../../db/index.ts';
import { recordDrillAttempt } from '../shared/index.ts';
import type { ConjugationItem } from './session.ts';

/** Mode id used across attempts / mastery for the conjugation drill. */
export const CONJUGATION_MODE_ID = 'conjugation';
/** Skill id (the §13.1 `skill` axis) for the conjugation drill (AC8). */
export const CONJUGATION_SKILL = 'conjugation';
/** Deterministic generator class (SPEC §6.1) — also the AttemptRecord level. */
export const CONJUGATION_GENERATOR_CLASS = 'deterministic-seeded';
/**
 * Concrete, fixed `AttemptRecord.level` for conjugation attempts (the `level`
 * axis is REQUIRED and must never be left unset). Conjugation is a single
 * generative present-tense curve rather than a graded card level, so it ships
 * one constant — mirroring the NumbersMode pattern.
 */
export const CONJUGATION_LEVEL = 'present';

/** The group an item drills, used as part of the mastery subskill. */
function groupOf(item: ConjugationItem): string {
  return item.source.derivation === 'rule' ? item.source.infinitive.slice(-2) : 'table';
}

/** Subskill (mastery axis) for an item: keyed by group AND task type (AC8). */
export function subskillFor(item: ConjugationItem): string {
  return `${CONJUGATION_SKILL}-${groupOf(item)}-${item.type}`;
}

/** Flatten an item's reference answer to the stored `correctAnswer` string. */
function correctAnswerFor(item: ConjugationItem): string {
  if (item.type === 'fill-form') {
    return item.expected;
  }
  // assemble-table: persons in canonical order, joined for an objective log.
  return item.persons.map((p) => item.expected[p]).join(' / ');
}

/** A single graded attempt to persist. */
export interface ConjugationAttemptInput {
  sessionId: string;
  item: ConjugationItem;
  userAnswer: string;
  correct: boolean;
  responseMs?: number;
  ts?: Date;
}

/**
 * Persist one conjugation attempt: builds its `AttemptRecord` and delegates the
 * transactional write + `skillMastery` roll-up to the shared `recordDrillAttempt`
 * so the log and the aggregate never diverge.
 *
 * Returns the new mastery score for the affected subskill. Never silently
 * swallows — the screen wraps the call in try/catch so a telemetry failure can
 * never break the drill.
 */
export async function recordConjugationAttempt(
  input: ConjugationAttemptInput,
): Promise<number> {
  const { sessionId, item, userAnswer, correct, responseMs } = input;
  const ts = input.ts ?? new Date();
  const subskill = subskillFor(item);

  const attempt: AttemptRecord = {
    sessionId,
    ts,
    modeId: CONJUGATION_MODE_ID,
    skill: CONJUGATION_SKILL,
    subskill,
    level: CONJUGATION_LEVEL,
    generatorClass: CONJUGATION_GENERATOR_CLASS,
    channel: 'production',
    taskId: item.id,
    sourceRef: item.source.verbId,
    prompt: item.prompt,
    userAnswer,
    correctAnswer: correctAnswerFor(item),
    correct,
    responseMs,
  };

  return recordDrillAttempt(attempt, {
    skillId: CONJUGATION_SKILL,
    subskillId: subskill,
  });
}
