// PrepositionMode public surface (SPEC §1.2 / §5; WP-C Task 3). Pure blank-rule
// cloze engine + verified-key gate (§6.5 / AC3) + objective check + seeded L1–L3
// session (production-first; MC only via the shared parity module); the screen
// and persistence (Task 4) consume from here.

export {
  BLANK,
  buildCloze,
  chooseBlankExample,
  cleanTokenOccurrences,
  cleanTokens,
  isBlankable,
  type BlankedCloze,
} from './blankRule.ts';
export {
  filterPrepositionEligible,
  isPrepCategory,
  isPrepositionEligible,
  PREP_CATEGORIES,
  type PrepCategory,
} from './eligibility.ts';
export {
  canonicalize,
  checkAnswer,
  normalizeSpacing,
  stripDiacritics,
} from '../shared/check.ts';
export {
  DEFAULT_PREP_SESSION_CONFIG,
  generateSession,
  PREP_LEVELS,
  type PrepLevel,
  type PrepositionItem,
  type PrepSessionConfig,
} from './session.ts';
export {
  PREP_GENERATOR_CLASS,
  PREP_MODE_ID,
  PREP_SKILL,
  recordPrepositionAttempt,
  referenceIdFor,
  subskillFor,
  type PrepAttemptInput,
} from './progress.ts';
export { loadPrepositionsFromDb } from './prepData.ts';
