import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Lingvago2Db, db } from './index.ts';
import {
  SURVIVAL_KIT_KEY,
  type SurvivalKitState,
  coerceSurvivalKitState,
  emptySurvivalKitState,
  loadSurvivalKitState,
  saveSurvivalKitState,
} from './survivalKit.ts';
import { emptyThreshold } from '../screens/survivalKit.ts';

describe('survival-kit persistence (lingvago2 settings, additive)', () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it('returns a clean empty state when nothing is stored', async () => {
    expect(await loadSurvivalKitState()).toEqual(emptySurvivalKitState());
  });

  it('persists the mock-results table + thresholds + checklist and survives a reopen', async () => {
    const state: SurvivalKitState = {
      scores: { I: 40, II: 0, III: 25, IV: null },
      threshold: { totalPassPoints: 100, minGroupPoints: 20 },
      checklist: { 'group-I': true, 'group-III': false },
      mockHistory: [],
    };
    await saveSurvivalKitState(state);

    // Reopen a FRESH handle bound to the same IndexedDB to prove durability
    // across a "reload" (not just an in-memory cache hit).
    const fresh = new Lingvago2Db();
    await fresh.open();
    try {
      const row = await fresh.settings.get(SURVIVAL_KIT_KEY);
      expect(row?.value).toEqual(state);
    } finally {
      fresh.close();
    }

    // And it reads back through the loader unchanged.
    expect(await loadSurvivalKitState()).toEqual(state);
  });

  it('does NOT disturb other settings rows (additive write to a dedicated key)', async () => {
    await db.settings.put({ key: 'app', userAlias: 'alex', value: { theme: 'dark' } });
    await saveSurvivalKitState({
      scores: { I: 10, II: 10, III: 10, IV: 10 },
      threshold: emptyThreshold(),
      checklist: {},
      mockHistory: [],
    });

    // The pre-existing `app` settings row is untouched alongside the new key.
    const app = await db.settings.get('app');
    expect(app?.userAlias).toBe('alex');
    expect(app?.value).toEqual({ theme: 'dark' });
    expect(await db.settings.get(SURVIVAL_KIT_KEY)).toBeDefined();
  });

  it('coerces a corrupt persisted blob to a safe state instead of crashing', async () => {
    // Simulate a poisoned row written outside the typed helper.
    await db.settings.put({
      key: SURVIVAL_KIT_KEY,
      value: {
        scores: { I: 999, II: 'x', III: -1 },
        threshold: { totalPassPoints: 'oops', minGroupPoints: 9999 },
        checklist: { 'group-I': 'yes', 'group-II': true },
      },
    });

    const loaded = await loadSurvivalKitState();
    // Out-of-range / non-numeric group scores collapse to null.
    expect(loaded.scores).toEqual({ I: null, II: null, III: null, IV: null });
    // Invalid thresholds collapse to unknown (→ no verdict).
    expect(loaded.threshold).toEqual(emptyThreshold());
    // Only boolean checklist entries survive.
    expect(loaded.checklist).toEqual({ 'group-II': true });
  });

  it('coerceSurvivalKitState tolerates a wholly non-object blob', () => {
    expect(coerceSurvivalKitState('garbage')).toEqual(emptySurvivalKitState());
    expect(coerceSurvivalKitState(null)).toEqual(emptySurvivalKitState());
    expect(coerceSurvivalKitState(42)).toEqual(emptySurvivalKitState());
  });
});
