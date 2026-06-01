// Mock review verdict + minimum-rule (MVP_PLAN WP-D / SPEC §9.1, AC5).
//
// PURE module. This is a THIN composition over WP-A — it does NOT reimplement
// the verdict/score logic. The verdict comes straight from WP-A
// `computeVerdict` against the stored thresholds; the «don't zero a group»
// minimum rule reuses WP-A `hasZeroedGroup` / `GROUPS`.

import {
  type GroupScores,
  type PassThreshold,
  type Verdict,
  computeVerdict,
  hasZeroedGroup,
} from '../../screens/survivalKit.ts';

/** Outcome of the end-of-run review (AC5/AC6). */
export interface MockReview {
  /** Verdict from WP-A `computeVerdict` over the saved thresholds. */
  verdict: Verdict;
  /**
   * `true` when ANY group was entered as 0 — surfaces the «не обнули группу»
   * warning on the review screen. A still-`null` (un-entered) group is NOT a
   * zero, so it does not trigger the warning.
   */
  zeroedGroupWarning: boolean;
}

/**
 * Evaluate the entered scores for the review phase: the WP-A verdict plus the
 * per-group «don't zero a group» minimum warning. Pure; no duplication of the
 * verdict rule.
 */
export function reviewMock(
  scores: GroupScores,
  threshold: PassThreshold,
): MockReview {
  return {
    verdict: computeVerdict(scores, threshold),
    zeroedGroupWarning: hasZeroedGroup(scores),
  };
}
