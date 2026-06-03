// Preposition mastery sub-axis naming (SPEC §4.6 simple mastery, contract Task 3
// «sub-skills tempo/movimento/lugar, by level»). PURE: this module only NAMES the
// skill/subskill axes a later mastery roll-up (WP-C Task 4 / AC8) will persist —
// it performs NO DB writes itself, so Task 3 stays generator-only and the screen
// layer owns the `attempts`/`skillMastery` writes (mirroring the gender subskill
// helper).

import type { AttemptRecord } from '../../db/index.ts';
import { recordDrillAttempt } from '../shared/index.ts';
import type { PrepCategory } from './eligibility.ts';
import type { PrepositionItem } from './session.ts';

/** Mode id used across attempts / mastery for the Preposition drill. */
export const PREP_MODE_ID = 'preposition';
/** Skill id (the §13.1 `skill` axis) for the Preposition drill. */
export const PREP_SKILL = 'preposition';
/** Deterministic generator class (SPEC §6.1) — also tagged on each attempt. */
export const PREP_GENERATOR_CLASS = 'deterministic-seeded';

/**
 * §AC6 category → existing WP-B reference card id:
 *   tempo     → ref-prep-tempo
 *   lugar     → ref-prep-lugar
 *   movimento → ref-prep-a-para   (the «a/para» movement card)
 * Every target is a real card id in the shipped bundle (asserted by the
 * deep-link test); the mapping never invents an id.
 */
const REFERENCE_BY_CATEGORY: Record<PrepCategory, string> = {
  tempo: 'ref-prep-tempo',
  lugar: 'ref-prep-lugar',
  movimento: 'ref-prep-a-para',
};

/**
 * Mastery subskill for an item — keyed by the CATEGORY sub-skill (tempo /
 * movimento / lugar) and the §4.8 LEVEL, so accuracy is tracked per category and
 * per level:
 *   `preposition-tempo-L1`
 *   `preposition-movimento-L2`
 *   `preposition-lugar-L3`
 */
export function subskillFor(item: PrepositionItem): string {
  return `${PREP_SKILL}-${item.category}-${item.level}`;
}

/**
 * The §AC6 feedback deep-link target for a Preposition item: the reference card
 * for its category. Returns the bare WP-B route id; the screen wraps it as
 * `/reference/:id`.
 *
 * Special case — the **casa** idiom (`de casa`, `a casa`, `para casa`): casa is
 * used WITHOUT an article, so the answer is the bare preposition (`de`, not the
 * `da` contraction a learner expects). That exception is only explained on the
 * `ref-prep-a-para` card («sair de casa»), so ANY item whose example involves
 * `casa` deep-links there regardless of its category — otherwise a casa item that
 * happened to land in the `tempo`/`lugar` bucket would open a card that never
 * explains why `de casa` ≠ `da casa`.
 */
export function referenceIdFor(item: PrepositionItem): string {
  if (/\bcasa\b/i.test(item.example)) {
    return 'ref-prep-a-para';
  }
  return REFERENCE_BY_CATEGORY[item.category];
}

/** A single graded Preposition attempt to persist (§13.1 / §7.2). */
export interface PrepAttemptInput {
  sessionId: string;
  item: PrepositionItem;
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
 * Persist one Preposition attempt: builds the domain-specific `AttemptRecord`
 * (skill / subskill / channel / sourceRef) and delegates the transactional write
 * + `skillMastery` fold to the shared `recordDrillAttempt`, so the attempt log
 * and the mastery aggregate never diverge and the roll-up math lives in ONE place.
 *
 * ADDITIVE §7.2: writes ONLY the progress stores of `lingvago2`; the read-only
 * content stores, the DB name, and the schema are untouched. Returns the new
 * mastery score for the affected subskill.
 */
export async function recordPrepositionAttempt(input: PrepAttemptInput): Promise<number> {
  const { sessionId, item, userAnswer, correct, channel, responseMs } = input;
  const ts = input.ts ?? new Date();
  const subskill = subskillFor(item);

  const attempt: AttemptRecord = {
    sessionId,
    ts,
    modeId: PREP_MODE_ID,
    skill: PREP_SKILL,
    subskill,
    level: item.level,
    generatorClass: PREP_GENERATOR_CLASS,
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

  return recordDrillAttempt(attempt, { skillId: PREP_SKILL, subskillId: subskill });
}
