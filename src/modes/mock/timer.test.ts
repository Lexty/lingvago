import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DURATION_MS,
  elapsedMs,
  finish,
  isExpired,
  pause,
  remainingMs,
  resume,
  start,
} from './timer.ts';

const MIN = 60 * 1000;

describe('mock timer — start / countdown', () => {
  it('starts running with the full duration remaining', () => {
    const t = start(1000);
    expect(t.status).toBe('running');
    expect(t.durationMs).toBe(DEFAULT_DURATION_MS);
    expect(remainingMs(t, 1000)).toBe(DEFAULT_DURATION_MS);
    expect(elapsedMs(t, 1000)).toBe(0);
  });

  it('accepts a short configurable duration (tests/e2e)', () => {
    const t = start(0, 5 * MIN);
    expect(t.durationMs).toBe(5 * MIN);
    expect(remainingMs(t, 2 * MIN)).toBe(3 * MIN);
    expect(elapsedMs(t, 2 * MIN)).toBe(2 * MIN);
  });

  it('counts down as wall-clock advances', () => {
    const t = start(0, 90 * MIN);
    expect(remainingMs(t, 10 * MIN)).toBe(80 * MIN);
    expect(remainingMs(t, 89 * MIN)).toBe(1 * MIN);
  });

  it('clamps remaining to 0 and reports expiry once the duration is consumed', () => {
    const t = start(0, 90 * MIN);
    expect(remainingMs(t, 90 * MIN)).toBe(0);
    expect(remainingMs(t, 1000 * MIN)).toBe(0);
    expect(elapsedMs(t, 1000 * MIN)).toBe(90 * MIN);
    expect(isExpired(t, 90 * MIN)).toBe(true);
    expect(isExpired(t, 89 * MIN)).toBe(false);
  });
});

describe('mock timer — pause / resume', () => {
  it('freezes remaining while paused (paused time is not consumed)', () => {
    let t = start(0, 90 * MIN);
    t = pause(t, 10 * MIN); // paused at t=10m, 80m remaining
    expect(t.status).toBe('paused');
    // 30 minutes of wall-clock pass while paused — remaining must NOT drop.
    expect(remainingMs(t, 40 * MIN)).toBe(80 * MIN);
    expect(elapsedMs(t, 40 * MIN)).toBe(10 * MIN);
  });

  it('resumes and excludes the paused interval from the countdown', () => {
    let t = start(0, 90 * MIN);
    t = pause(t, 10 * MIN);
    t = resume(t, 40 * MIN); // 30m paused folded into accumulatedPausedMs
    expect(t.status).toBe('running');
    expect(t.accumulatedPausedMs).toBe(30 * MIN);
    // At wall-clock 50m: elapsed working time = 50 - 30 paused = 20m.
    expect(elapsedMs(t, 50 * MIN)).toBe(20 * MIN);
    expect(remainingMs(t, 50 * MIN)).toBe(70 * MIN);
  });

  it('supports multiple pause/resume cycles', () => {
    let t = start(0, 90 * MIN);
    t = pause(t, 5 * MIN);
    t = resume(t, 15 * MIN); // 10m paused
    t = pause(t, 20 * MIN);
    t = resume(t, 25 * MIN); // +5m paused = 15m total
    expect(t.accumulatedPausedMs).toBe(15 * MIN);
    // Wall-clock 30m, 15m paused → 15m worked.
    expect(elapsedMs(t, 30 * MIN)).toBe(15 * MIN);
    expect(remainingMs(t, 30 * MIN)).toBe(75 * MIN);
  });

  it('pause is a no-op when not running; resume is a no-op when not paused', () => {
    const t = start(0, 90 * MIN);
    expect(resume(t, 10 * MIN)).toBe(t); // not paused
    const paused = pause(t, 10 * MIN);
    expect(pause(paused, 20 * MIN)).toBe(paused); // already paused
  });
});

describe('mock timer — survives a reload (recompute from persisted anchors)', () => {
  it('recomputes remaining after a simulated reload mid-run', () => {
    const t = start(0, 90 * MIN);
    // Serialize → reload: a fresh object from the persisted fields.
    const reloaded = JSON.parse(JSON.stringify(t));
    // Returning at wall-clock 25m: 25m has elapsed despite no live ticking.
    expect(remainingMs(reloaded, 25 * MIN)).toBe(65 * MIN);
    expect(elapsedMs(reloaded, 25 * MIN)).toBe(25 * MIN);
  });

  it('recomputes remaining after a reload that lands during an open pause', () => {
    let t = start(0, 90 * MIN);
    t = pause(t, 10 * MIN); // 80m remaining, paused
    const reloaded = JSON.parse(JSON.stringify(t));
    // Returning 1h later while still paused: remaining is still frozen at 80m.
    expect(remainingMs(reloaded, 70 * MIN)).toBe(80 * MIN);
    expect(reloaded.status).toBe('paused');
    // Resuming after the reload folds the full paused gap.
    const resumed = resume(reloaded, 70 * MIN);
    expect(resumed.accumulatedPausedMs).toBe(60 * MIN);
    expect(remainingMs(resumed, 75 * MIN)).toBe(75 * MIN);
  });

  it('recomputes correctly after a reload following resume', () => {
    let t = start(0, 90 * MIN);
    t = pause(t, 10 * MIN);
    t = resume(t, 40 * MIN); // 30m paused
    const reloaded = JSON.parse(JSON.stringify(t));
    expect(remainingMs(reloaded, 50 * MIN)).toBe(70 * MIN);
  });
});

describe('mock timer — finish', () => {
  it('pins elapsed/remaining at the finish instant; later now does not change it', () => {
    const t = start(0, 90 * MIN);
    const done = finish(t, 30 * MIN);
    expect(done.status).toBe('finished');
    expect(done.finishedAt).toBe(30 * MIN);
    expect(elapsedMs(done, 30 * MIN)).toBe(30 * MIN);
    // A reload long after finishing keeps the pinned value (result not lost).
    expect(elapsedMs(done, 999 * MIN)).toBe(30 * MIN);
    expect(remainingMs(done, 999 * MIN)).toBe(60 * MIN);
  });

  it('finishing while paused folds the open pause, then pins the result', () => {
    let t = start(0, 90 * MIN);
    t = pause(t, 10 * MIN);
    const done = finish(t, 40 * MIN); // 30m paused folded
    expect(done.status).toBe('finished');
    expect(elapsedMs(done, 40 * MIN)).toBe(10 * MIN);
    expect(elapsedMs(done, 500 * MIN)).toBe(10 * MIN);
  });

  it('finish is a no-op when already finished', () => {
    const done = finish(start(0, 90 * MIN), 30 * MIN);
    expect(finish(done, 80 * MIN)).toBe(done);
  });

  it('survives a reload after finish (result is stable)', () => {
    const done = finish(start(0, 90 * MIN), 45 * MIN);
    const reloaded = JSON.parse(JSON.stringify(done));
    expect(reloaded.status).toBe('finished');
    expect(elapsedMs(reloaded, 10_000 * MIN)).toBe(45 * MIN);
    expect(remainingMs(reloaded, 10_000 * MIN)).toBe(45 * MIN);
  });
});

describe('mock timer — error / edge inputs', () => {
  it('falls back to the default duration for non-positive / garbage values', () => {
    expect(start(0, 0).durationMs).toBe(DEFAULT_DURATION_MS);
    expect(start(0, -5).durationMs).toBe(DEFAULT_DURATION_MS);
    expect(start(0, Number.NaN).durationMs).toBe(DEFAULT_DURATION_MS);
    expect(start(0, Number.POSITIVE_INFINITY).durationMs).toBe(DEFAULT_DURATION_MS);
  });

  it('never reports negative remaining or elapsed beyond the duration', () => {
    const t = start(0, 90 * MIN);
    expect(remainingMs(t, -100)).toBe(90 * MIN); // now before start → clamped
    expect(elapsedMs(t, -100)).toBe(0);
  });
});
