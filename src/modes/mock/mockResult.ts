// MockResult domain (MVP_PLAN WP-D / SPEC §9.1 PaperSimulation).
//
// PURE module: no React, no DB, no i18n. A MockResult is the immutable record
// of one completed mock run — the manually-entered per-group scores plus the
// run metadata. The app NEVER grades the exam (PaperSimulation §9.1): `scores`
// come from manual user input, coerced through WP-A `coerceGroupScore`. `total`
// is the plain sum of entered groups (out of TOTAL_MAX), NOT a judgement.

import {
  type GroupScores,
  GROUPS,
  coerceGroupScores,
  totalScore,
} from '../../screens/survivalKit.ts';

/** Max number of completed runs kept in the persisted history (plan-review). */
export const MOCK_HISTORY_CAP = 20;

/** One completed mock run. */
export interface MockResult {
  /** Stable identifier for this run (caller-supplied; kept pure/deterministic). */
  id: string;
  /** Wall-clock ms at which the run was completed. */
  completedAt: number;
  /** The manually-entered per-group scores (WP-A model, 0–50 each or null). */
  scores: GroupScores;
  /** Working duration of the run in whole seconds. */
  durationSec: number;
  /** Sum of entered group scores, out of {@link TOTAL_MAX}. */
  total: number;
}

/**
 * Build a {@link MockResult} from raw (possibly user-entered) inputs. Scores are
 * coerced through the WP-A coercers so out-of-range / garbage values degrade to
 * a valid 0–50 / null table; `total` is derived (never trusted from input).
 */
export function createMockResult(input: {
  id: string;
  completedAt: number;
  scores: unknown;
  durationSec: number;
}): MockResult {
  const scores = coerceGroupScores(input.scores);
  const durationSec =
    Number.isFinite(input.durationSec) && input.durationSec > 0
      ? Math.round(input.durationSec)
      : 0;
  return {
    id: input.id,
    completedAt: Number.isFinite(input.completedAt) ? input.completedAt : 0,
    scores,
    durationSec,
    total: totalScore(scores),
  };
}

/** Coerce one unknown persisted entry into a {@link MockResult}, or `null`. */
function coerceMockResult(value: unknown): MockResult | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }
  const bag = value as Record<string, unknown>;
  const id = typeof bag.id === 'string' ? bag.id : null;
  if (id === null) {
    return null;
  }
  return createMockResult({
    id,
    completedAt: typeof bag.completedAt === 'number' ? bag.completedAt : 0,
    scores: bag.scores,
    durationSec: typeof bag.durationSec === 'number' ? bag.durationSec : 0,
  });
}

/**
 * Coerce an unknown persisted value into a well-formed, capped MockResult[].
 *
 * - A missing field (old blob, `undefined`) or a non-array → `[]`.
 * - Each entry is per-entry coerced; entries that cannot be recovered (no id,
 *   non-object) are dropped rather than crashing the load.
 * - The result is capped to the LAST {@link MOCK_HISTORY_CAP} entries (newest
 *   last), matching the append/cap contract of {@link appendMockHistory}.
 */
export function coerceMockHistory(value: unknown): MockResult[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: MockResult[] = [];
  for (const entry of value) {
    const coerced = coerceMockResult(entry);
    if (coerced !== null) {
      out.push(coerced);
    }
  }
  return capHistory(out);
}

/**
 * Append a completed run to history (newest last) and cap to the last
 * {@link MOCK_HISTORY_CAP} entries. Returns a NEW array (does not mutate input).
 */
export function appendMockHistory(
  history: MockResult[],
  result: MockResult,
): MockResult[] {
  return capHistory([...history, result]);
}

/** Keep only the last {@link MOCK_HISTORY_CAP} entries (drops the oldest). */
function capHistory(history: MockResult[]): MockResult[] {
  return history.length > MOCK_HISTORY_CAP
    ? history.slice(history.length - MOCK_HISTORY_CAP)
    : history;
}

/** Re-export for callers that build the per-group table for the entry phase. */
export { GROUPS };
