// MockExam (PaperSimulation) public surface (MVP_PLAN WP-D / SPEC §9.1).
//
// Pure timer domain + MockResult + review/minimum-rule + the persistence bridge
// into WP-A SurvivalKitState. The screen (Task 2) consumes from here; the app
// NEVER grades the exam — scores are manual input only.

export {
  DEFAULT_DURATION_MS,
  type TimerState,
  type TimerStatus,
  start,
  pause,
  resume,
  finish,
  elapsedMs,
  remainingMs,
  isExpired,
} from './timer.ts';
export {
  MOCK_HISTORY_CAP,
  type MockResult,
  createMockResult,
  coerceMockHistory,
  appendMockHistory,
} from './mockResult.ts';
export { type MockReview, reviewMock } from './verdict.ts';
export { applyMockResult, saveMockResult } from './store.ts';
