// NumbersMode progress persistence (SPEC §7.2 read-write progress, §13.1
// attempts log; AC6). ADDITIVE: writes ONLY the §7.2 progress stores
// (`attempts`, `skillMastery`) of the existing `lingvago2` database — it does
// NOT touch the read-only §7.1 content stores, the DB name, or the schema.
//
// Mastery here is the simple AC6 roll-up (running share-correct per subskill);
// the rich mastery engine is a later WP. Subskills mirror the numeral kind:
// `numbers-cardinal` / `numbers-ordinal`.

import { db } from '../../db/index.ts';
import type { AttemptRecord } from '../../db/index.ts';
import { recordDrillAttempt } from '../shared/index.ts';
import type { NumberItem } from './session.ts';

/** Mode id used across attempts / mastery for the numbers drill. */
export const NUMBERS_MODE_ID = 'numbers';
/** Skill id (the §13.1 `skill` axis) for the numbers drill. */
export const NUMBERS_SKILL = 'numbers';
/** Deterministic generator class (SPEC §6.1) — also the AttemptRecord level. */
export const NUMBERS_GENERATOR_CLASS = 'deterministic-seeded';
/**
 * Concrete, fixed `AttemptRecord.level` for numbers attempts (plan-review note
 * 1: `level` is REQUIRED and must never be left unset). Numbers is a single
 * generative curve rather than a graded card level, so it ships one constant.
 */
export const NUMBERS_LEVEL = 'numbers';

/** Subskill (mastery axis) for a given numeral kind. */
export function subskillFor(kind: NumberItem['kind']): string {
  return kind === 'ordinal' ? 'numbers-ordinal' : 'numbers-cardinal';
}

/** A single graded attempt to persist. */
export interface NumbersAttemptInput {
  sessionId: string;
  item: NumberItem;
  userAnswer: string;
  correct: boolean;
  responseMs?: number;
  ts?: Date;
}

/**
 * Persist one numbers attempt: builds its `AttemptRecord` and delegates the
 * transactional write + `skillMastery` roll-up to the shared `recordDrillAttempt`
 * so the log and the aggregate never diverge.
 *
 * Returns the new mastery score for the affected subskill (for the caller's UI,
 * if any). Never silently swallows — the screen wraps the call in try/catch.
 */
export async function recordNumbersAttempt(
  input: NumbersAttemptInput,
): Promise<number> {
  const { sessionId, item, userAnswer, correct, responseMs } = input;
  const ts = input.ts ?? new Date();
  const subskill = subskillFor(item.kind);

  const attempt: AttemptRecord = {
    sessionId,
    ts,
    modeId: NUMBERS_MODE_ID,
    skill: NUMBERS_SKILL,
    subskill,
    level: NUMBERS_LEVEL,
    generatorClass: NUMBERS_GENERATOR_CLASS,
    channel: 'production',
    taskId: item.id,
    prompt: item.prompt,
    userAnswer,
    correctAnswer: item.expected,
    correct,
    responseMs,
  };

  return recordDrillAttempt(attempt, { skillId: NUMBERS_SKILL, subskillId: subskill });
}

/** Read the current mastery roll-up for a numeral subskill (0 if none yet). */
export async function readNumbersMastery(
  kind: NumberItem['kind'],
): Promise<{ mastery: number; attempts: number }> {
  const id = `${NUMBERS_SKILL}:${subskillFor(kind)}`;
  const row = await db.skillMastery.get(id);
  return { mastery: row?.mastery ?? 0, attempts: row?.attempts ?? 0 };
}
