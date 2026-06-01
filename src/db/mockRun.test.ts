import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './index.ts';
import {
  MOCK_RUN_KEY,
  clearMockRun,
  coerceTimerState,
  loadMockRun,
  saveMockRun,
} from './mockRun.ts';
import {
  DEFAULT_DURATION_MS,
  start,
  pause,
  remainingMs,
} from '../modes/mock/timer.ts';

describe('coerceTimerState (pure)', () => {
  it('returns null for a missing / non-object / null blob', () => {
    expect(coerceTimerState(undefined)).toBeNull();
    expect(coerceTimerState(null)).toBeNull();
    expect(coerceTimerState('nope')).toBeNull();
    expect(coerceTimerState(42)).toBeNull();
  });

  it('returns null when the start anchor or status is missing/garbage', () => {
    expect(coerceTimerState({ status: 'running' })).toBeNull(); // no startedAt
    expect(coerceTimerState({ startedAt: 1000 })).toBeNull(); // no status
    expect(
      coerceTimerState({ startedAt: 1000, status: 'bogus' }),
    ).toBeNull();
    expect(
      coerceTimerState({ startedAt: Number.NaN, status: 'running' }),
    ).toBeNull();
  });

  it('round-trips a well-formed running state', () => {
    const state = start(5000, 60_000);
    expect(coerceTimerState(state)).toEqual(state);
  });

  it('heals out-of-range duration / accumulated to safe defaults', () => {
    const healed = coerceTimerState({
      startedAt: 1000,
      status: 'running',
      durationMs: -5, // invalid → default
      accumulatedPausedMs: -10, // invalid → 0
      pausedAt: null,
      finishedAt: null,
    });
    expect(healed).not.toBeNull();
    expect(healed?.durationMs).toBe(DEFAULT_DURATION_MS);
    expect(healed?.accumulatedPausedMs).toBe(0);
  });
});

describe('mockRun persistence (lingvago2 settings, additive)', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map((t) => t.clear()));
  });
  afterEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it('returns null when nothing is stored', async () => {
    expect(await loadMockRun()).toBeNull();
  });

  it('saves and reloads an in-progress run so remaining survives a reload', async () => {
    // Started at t=1000 with a 60s run; persist the anchors.
    const state = start(1000, 60_000);
    await saveMockRun(state);

    // A "reload" reads the anchors back; remaining is recomputed from anchors +
    // the live clock (here 10s after start) — NOT from a live counter.
    const reloaded = await loadMockRun();
    expect(reloaded).not.toBeNull();
    if (reloaded !== null) {
      expect(remainingMs(reloaded, 11_000)).toBe(50_000);
    }
  });

  it('preserves a mid-pause run across reload (paused anchor kept)', async () => {
    const paused = pause(start(1000, 60_000), 5000);
    await saveMockRun(paused);
    const reloaded = await loadMockRun();
    expect(reloaded?.status).toBe('paused');
    // 4s of working time elapsed before the pause; remaining frozen at 56s
    // regardless of how long we stay away.
    if (reloaded !== null) {
      expect(remainingMs(reloaded, 999_999)).toBe(56_000);
    }
  });

  it('clears the in-progress run', async () => {
    await saveMockRun(start(1000, 60_000));
    expect(await loadMockRun()).not.toBeNull();
    await clearMockRun();
    expect(await loadMockRun()).toBeNull();
    expect(await db.settings.get(MOCK_RUN_KEY)).toBeUndefined();
  });

  it('coerces a corrupt persisted blob to null (never crashes the load)', async () => {
    await db.settings.put({ key: MOCK_RUN_KEY, value: { garbage: true } });
    expect(await loadMockRun()).toBeNull();
  });
});
