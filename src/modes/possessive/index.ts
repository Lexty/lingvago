// PossessiveMode public surface (SPEC §1.2 / §5; AC2–AC5). Pure cue-production
// engine: the static closed-class paradigm + the §6.5 verified-key gate + the
// objective check + the seeded L1→L3 session (production-first; MC only via the
// shared parity module). The screen, progress roll-up, and e2e (Task 3) consume
// from here — exactly as PrepositionMode's screen/e2e consume its `index.ts`.
// NO React / no i18n imports, so e2e can import this in a Node process.

export {
  DELE_FAMILY,
  DELE_FORMS,
  determinerForm,
  DETERMINER_PARADIGM,
  isInPossessiveInventory,
  isPossKind,
  ownerForDele,
  PERSON_CUE,
  POSS_PERSONS,
  POSSESSIVE_INVENTORY,
  type DeleOwner,
  type DeterminerCell,
  type PossGender,
  type PossKind,
  type PossNumber,
  type PossPerson,
  type PossessiveContextRecord,
  type PossessiveRecord,
} from './possData.ts';
export {
  filterContextEligible,
  filterPossessiveEligible,
  isContextEligible,
  isPossessiveEligible,
  isPossPerson,
  reconstructAnswer,
} from './eligibility.ts';
export {
  canonicalize,
  checkAnswer,
  normalizeSpacing,
  stripDiacritics,
} from '../shared/check.ts';
export {
  DEFAULT_POSS_SESSION_CONFIG,
  generateSession,
  POSS_LEVELS,
  type PossLevel,
  type PossessiveItem,
  type PossSessionConfig,
} from './session.ts';
