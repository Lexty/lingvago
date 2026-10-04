import { db } from '../db/index.ts';
import type { AttemptRecord } from '../db/index.ts';
import { foldIntoMastery } from '../modes/shared/index.ts';
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
  /** `revealed`: the learner chose «show the answer» instead of answering. */
  outcome: CheckOutcome | 'revealed';
  /** Help used before answering (see AttemptRecord.support). */
  support?: 'gloss';
  responseMs?: number;
  ts?: Date;
}

/**
 * Persist one attempt at an authored exercise and return its id. Only
 * `correct` counts as correct; an accent slip is logged as incorrect with
 * `errorType: 'accent'`, so the log can tell "wrong words" from "right words,
 * wrong spelling".
 *
 * Help keeps an attempt out of the mastery roll-up, which counts only answers
 * given alone: an answer after the word meanings were opened is logged with
 * `support: 'gloss'`, and «show the answer» is logged as viewed
 * (`support: 'answerShown'`). A viewed item is stored with `correct: false`
 * (the field is required), so any reader of the log must look at `support`
 * before counting it as a wrong answer.
 */
export async function recordPackAttempt(input: PackAttemptInput): Promise<number> {
  const { sessionId, pack, group, exercise, userAnswer, outcome, responseMs } = input;
  const revealed = outcome === 'revealed';
  const support = revealed ? 'answerShown' : input.support;
  const skill = `${PACK_MODE_ID}:${pack.id}`;
  const attempt: AttemptRecord = {
    sessionId,
    ts: input.ts ?? new Date(),
    modeId: PACK_MODE_ID,
    skill,
    subskill: group.id,
    level: group.kind,
    generatorClass: PACK_GENERATOR_CLASS,
    channel: group.kind === 'choose' ? 'recognition' : 'production',
    taskId: exercise.id,
    ruleRef: group.ruleId,
    prompt: exercise.prompt ?? exercise.cue?.en,
    userAnswer,
    correctAnswer: exercise.answer,
    correct: outcome === 'correct',
    errorType: outcome === 'accent' ? 'accent' : undefined,
    responseMs,
    ...(support ? { support } : {}),
  };
  return db.transaction('rw', db.attempts, db.skillMastery, async () => {
    const id = await db.attempts.add(attempt);
    if (!support) await foldIntoMastery(attempt, { skillId: skill, subskillId: group.id });
    return id;
  });
}

/**
 * The learner says a wrong answer came from not understanding the sentence.
 * The answer stays as it was (still not correct); the note is added to it.
 */
export async function recordPackSelfReport(attemptId: number): Promise<void> {
  await db.attempts.update(attemptId, { selfReport: 'didNotUnderstand' });
}
