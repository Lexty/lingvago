// Survival Kit domain logic (MVP_PLAN WP-A / SPEC §9.2–§9.3).
//
// PURE module: no React, no DB, no i18n. It models the manual exam mock-results
// table (4 groups × 0–50, the 4×50 model of SPEC §9.2) and the verdict rule.
//
// THE VERDICT RULE (MVP_PLAN WP-A, contract AC5) — unambiguous:
//  - An UNSET threshold is NEVER treated as a fail. The unset side is ignored.
//  - As soon as AT LEAST ONE threshold is set, the verdict is computed ONLY over
//    the set threshold(s): 'pass' iff every SET threshold is MET (inclusive >=),
//    otherwise 'risk'.
//  - When NO threshold is set at all → 'no-verdict': the UI shows the raw group
//    scores plus the «don't zero a group» warning, and NO pass/risk verdict.
//  - Threshold-met boundary is INCLUSIVE: a score that EQUALS its threshold MEETS
//    it (plan-review note 1).
//
// SPEC §16 hard non-goal: there is NO day-countdown anywhere in this module.

/** The four exam groups (Grupo I–IV), in exam order. */
export const GROUPS = ['I', 'II', 'III', 'IV'] as const;

/** A single exam group identifier. */
export type Group = (typeof GROUPS)[number];

/** Minimum/maximum points for one group (4×50 model, SPEC §9.2). */
export const GROUP_MIN = 0;
export const GROUP_MAX = 50;

/** Total exam maximum (4 groups × 50). */
export const TOTAL_MAX = GROUP_MAX * GROUPS.length; // 200

/**
 * Manual mock scores per group. A group is `null` when the user has not entered
 * a score for it yet (distinct from an explicit 0, which is a real—if alarming—
 * result that triggers the «don't zero a group» warning).
 */
export type GroupScores = Record<Group, number | null>;

/**
 * Pass thresholds (SPEC §9 / MVP_PLAN WP-A). Both default to `null` = unknown
 * («balance узнать у преподавателя»). `null` on either side is IGNORED by the
 * verdict rule — it is NEVER a fail.
 */
export interface PassThreshold {
  /** Total points required to pass, out of {@link TOTAL_MAX}. `null` = unknown. */
  totalPassPoints: number | null;
  /** Minimum points required per group, out of {@link GROUP_MAX}. `null` = unknown. */
  minGroupPoints: number | null;
}

/** Verdict outcome (AC5). */
export type Verdict = 'pass' | 'risk' | 'no-verdict';

/** An empty mock-results table (every group unset). */
export function emptyGroupScores(): GroupScores {
  return { I: null, II: null, III: null, IV: null };
}

/** Thresholds with both sides unset (the default `unknown`). */
export function emptyThreshold(): PassThreshold {
  return { totalPassPoints: null, minGroupPoints: null };
}

/**
 * Coerce arbitrary input into a valid 0–50 group score, or `null`.
 *
 * Used at the DB/UI boundary so a corrupt/garbage persisted value (NaN, a
 * string, out-of-range, fractional noise) degrades gracefully to `null`
 * (treated as "unset") instead of crashing the verdict/render path.
 * Empty string / undefined / null → `null` (cleared cell).
 */
export function coerceGroupScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  const rounded = Math.round(n);
  if (rounded < GROUP_MIN || rounded > GROUP_MAX) {
    return null;
  }
  return rounded;
}

/**
 * Coerce a threshold bound into a valid in-range integer, or `null` (= unknown).
 * `max` is the inclusive upper bound (TOTAL_MAX for total, GROUP_MAX per group).
 */
export function coerceThresholdValue(value: unknown, max: number): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  const rounded = Math.round(n);
  if (rounded < 0 || rounded > max) {
    return null;
  }
  return rounded;
}

/** Normalize an unknown persisted value into a well-formed GroupScores table. */
export function coerceGroupScores(value: unknown): GroupScores {
  const out = emptyGroupScores();
  if (value === null || typeof value !== 'object') {
    return out;
  }
  const bag = value as Record<string, unknown>;
  for (const g of GROUPS) {
    out[g] = coerceGroupScore(bag[g]);
  }
  return out;
}

/** Normalize an unknown persisted value into a well-formed PassThreshold. */
export function coerceThreshold(value: unknown): PassThreshold {
  if (value === null || typeof value !== 'object') {
    return emptyThreshold();
  }
  const bag = value as Record<string, unknown>;
  return {
    totalPassPoints: coerceThresholdValue(bag.totalPassPoints, TOTAL_MAX),
    minGroupPoints: coerceThresholdValue(bag.minGroupPoints, GROUP_MAX),
  };
}

/** Sum of entered group scores (unset groups count as 0 toward the running total). */
export function totalScore(scores: GroupScores): number {
  return GROUPS.reduce((sum, g) => sum + (scores[g] ?? 0), 0);
}

/** True if at least one threshold (total or per-group) is set. */
export function hasAnyThreshold(threshold: PassThreshold): boolean {
  return threshold.totalPassPoints !== null || threshold.minGroupPoints !== null;
}

/** True if ANY group has been explicitly entered as 0 («don't zero a group»). */
export function hasZeroedGroup(scores: GroupScores): boolean {
  return GROUPS.some((g) => scores[g] === 0);
}

/** True if at least one group has an entered (non-null) score. */
export function hasAnyEnteredScore(scores: GroupScores): boolean {
  return GROUPS.some((g) => scores[g] !== null);
}

/**
 * Compute the exam verdict per the AC5 rule.
 *
 * @returns 'no-verdict' when no threshold is set, OR when the only set threshold
 *          is the per-group minimum but NO group has been entered yet (a 'pass'
 *          there would be vacuous — every entered group meets the min over an
 *          EMPTY set — and would surface a misleading positive on a screen
 *          showing no scores; with no data to evaluate, we abstain);
 *          'pass' when every SET threshold is met (inclusive >=);
 *          'risk' when at least one SET threshold is unmet.
 *
 * An unset threshold is NEVER a fail — it is ignored, never treated as unmet.
 */
export function computeVerdict(
  scores: GroupScores,
  threshold: PassThreshold,
): Verdict {
  if (!hasAnyThreshold(threshold)) {
    return 'no-verdict';
  }

  // Insufficient data: when the ONLY set threshold is the per-group minimum and
  // no group has been entered, there is nothing to evaluate — the per-group
  // check would pass vacuously over an empty set. Abstain rather than claim a
  // confident 'pass' on a blank table. (When totalPassPoints IS set, an empty
  // table sums to 0 and is evaluated normally — typically 'risk', not vacuous.)
  if (threshold.totalPassPoints === null && !hasAnyEnteredScore(scores)) {
    return 'no-verdict';
  }

  // Total-points threshold (set side only): inclusive >=.
  if (threshold.totalPassPoints !== null) {
    if (totalScore(scores) < threshold.totalPassPoints) {
      return 'risk';
    }
  }

  // Per-group minimum (set side only): EVERY entered group must meet it
  // (inclusive >=). A group not yet entered (null) is not yet a result, so it
  // cannot be a fail — it is ignored until a number is entered.
  if (threshold.minGroupPoints !== null) {
    for (const g of GROUPS) {
      const score = scores[g];
      if (score !== null && score < threshold.minGroupPoints) {
        return 'risk';
      }
    }
  }

  return 'pass';
}
