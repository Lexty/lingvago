// Mock-run countdown timer domain (MVP_PLAN WP-D / SPEC §9.1 PaperSimulation).
//
// PURE module: no React, no DB, no i18n, NO `Date.now()`. Every function that
// needs the wall clock takes `now` (a millisecond timestamp) as an explicit
// argument — this keeps the domain deterministic in tests/e2e and lets the
// caller inject a frozen / seeded clock.
//
// The timer models a fixed-duration countdown (default 90 min, configurable
// short for tests/e2e). Its state is a small SERIALIZABLE record built from a
// persisted start-timestamp + duration + accumulated-paused milliseconds, so a
// reload mid-run reconstructs `remaining` exactly: on return we recompute from
// the persisted anchors against the current `now`, rather than trusting a live
// counter that a reload would have destroyed.
//
// SPEC §16 hard non-goal: this is the IN-RUN countdown only — there is NO
// day-countdown-to-exam anywhere here.

/** Default mock duration: 90 minutes (the real PaperSimulation length). */
export const DEFAULT_DURATION_MS = 90 * 60 * 1000;

/** Lifecycle phase of a single mock run. */
export type TimerStatus = 'running' | 'paused' | 'finished';

/**
 * Serializable countdown state. Built from persisted anchors so it survives a
 * reload: `remaining`/`elapsed` are always RECOMPUTED from these fields + an
 * injected `now`, never stored as a live ticking value.
 */
export interface TimerState {
  /** Total run length in ms (configurable; {@link DEFAULT_DURATION_MS} default). */
  durationMs: number;
  /** Wall-clock ms at which the run was started (`start`). */
  startedAt: number;
  /** Current lifecycle phase. */
  status: TimerStatus;
  /**
   * Sum of all fully-completed paused intervals, in ms. Time spent paused does
   * NOT consume the countdown — it is added back so the user gets the full
   * working duration regardless of pauses.
   */
  accumulatedPausedMs: number;
  /**
   * Wall-clock ms at which the CURRENT pause began, or `null` when running /
   * finished. While paused, the open interval `[pausedAt, now)` is excluded
   * from elapsed in addition to {@link accumulatedPausedMs}.
   */
  pausedAt: number | null;
  /**
   * Wall-clock ms at which `finish` was called, or `null` while not finished.
   * Pins the final elapsed/remaining so a reload after finishing is stable.
   */
  finishedAt: number | null;
}

/** Coerce a duration into a positive integer ms, falling back to the default. */
function coerceDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return DEFAULT_DURATION_MS;
  }
  return Math.floor(durationMs);
}

/** Start a fresh run at `now` with the given (configurable) duration. */
export function start(now: number, durationMs: number = DEFAULT_DURATION_MS): TimerState {
  return {
    durationMs: coerceDuration(durationMs),
    startedAt: now,
    status: 'running',
    accumulatedPausedMs: 0,
    pausedAt: null,
    finishedAt: null,
  };
}

/**
 * Pause a running timer at `now`. No-op (returns the same logical state) when
 * the timer is not currently running, so double-pause / pause-after-finish is
 * harmless.
 */
export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== 'running') {
    return state;
  }
  return { ...state, status: 'paused', pausedAt: now };
}

/**
 * Resume a paused timer at `now`, folding the just-completed pause interval
 * `[pausedAt, now)` into {@link TimerState.accumulatedPausedMs}. No-op when the
 * timer is not paused.
 */
export function resume(state: TimerState, now: number): TimerState {
  if (state.status !== 'paused' || state.pausedAt === null) {
    return state;
  }
  const pausedFor = Math.max(0, now - state.pausedAt);
  return {
    ...state,
    status: 'running',
    accumulatedPausedMs: state.accumulatedPausedMs + pausedFor,
    pausedAt: null,
  };
}

/**
 * Finish a run at `now`, pinning `finishedAt`. If the timer was paused, the
 * open pause interval is folded in first so elapsed is consistent. No-op when
 * already finished.
 */
export function finish(state: TimerState, now: number): TimerState {
  if (state.status === 'finished') {
    return state;
  }
  const base = state.status === 'paused' ? resume(state, now) : state;
  return { ...base, status: 'finished', pausedAt: null, finishedAt: now };
}

/**
 * Effective wall-clock instant used for elapsed math: the frozen `finishedAt`
 * once finished (so a later reload is stable), otherwise the live `now`.
 */
function effectiveNow(state: TimerState, now: number): number {
  return state.status === 'finished' && state.finishedAt !== null
    ? state.finishedAt
    : now;
}

/**
 * Elapsed working time in ms (paused time excluded), clamped to
 * `[0, durationMs]`. Recomputed from anchors + `now` so it is correct after a
 * reload mid-run / mid-pause.
 */
export function elapsedMs(state: TimerState, now: number): number {
  const ref = effectiveNow(state, now);
  // Exclude completed pauses, plus the currently-open pause interval (if any).
  const openPause =
    state.status === 'paused' && state.pausedAt !== null
      ? Math.max(0, ref - state.pausedAt)
      : 0;
  const raw = ref - state.startedAt - state.accumulatedPausedMs - openPause;
  return clamp(raw, 0, state.durationMs);
}

/** Remaining ms before the run auto-expires, clamped to `[0, durationMs]`. */
export function remainingMs(state: TimerState, now: number): number {
  return state.durationMs - elapsedMs(state, now);
}

/**
 * True once the countdown has been fully consumed (remaining === 0). A run that
 * has expired by the clock is treated as over even if `finish` was not called
 * explicitly (the screen turns this into an auto-finish).
 */
export function isExpired(state: TimerState, now: number): boolean {
  return remainingMs(state, now) <= 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
