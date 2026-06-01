import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Lingvago2Db, db } from '../../db/index.ts';
import {
  SURVIVAL_KIT_KEY,
  loadSurvivalKitState,
  saveSurvivalKitState,
} from '../../db/survivalKit.ts';
import { applyMockResult, saveMockResult } from './store.ts';
import { createMockResult } from './mockResult.ts';
import { emptyThreshold } from '../../screens/survivalKit.ts';

function result(id: string, scores: unknown) {
  return createMockResult({ id, completedAt: 1000, scores, durationSec: 300 });
}

describe('applyMockResult (pure)', () => {
  it('copies the run scores into the current mock table and appends history', () => {
    const next = applyMockResult(
      {
        scores: { I: null, II: null, III: null, IV: null },
        threshold: { totalPassPoints: 100, minGroupPoints: 20 },
        checklist: { 'group-I': true },
        mockHistory: [],
      },
      result('a', { I: 40, II: 30, III: 20, IV: 10 }),
    );
    expect(next.scores).toEqual({ I: 40, II: 30, III: 20, IV: 10 });
    expect(next.mockHistory.map((r) => r.id)).toEqual(['a']);
    // Thresholds + checklist are preserved untouched.
    expect(next.threshold).toEqual({ totalPassPoints: 100, minGroupPoints: 20 });
    expect(next.checklist).toEqual({ 'group-I': true });
  });
});

describe('saveMockResult (lingvago2 settings, additive to WP-A)', () => {
  beforeEach(async () => {
    await db.open();
  });
  afterEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it('updates scores AND appends to mockHistory in SurvivalKitState', async () => {
    await saveMockResult(result('run-1', { I: 50, II: 50, III: 50, IV: 50 }));
    const loaded = await loadSurvivalKitState();
    expect(loaded.scores).toEqual({ I: 50, II: 50, III: 50, IV: 50 });
    expect(loaded.mockHistory).toHaveLength(1);
    expect(loaded.mockHistory[0].id).toBe('run-1');
    expect(loaded.mockHistory[0].total).toBe(200);
  });

  it('appends successive runs, newest last; latest run drives the table', async () => {
    await saveMockResult(result('run-1', { I: 10, II: 10, III: 10, IV: 10 }));
    await saveMockResult(result('run-2', { I: 40, II: 40, III: 40, IV: 40 }));
    const loaded = await loadSurvivalKitState();
    expect(loaded.mockHistory.map((r) => r.id)).toEqual(['run-1', 'run-2']);
    expect(loaded.scores).toEqual({ I: 40, II: 40, III: 40, IV: 40 });
  });

  it('survives a reload (fresh DB handle) — the result is not lost', async () => {
    await saveMockResult(result('persisted', { I: 35, II: 25, III: 15, IV: 5 }));
    const fresh = new Lingvago2Db();
    await fresh.open();
    try {
      const row = await fresh.settings.get(SURVIVAL_KIT_KEY);
      const value = row?.value as { mockHistory?: { id: string }[] };
      expect(value.mockHistory?.[0]?.id).toBe('persisted');
    } finally {
      fresh.close();
    }
    const loaded = await loadSurvivalKitState();
    expect(loaded.scores).toEqual({ I: 35, II: 25, III: 15, IV: 5 });
  });

  it('preserves pre-existing thresholds/checklist when writing a mock result', async () => {
    await saveSurvivalKitState({
      scores: { I: null, II: null, III: null, IV: null },
      threshold: { totalPassPoints: 100, minGroupPoints: 20 },
      checklist: { 'doc-passport': true },
      mockHistory: [],
    });
    await saveMockResult(result('r', { I: 30, II: 30, III: 30, IV: 30 }));
    const loaded = await loadSurvivalKitState();
    expect(loaded.threshold).toEqual({ totalPassPoints: 100, minGroupPoints: 20 });
    expect(loaded.checklist).toEqual({ 'doc-passport': true });
  });

  it('heals an OLD persisted blob WITHOUT mockHistory before appending', async () => {
    // Simulate a WP-A row written before mockHistory existed.
    await db.settings.put({
      key: SURVIVAL_KIT_KEY,
      value: {
        scores: { I: 5, II: 5, III: 5, IV: 5 },
        threshold: emptyThreshold(),
        checklist: {},
        // NOTE: no mockHistory field at all.
      },
    });
    // It must coerce mockHistory → [] and append without crashing.
    await saveMockResult(result('first', { I: 45, II: 45, III: 45, IV: 45 }));
    const loaded = await loadSurvivalKitState();
    expect(loaded.mockHistory.map((r) => r.id)).toEqual(['first']);
    expect(loaded.scores).toEqual({ I: 45, II: 45, III: 45, IV: 45 });
  });
});
