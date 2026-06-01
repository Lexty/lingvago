// Survival Kit persistence (MVP_PLAN WP-A) — ADDITIVE, no schema bump.
//
// The manual mock-results table (4 groups × 0–50) + pass thresholds + checklist
// state are persisted in the EXISTING `settings` key/value store of the
// `lingvago2` database under a single dedicated key. This is additive: it does
// NOT touch the §7.2 progress stores, the read-only §7.1 content stores, or the
// DB name — it only writes one new settings row. No Dexie `version()` bump is
// needed because `settings` already accepts arbitrary keys with a `value` bag.
//
// All reads coerce the persisted blob through the pure domain coercers so a
// corrupt/garbage value degrades gracefully (never crashes the screen).

import { db } from './index.ts';
import {
  type GroupScores,
  type PassThreshold,
  coerceGroupScores,
  coerceThreshold,
  emptyGroupScores,
  emptyThreshold,
} from '../screens/survivalKit.ts';
import { type MockResult, coerceMockHistory } from '../modes/mock/mockResult.ts';

/** Settings key under which the whole survival-kit state lives. */
export const SURVIVAL_KIT_KEY = 'survivalKit';

/** Persisted survival-kit state: mock-results table + thresholds + checklist. */
export interface SurvivalKitState {
  scores: GroupScores;
  threshold: PassThreshold;
  /** Map of checklist-item id → done. */
  checklist: Record<string, boolean>;
  /**
   * Capped history of completed mock runs (WP-D), newest last. ADDITIVE to
   * WP-A: an OLD persisted blob written before this field existed coerces to
   * `[]` (never crashes). Capped to the last `MOCK_HISTORY_CAP` entries by
   * `coerceMockHistory` on load.
   */
  mockHistory: MockResult[];
}

/** A clean, empty survival-kit state (nothing entered yet). */
export function emptySurvivalKitState(): SurvivalKitState {
  return {
    scores: emptyGroupScores(),
    threshold: emptyThreshold(),
    checklist: {},
    mockHistory: [],
  };
}

/** Coerce an unknown persisted checklist map into a clean boolean map. */
function coerceChecklist(value: unknown): Record<string, boolean> {
  if (value === null || typeof value !== 'object') {
    return {};
  }
  const out: Record<string, boolean> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'boolean') {
      out[key] = v;
    }
  }
  return out;
}

/** Coerce an unknown persisted blob into a well-formed SurvivalKitState. */
export function coerceSurvivalKitState(value: unknown): SurvivalKitState {
  const bag =
    value !== null && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};
  return {
    scores: coerceGroupScores(bag.scores),
    threshold: coerceThreshold(bag.threshold),
    checklist: coerceChecklist(bag.checklist),
    // ADDITIVE: an old blob without `mockHistory` (bag.mockHistory === undefined)
    // coerces to `[]`; per-entry coercion + cap handled in coerceMockHistory.
    mockHistory: coerceMockHistory(bag.mockHistory),
  };
}

/**
 * Load the persisted survival-kit state from `lingvago2` settings.
 * Returns a clean empty state when nothing is stored, and gracefully coerces a
 * corrupt value rather than throwing.
 */
export async function loadSurvivalKitState(): Promise<SurvivalKitState> {
  const row = await db.settings.get(SURVIVAL_KIT_KEY);
  return coerceSurvivalKitState(row?.value);
}

/**
 * Persist the survival-kit state into `lingvago2` settings (additive write to
 * the existing key/value store).
 *
 * The in-memory `state` is already well-formed by construction: every mutation
 * goes through the domain coercers (scores via coerceGroupScore, thresholds via
 * coerceThresholdValue) and the initial value comes from the coercing load path.
 * The READ path ({@link loadSurvivalKitState}) re-coerces unconditionally, so a
 * write-time coercion here would be unreachable belt-and-suspenders — we persist
 * `state` directly and let the single load-side coercer be the durable guard.
 */
export async function saveSurvivalKitState(state: SurvivalKitState): Promise<void> {
  await db.settings.put({
    key: SURVIVAL_KIT_KEY,
    value: state,
  });
}
