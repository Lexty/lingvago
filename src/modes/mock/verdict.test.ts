import { describe, expect, it } from 'vitest';
import { reviewMock } from './verdict.ts';
import type { GroupScores, PassThreshold } from '../../screens/survivalKit.ts';

const scores = (
  I: number | null,
  II: number | null,
  III: number | null,
  IV: number | null,
): GroupScores => ({ I, II, III, IV });

describe('reviewMock — minimum rule («don\'t zero a group»)', () => {
  it('warns when any group is entered as 0', () => {
    const r = reviewMock(scores(0, 50, 50, 0), { totalPassPoints: null, minGroupPoints: null });
    expect(r.zeroedGroupWarning).toBe(true);
  });

  it('does not warn when no group is 0 (unset groups are not zeros)', () => {
    const r = reviewMock(scores(40, null, 30, 25), { totalPassPoints: null, minGroupPoints: null });
    expect(r.zeroedGroupWarning).toBe(false);
  });
});

describe('reviewMock — verdict comes from WP-A computeVerdict', () => {
  it("'no-verdict' when no threshold is set", () => {
    const r = reviewMock(scores(40, 40, 40, 40), { totalPassPoints: null, minGroupPoints: null });
    expect(r.verdict).toBe('no-verdict');
  });

  it("'pass' when the set total threshold is met (inclusive)", () => {
    const th: PassThreshold = { totalPassPoints: 100, minGroupPoints: null };
    expect(reviewMock(scores(25, 25, 25, 25), th).verdict).toBe('pass');
  });

  it("'risk' when the set total threshold is unmet", () => {
    const th: PassThreshold = { totalPassPoints: 120, minGroupPoints: null };
    expect(reviewMock(scores(25, 25, 25, 25), th).verdict).toBe('risk');
  });

  it("'risk' when an entered group falls below the per-group minimum", () => {
    const th: PassThreshold = { totalPassPoints: null, minGroupPoints: 20 };
    const r = reviewMock(scores(0, 50, 50, 50), th);
    expect(r.verdict).toBe('risk');
    expect(r.zeroedGroupWarning).toBe(true); // a 0 is both a min-fail and a zero
  });
});
