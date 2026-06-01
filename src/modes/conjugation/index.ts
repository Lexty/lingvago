// ConjugationMode public surface (SPEC §1.2 / T8). Pure conjugation engine +
// exam-eligibility gate (§6.5) + objective check + seeded session; the screen
// and persistence (Task 3) consume from here.

export {
  conjugate,
  conjugateRegular,
  conjugateTable,
  isRegularGroup,
  ConjugationError,
  type RegularGroup,
  type VerbData,
} from './conjugate.ts';
export { filterExamEligible, isExamEligible } from './eligibility.ts';
export {
  canonicalize,
  checkAnswer,
  normalizeSpacing,
  stripDiacritics,
} from './check.ts';
export { PERSONS, isPerson, pronounFor, type Person } from './persons.ts';
export {
  DEFAULT_SESSION_CONFIG,
  generateSession,
  type AssembleTableItem,
  type ConjugationItem,
  type ConjugationSource,
  type ConjugationTaskType,
  type FillFormItem,
  type SessionConfig,
} from './session.ts';
export { loadVerbDataFromDb } from './verbData.ts';
export { projectVerbData } from './projectVerbData.ts';
export {
  CONJUGATION_SKILL,
  recordConjugationAttempt,
  subskillFor,
  type ConjugationAttemptInput,
} from './progress.ts';
