// Exam-eligibility filter (SPEC §6.5 content-QA gate / T8 AC3).
//
// A verb may appear in a generated exam/production session ONLY when its present
// forms come from a TRUSTED source:
//   - it is REGULAR with a rule-eligible group (-ar / -er / -ir), OR
//   - it has a VERIFIED present table (from the verbs_teacher handout).
//
// Everything else is EXCLUDED and must never surface in a session, and an exam
// request for its form must REFUSE rather than emit an unverified guess:
//   - `needsTableReview === true` (9 verbs flagged for review), OR
//   - any verb WITHOUT a verified table that is not a rule-eligible regular verb
//     (e.g. `regular === false` / unknown-`regular` with no table, the `-or`
//     group without a table).

import { isRegularGroup, type VerbData } from './conjugate.ts';

/**
 * Is `verb` eligible for an exam/production session? (SPEC §6.5.)
 *
 * Eligible ⇔ (verified table present) OR (regular + rule-eligible group), AND
 * NOT flagged `needsTableReview`. Reflexive (`-se`) verbs have no rule path and
 * are eligible only via a verified table.
 */
export function isExamEligible(verb: VerbData): boolean {
  if (verb.needsTableReview === true) {
    return false;
  }
  if (verb.table) {
    return true;
  }
  return verb.regular === true && isRegularGroup(verb.group) && !verb.infinitive.includes('-');
}

/** Keep only the exam-eligible verbs from `verbs` (the §6.5 gate, applied). */
export function filterExamEligible(verbs: readonly VerbData[]): VerbData[] {
  return verbs.filter(isExamEligible);
}
