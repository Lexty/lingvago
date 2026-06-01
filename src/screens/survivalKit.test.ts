import { describe, expect, it } from 'vitest';
import {
  GROUP_MAX,
  GROUPS,
  TOTAL_MAX,
  type GroupScores,
  type PassThreshold,
  coerceGroupScore,
  coerceGroupScores,
  coerceThreshold,
  coerceThresholdValue,
  computeVerdict,
  emptyGroupScores,
  emptyThreshold,
  hasAnyEnteredScore,
  hasAnyThreshold,
  hasZeroedGroup,
  totalScore,
} from './survivalKit.ts';

/** Build a full GroupScores table from the four group values. */
function scores(i: number | null, ii: number | null, iii: number | null, iv: number | null): GroupScores {
  return { I: i, II: ii, III: iii, IV: iv };
}

describe('survivalKit constants (4×50 model, SPEC §9.2)', () => {
  it('has 4 groups, 0–50 each, totalling 200', () => {
    expect(GROUPS).toEqual(['I', 'II', 'III', 'IV']);
    expect(GROUP_MAX).toBe(50);
    expect(TOTAL_MAX).toBe(200);
  });
});

describe('computeVerdict — the four AC5 cases', () => {
  // Case 1: ONLY totalPassPoints set.
  it('only totalPassPoints: pass when total >= threshold, risk when below', () => {
    const th: PassThreshold = { totalPassPoints: 100, minGroupPoints: null };
    expect(computeVerdict(scores(40, 40, 40, 40), th)).toBe('pass'); // 160 >= 100
    expect(computeVerdict(scores(10, 10, 10, 10), th)).toBe('risk'); // 40 < 100
  });

  // Case 2: ONLY minGroupPoints set.
  it('only minGroupPoints: pass when every entered group >= min, else risk', () => {
    const th: PassThreshold = { totalPassPoints: null, minGroupPoints: 20 };
    expect(computeVerdict(scores(25, 30, 22, 40), th)).toBe('pass');
    expect(computeVerdict(scores(25, 30, 5, 40), th)).toBe('risk'); // group III below min
  });

  // Case 2b: ONLY minGroupPoints set but EMPTY table → insufficient data, NOT a
  // vacuous 'pass'. With no group entered there is nothing to evaluate, so a
  // confident pass would be misleading on a blank screen → 'no-verdict'.
  it('only minGroupPoints + empty table → no-verdict (not a vacuous pass)', () => {
    const th: PassThreshold = { totalPassPoints: null, minGroupPoints: 25 };
    expect(computeVerdict(emptyGroupScores(), th)).toBe('no-verdict');
    // One entered group is enough to evaluate the per-group min again.
    expect(computeVerdict(scores(30, null, null, null), th)).toBe('pass');
    expect(computeVerdict(scores(10, null, null, null), th)).toBe('risk');
  });

  // Case 3: BOTH set.
  it('both thresholds: pass only when total AND every group meet their bounds', () => {
    const th: PassThreshold = { totalPassPoints: 100, minGroupPoints: 20 };
    expect(computeVerdict(scores(25, 30, 25, 30), th)).toBe('pass'); // total 110, all >=20
    // total OK (110) but a group below min → risk
    expect(computeVerdict(scores(45, 45, 10, 10), th)).toBe('risk');
    // all groups >= min but total below → risk
    expect(computeVerdict(scores(20, 20, 20, 20), { totalPassPoints: 100, minGroupPoints: 20 })).toBe('risk'); // total 80 < 100
  });

  // Case 4: NEITHER set → no verdict.
  it('no threshold set → no-verdict (raw scores + warning instead)', () => {
    expect(computeVerdict(scores(50, 50, 50, 50), emptyThreshold())).toBe('no-verdict');
    expect(computeVerdict(emptyGroupScores(), emptyThreshold())).toBe('no-verdict');
  });
});

describe('computeVerdict — inclusive >= boundary (plan-review note 1)', () => {
  it('total exactly equal to threshold counts as MET (pass)', () => {
    const th: PassThreshold = { totalPassPoints: 120, minGroupPoints: null };
    expect(computeVerdict(scores(30, 30, 30, 30), th)).toBe('pass'); // 120 === 120
    expect(computeVerdict(scores(30, 30, 30, 29), th)).toBe('risk'); // 119 < 120
  });

  it('group exactly equal to per-group min counts as MET (pass)', () => {
    const th: PassThreshold = { totalPassPoints: null, minGroupPoints: 25 };
    expect(computeVerdict(scores(25, 25, 25, 25), th)).toBe('pass'); // all === 25
    expect(computeVerdict(scores(25, 25, 24, 25), th)).toBe('risk'); // one below
  });
});

describe('computeVerdict — unset threshold is NEVER a fail (AC5 invariant)', () => {
  it('unset total side is ignored even when group min is unmet/met', () => {
    // Only minGroup set; total ignored regardless of how high/low the sum is.
    expect(
      computeVerdict(scores(50, 50, 50, 50), { totalPassPoints: null, minGroupPoints: 10 }),
    ).toBe('pass');
  });

  it('unset per-group side is ignored even with a zeroed group, if total is met', () => {
    // A zeroed group does NOT fail the verdict when minGroupPoints is unset and
    // the total threshold is still met — the unset side is never a fail.
    expect(
      computeVerdict(scores(50, 50, 50, 0), { totalPassPoints: 100, minGroupPoints: null }),
    ).toBe('pass'); // total 150 >= 100, per-group ignored
  });

  it('an un-entered (null) group is not yet a result → not a per-group fail', () => {
    // Group IV not entered yet; only entered groups are checked against min.
    expect(
      computeVerdict(scores(30, 30, 30, null), { totalPassPoints: null, minGroupPoints: 25 }),
    ).toBe('pass');
  });
});

describe('totalScore / hasAnyThreshold / hasZeroedGroup', () => {
  it('sums entered groups, treating unset as 0', () => {
    expect(totalScore(scores(10, 20, null, 5))).toBe(35);
    expect(totalScore(emptyGroupScores())).toBe(0);
  });

  it('detects whether any threshold is set', () => {
    expect(hasAnyThreshold(emptyThreshold())).toBe(false);
    expect(hasAnyThreshold({ totalPassPoints: 100, minGroupPoints: null })).toBe(true);
    expect(hasAnyThreshold({ totalPassPoints: null, minGroupPoints: 10 })).toBe(true);
  });

  it('flags an explicitly zeroed group, but not an unset one', () => {
    expect(hasZeroedGroup(scores(0, 30, 30, 30))).toBe(true);
    expect(hasZeroedGroup(scores(null, 30, 30, 30))).toBe(false);
    expect(hasZeroedGroup(emptyGroupScores())).toBe(false);
  });

  it('detects whether any group has an entered score', () => {
    expect(hasAnyEnteredScore(emptyGroupScores())).toBe(false);
    expect(hasAnyEnteredScore(scores(0, null, null, null))).toBe(true); // explicit 0 counts
    expect(hasAnyEnteredScore(scores(null, null, null, 12))).toBe(true);
  });
});

describe('coercion (error / invalid input → graceful, never throws)', () => {
  it('coerceGroupScore clamps to null on out-of-range / NaN / garbage', () => {
    expect(coerceGroupScore(25)).toBe(25);
    expect(coerceGroupScore('30')).toBe(30);
    expect(coerceGroupScore(0)).toBe(0); // explicit 0 is a real result
    expect(coerceGroupScore('')).toBeNull();
    expect(coerceGroupScore(null)).toBeNull();
    expect(coerceGroupScore(undefined)).toBeNull();
    expect(coerceGroupScore(-1)).toBeNull();
    expect(coerceGroupScore(51)).toBeNull();
    expect(coerceGroupScore(Number.NaN)).toBeNull();
    expect(coerceGroupScore('abc')).toBeNull();
    expect(coerceGroupScore(12.6)).toBe(13); // rounded into range
  });

  it('coerceThresholdValue clamps to null outside [0, max]', () => {
    expect(coerceThresholdValue(100, TOTAL_MAX)).toBe(100);
    expect(coerceThresholdValue(200, TOTAL_MAX)).toBe(200);
    expect(coerceThresholdValue(201, TOTAL_MAX)).toBeNull();
    expect(coerceThresholdValue(-5, TOTAL_MAX)).toBeNull();
    expect(coerceThresholdValue(51, GROUP_MAX)).toBeNull();
    expect(coerceThresholdValue('', TOTAL_MAX)).toBeNull();
    expect(coerceThresholdValue('not-a-number', TOTAL_MAX)).toBeNull();
  });

  it('coerceGroupScores normalizes a partial / garbage object into a full table', () => {
    expect(coerceGroupScores({ I: 10, III: 99, IV: 'x' })).toEqual(
      scores(10, null, null, null),
    );
    expect(coerceGroupScores(null)).toEqual(emptyGroupScores());
    expect(coerceGroupScores('garbage')).toEqual(emptyGroupScores());
    expect(coerceGroupScores(undefined)).toEqual(emptyGroupScores());
  });

  it('coerceThreshold normalizes garbage into unknown (no verdict)', () => {
    expect(coerceThreshold(null)).toEqual(emptyThreshold());
    expect(coerceThreshold({ totalPassPoints: 'x', minGroupPoints: 999 })).toEqual(emptyThreshold());
    expect(coerceThreshold({ totalPassPoints: 120 })).toEqual({
      totalPassPoints: 120,
      minGroupPoints: null,
    });
    // An invalid-thresholds blob yields no verdict, not a crash.
    expect(computeVerdict(scores(50, 50, 50, 50), coerceThreshold('garbage'))).toBe('no-verdict');
  });
});
