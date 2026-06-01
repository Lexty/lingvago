// In-progress mock-run persistence (MVP_PLAN WP-D / AC1) — ADDITIVE, no schema bump.
//
// A single, currently-running mock's timer anchors (the serializable
// `TimerState` from the pure `timer.ts`) are persisted in the EXISTING
// `settings` key/value store of the `lingvago2` database under one dedicated
// key. This is what lets the countdown SURVIVE a reload mid-run: on mount the
// screen loads these anchors and recomputes `remaining` from them + the live
// clock, rather than trusting a live counter the reload destroyed.
//
// This is additive: it writes one new settings row and never touches §7.2
// progress, the read-only §7.1 content stores, the DB name, or WP-A's own
// `survivalKit` settings row. A corrupt/garbage blob coerces to `null`
// (= no run in progress) so a bad value can never crash the screen.

import { db } from './index.ts';
import {
  type TimerState,
  type TimerStatus,
  DEFAULT_DURATION_MS,
} from '../modes/mock/timer.ts';

/** Settings key under which the in-progress run's timer anchors live. */
export const MOCK_RUN_KEY = 'mockRun';

/** The valid lifecycle phases of a persisted run. */
const TIMER_STATUSES: readonly TimerStatus[] = ['running', 'paused', 'finished'];

/** A finite number or `null` (used to coerce the nullable anchor fields). */
function coerceNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Coerce an unknown persisted blob into a well-formed {@link TimerState}, or
 * `null` when nothing valid is stored. A missing/garbage/structurally-broken
 * value (no usable `startedAt`/`status`) degrades to `null` (= no in-progress
 * run) rather than throwing — the screen treats `null` as "show setup".
 */
export function coerceTimerState(value: unknown): TimerState | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }
  const bag = value as Record<string, unknown>;
  const startedAt = coerceNullableNumber(bag.startedAt);
  const status =
    typeof bag.status === 'string' &&
    (TIMER_STATUSES as readonly string[]).includes(bag.status)
      ? (bag.status as TimerStatus)
      : null;
  // Without a real start anchor + a known phase there is no recoverable run.
  if (startedAt === null || status === null) {
    return null;
  }
  const durationRaw = coerceNullableNumber(bag.durationMs);
  const durationMs =
    durationRaw !== null && durationRaw > 0 ? durationRaw : DEFAULT_DURATION_MS;
  const accumulatedRaw = coerceNullableNumber(bag.accumulatedPausedMs);
  return {
    durationMs,
    startedAt,
    status,
    accumulatedPausedMs:
      accumulatedRaw !== null && accumulatedRaw >= 0 ? accumulatedRaw : 0,
    pausedAt: coerceNullableNumber(bag.pausedAt),
    finishedAt: coerceNullableNumber(bag.finishedAt),
  };
}

/**
 * Load the persisted in-progress run, or `null` when none is stored / the blob
 * is unrecoverable. Never throws on a corrupt value (it coerces to `null`).
 */
export async function loadMockRun(): Promise<TimerState | null> {
  const row = await db.settings.get(MOCK_RUN_KEY);
  return coerceTimerState(row?.value);
}

/** Persist the in-progress run's timer anchors (additive settings write). */
export async function saveMockRun(state: TimerState): Promise<void> {
  await db.settings.put({ key: MOCK_RUN_KEY, value: state });
}

/** Clear the in-progress run (called once a run is saved or abandoned). */
export async function clearMockRun(): Promise<void> {
  await db.settings.delete(MOCK_RUN_KEY);
}
