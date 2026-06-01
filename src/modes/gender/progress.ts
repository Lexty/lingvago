// GenderArticle mastery sub-axis naming (SPEC §4.6 simple mastery, contract Task
// 2 «mastery subskills, by level/contraction»). PURE: this module only NAMES the
// skill/subskill axes a later mastery roll-up (WP-C Task 4 / AC8) will persist —
// it performs NO DB writes itself, so Task 2 stays generator-only and the screen
// layer owns the `attempts`/`skillMastery` writes (mirroring how the conjugation
// subskill helper is a pure function consumed by its progress writer).

import type { AttemptRecord } from '../../db/index.ts';
import { recordDrillAttempt } from '../shared/index.ts';
import type { GenderItem } from './session.ts';

/** Mode id used across attempts / mastery for the GenderArticle drill. */
export const GENDER_MODE_ID = 'gender';
/** Skill id (the §13.1 `skill` axis) for the GenderArticle drill. */
export const GENDER_SKILL = 'gender-article';
/** Deterministic generator class (SPEC §6.1) — also tagged on each attempt. */
export const GENDER_GENERATOR_CLASS = 'deterministic-seeded';

/**
 * The single existing WP-B reference card the GenderArticle feedback deep-links
 * to (§AC6: gender → ref-genero-artigo). Pinned here so the screen never invents
 * an id; the constant is asserted to be a real card id by the deep-link test.
 */
export const GENDER_REFERENCE_ID = 'ref-genero-artigo';

/**
 * Mastery subskill for an item — keyed by the article KIND and the §4.8 LEVEL,
 * and (for contractions) by the PREPOSITION, so accuracy is tracked per article
 * form, per level, and per contraction family (de/em/a):
 *   `gender-article-definite-L1`
 *   `gender-article-indefinite-L2`
 *   `gender-article-contraction-de-L3`
 */
export function subskillFor(item: GenderItem): string {
  const base = `${GENDER_SKILL}-${item.kind}`;
  const withPrep = item.kind === 'contraction' && item.prep ? `${base}-${item.prep}` : base;
  return `${withPrep}-${item.level}`;
}

/**
 * The §AC6 feedback deep-link target for the GenderArticle drill: always the
 * single gender/article reference card (every gender item maps to the same card,
 * unlike preposition which maps by category). Returns the bare WP-B route id; the
 * screen wraps it as `/reference/:id`.
 */
export function referenceIdFor(): string {
  return GENDER_REFERENCE_ID;
}

/** A single graded GenderArticle attempt to persist (§13.1 / §7.2). */
export interface GenderAttemptInput {
  sessionId: string;
  item: GenderItem;
  userAnswer: string;
  correct: boolean;
  /**
   * The §13.1 channel: `recognition` for an MC item (the learner picked an
   * option) or `production` for a typed item. Derived from `item.drill.mode` by
   * the caller and asserted here against the item's actual mode.
   */
  channel: AttemptRecord['channel'];
  responseMs?: number;
  ts?: Date;
}

/**
 * Persist one GenderArticle attempt: builds the domain-specific `AttemptRecord`
 * (skill / subskill / channel / sourceRef) and delegates the transactional write
 * + `skillMastery` fold to the shared `recordDrillAttempt`, so the attempt log
 * and the mastery aggregate never diverge and the roll-up math lives in ONE place.
 *
 * ADDITIVE §7.2: writes ONLY the progress stores of `lingvago2`; the read-only
 * content stores, the DB name, and the schema are untouched. Returns the new
 * mastery score for the affected subskill.
 */
export async function recordGenderAttempt(input: GenderAttemptInput): Promise<number> {
  const { sessionId, item, userAnswer, correct, channel, responseMs } = input;
  const ts = input.ts ?? new Date();
  const subskill = subskillFor(item);

  const attempt: AttemptRecord = {
    sessionId,
    ts,
    modeId: GENDER_MODE_ID,
    skill: GENDER_SKILL,
    subskill,
    level: item.level,
    generatorClass: GENDER_GENERATOR_CLASS,
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

  return recordDrillAttempt(attempt, { skillId: GENDER_SKILL, subskillId: subskill });
}
