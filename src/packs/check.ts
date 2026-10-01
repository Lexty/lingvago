// Answer check for authored exercises.
//
// Unlike the older single-word drills (which fold accents away), a phrase is
// checked WITH its diacritics: `e` / `é`, `a` / `à`, `tem` / `têm` are different
// words. A learner who has the right words but a missing or wrong accent is
// told exactly that, instead of being marked plainly right or plainly wrong.

import { stripDiacritics } from '../modes/shared/index.ts';
import type { PackExercise } from './types.ts';

/** The three outcomes of checking an authored answer. */
export type CheckOutcome = 'correct' | 'accent' | 'wrong';

/**
 * Comparison key: case, spacing and sentence-final punctuation do not matter;
 * every letter, accent and function word does.
 */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[.!?…]+\s*$/u, '')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every answer an exercise accepts: the model answer first, then variants. */
export function acceptedAnswers(exercise: PackExercise): string[] {
  return [exercise.answer, ...(exercise.accept ?? [])];
}

/**
 * Check `userAnswer` against an exercise.
 *  - `correct` — equals an accepted answer, accents included;
 *  - `accent`  — the letters are right, an accent is missing or wrong;
 *  - `wrong`   — anything else, including an empty answer.
 */
export function checkExercise(userAnswer: string, exercise: PackExercise): CheckOutcome {
  const given = normalizeAnswer(userAnswer);
  if (given === '') {
    return 'wrong';
  }
  const accepted = acceptedAnswers(exercise).map(normalizeAnswer);
  if (accepted.includes(given)) {
    return 'correct';
  }
  const folded = stripDiacritics(given);
  if (accepted.some((answer) => stripDiacritics(answer) === folded)) {
    return 'accent';
  }
  return 'wrong';
}
