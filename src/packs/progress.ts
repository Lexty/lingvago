import type { AttemptRecord } from '../db/index.ts';
import { recordDrillAttempt } from '../modes/shared/index.ts';
import type { CheckOutcome } from './check.ts';
import type { Pack, PackExercise, PackGroup } from './types.ts';

/** Mode id used across the attempt log for authored pack exercises. */
export const PACK_MODE_ID = 'pack';
/** Generator class: authored by hand, not generated. */
export const PACK_GENERATOR_CLASS = 'authored';

export interface PackAttemptInput {
  sessionId: string;
  pack: Pack;
  group: PackGroup;
  exercise: PackExercise;
  userAnswer: string;
  outcome: CheckOutcome;
  responseMs?: number;
  ts?: Date;
}

/**
 * Persist one attempt at an authored exercise. Only `correct` counts as
 * correct; an accent slip is logged as incorrect with `errorType: 'accent'`, so
 * the log can tell "wrong words" from "right words, wrong spelling".
 */
export async function recordPackAttempt(input: PackAttemptInput): Promise<number> {
  const { sessionId, pack, group, exercise, userAnswer, outcome, responseMs } = input;
  const skill = `${PACK_MODE_ID}:${pack.id}`;
  const attempt: AttemptRecord = {
    sessionId,
    ts: input.ts ?? new Date(),
    modeId: PACK_MODE_ID,
    skill,
    subskill: group.id,
    level: group.kind,
    generatorClass: PACK_GENERATOR_CLASS,
    channel: 'production',
    taskId: exercise.id,
    ruleRef: group.ruleId,
    prompt: exercise.prompt ?? exercise.cue?.en,
    userAnswer,
    correctAnswer: exercise.answer,
    correct: outcome === 'correct',
    errorType: outcome === 'accent' ? 'accent' : undefined,
    responseMs,
  };
  return recordDrillAttempt(attempt, { skillId: skill, subskillId: group.id });
}
