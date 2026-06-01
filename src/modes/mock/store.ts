// Mock-run persistence bridge (MVP_PLAN WP-D / AC4).
//
// Writes a completed MockResult into WP-A `SurvivalKitState` (the existing
// `settings` row, via the WP-A load/save helpers). It does two ADDITIVE things:
//   1. updates `scores` — the current mock-results table the SurvivalKit screen
//      renders — to the just-completed run's per-group scores;
//   2. appends the run to the capped `mockHistory` (last N, plan-review).
//
// It does NOT touch thresholds or the checklist, and re-uses the WP-A coercing
// load path so an OLD persisted blob without `mockHistory` recovers to `[]`
// before the append (never crashes WP-A).

import {
  type SurvivalKitState,
  loadSurvivalKitState,
  saveSurvivalKitState,
} from '../../db/survivalKit.ts';
import { type MockResult, appendMockHistory } from './mockResult.ts';

/**
 * Apply a completed run to an in-memory state (PURE): copy the run's scores into
 * the current mock-results table and append it to the capped history. Returns a
 * NEW state; thresholds + checklist are preserved untouched.
 */
export function applyMockResult(
  state: SurvivalKitState,
  result: MockResult,
): SurvivalKitState {
  return {
    ...state,
    scores: { ...result.scores },
    mockHistory: appendMockHistory(state.mockHistory, result),
  };
}

/**
 * Persist a completed run into the WP-A survival-kit state: load the current
 * (coerced) state, apply the result, and save. Returns the saved state.
 *
 * Because the load path coerces, an old blob without `mockHistory` is healed to
 * `[]` before the append — so this never loses or corrupts WP-A's own fields.
 */
export async function saveMockResult(
  result: MockResult,
): Promise<SurvivalKitState> {
  const current = await loadSurvivalKitState();
  const next = applyMockResult(current, result);
  await saveSurvivalKitState(next);
  return next;
}
