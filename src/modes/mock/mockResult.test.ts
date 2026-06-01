import { describe, expect, it } from 'vitest';
import {
  MOCK_HISTORY_CAP,
  type MockResult,
  appendMockHistory,
  coerceMockHistory,
  createMockResult,
} from './mockResult.ts';

function make(id: string, scores: unknown, durationSec = 300): MockResult {
  return createMockResult({ id, completedAt: 1000, scores, durationSec });
}

describe('createMockResult', () => {
  it('derives total as the sum of entered groups (unset = 0)', () => {
    const r = make('a', { I: 40, II: 30, III: 20, IV: 10 });
    expect(r.total).toBe(100);
    const partial = make('b', { I: 40, II: null, III: null, IV: 10 });
    expect(partial.total).toBe(50);
  });

  it('coerces out-of-range / garbage scores to 0–50 / null', () => {
    const r = make('c', { I: 999, II: -1, III: 'x', IV: 25 });
    expect(r.scores).toEqual({ I: null, II: null, III: null, IV: 25 });
    expect(r.total).toBe(25);
  });

  it('clamps a 0 group as a real zero (not null)', () => {
    const r = make('d', { I: 0, II: 50, III: 50, IV: 50 });
    expect(r.scores.I).toBe(0);
    expect(r.total).toBe(150);
  });

  it('coerces a garbage durationSec / completedAt to 0', () => {
    const r = createMockResult({
      id: 'e',
      completedAt: Number.NaN,
      scores: {},
      durationSec: Number.NaN,
    });
    expect(r.durationSec).toBe(0);
    expect(r.completedAt).toBe(0);
  });
});

describe('appendMockHistory — cap at N', () => {
  it('appends newest last', () => {
    const h = appendMockHistory([make('a', {})], make('b', {}));
    expect(h.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('keeps only the last MOCK_HISTORY_CAP entries (drops oldest)', () => {
    let h: MockResult[] = [];
    for (let i = 0; i < MOCK_HISTORY_CAP + 5; i++) {
      h = appendMockHistory(h, make(`r${i}`, {}));
    }
    expect(h).toHaveLength(MOCK_HISTORY_CAP);
    expect(h[0].id).toBe('r5'); // r0..r4 dropped
    expect(h[h.length - 1].id).toBe(`r${MOCK_HISTORY_CAP + 4}`);
  });

  it('does not mutate the input array', () => {
    const orig = [make('a', {})];
    appendMockHistory(orig, make('b', {}));
    expect(orig.map((r) => r.id)).toEqual(['a']);
  });
});

describe('coerceMockHistory — old/garbage persisted blobs', () => {
  it('coerces a missing field (undefined) to []', () => {
    expect(coerceMockHistory(undefined)).toEqual([]);
  });

  it('coerces a non-array value to []', () => {
    expect(coerceMockHistory(null)).toEqual([]);
    expect(coerceMockHistory('garbage')).toEqual([]);
    expect(coerceMockHistory({ id: 'x' })).toEqual([]);
  });

  it('drops entries that cannot be recovered (no id / non-object)', () => {
    const h = coerceMockHistory([
      { id: 'ok', completedAt: 5, scores: { I: 10 }, durationSec: 60 },
      { completedAt: 9, scores: {} }, // no id → dropped
      'junk',
      null,
    ]);
    expect(h.map((r) => r.id)).toEqual(['ok']);
    expect(h[0].scores.I).toBe(10);
    expect(h[0].total).toBe(10);
  });

  it('per-entry coerces out-of-range scores and recomputes total', () => {
    const h = coerceMockHistory([
      { id: 'x', completedAt: 1, scores: { I: 999, II: 30 }, durationSec: 'no' },
    ]);
    expect(h[0].scores).toEqual({ I: null, II: 30, III: null, IV: null });
    expect(h[0].total).toBe(30);
    expect(h[0].durationSec).toBe(0);
  });

  it('caps an over-long persisted array to the last N', () => {
    const big = Array.from({ length: MOCK_HISTORY_CAP + 3 }, (_, i) => ({
      id: `r${i}`,
      completedAt: i,
      scores: {},
      durationSec: 1,
    }));
    const h = coerceMockHistory(big);
    expect(h).toHaveLength(MOCK_HISTORY_CAP);
    expect(h[0].id).toBe('r3');
  });
});
