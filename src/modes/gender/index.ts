// GenderArticleMode public surface (SPEC §1.2 / §5; WP-C Task 2). Pure
// contraction engine + verified-key gate (§6.5) + objective check + seeded
// L1–L3 session (production-first; MC only via the shared parity module); the
// screen and persistence (Task 4) consume from here.

export {
  articleFormsFor,
  contract,
  indefiniteFor,
  oppositeArticle,
  oppositeContraction,
  type ArticleForms,
  type Contractable,
  type DefiniteArticle,
  type Gender,
} from './contractions.ts';
export { filterGenderEligible, isGenderEligible } from './eligibility.ts';
export {
  canonicalize,
  checkAnswer,
  normalizeSpacing,
  stripDiacritics,
} from '../shared/check.ts';
export {
  DEFAULT_GENDER_SESSION_CONFIG,
  GENDER_LEVELS,
  generateSession,
  type GenderItem,
  type GenderLevel,
  type GenderSessionConfig,
  type GenderTaskKind,
} from './session.ts';
export {
  GENDER_GENERATOR_CLASS,
  GENDER_MODE_ID,
  GENDER_REFERENCE_ID,
  GENDER_SKILL,
  recordGenderAttempt,
  referenceIdFor,
  subskillFor,
  type GenderAttemptInput,
} from './progress.ts';
export { loadNounsFromDb } from './genderData.ts';
