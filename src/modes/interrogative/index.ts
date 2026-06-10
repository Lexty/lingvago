// InterrogativeMode public surface (SPEC §1.2 / §5; AC2–AC5). Pure gloss-cue
// production engine: the static closed-class interrogative table + the §6.5
// verified-key gate (incl. the prefix/suffix-duplication guard) + the objective
// check + the seeded L1→L3 session (production-first; MC only via the shared
// parity module, `quant` vs `wh` classes). The screen, progress roll-up, and
// e2e (Task 3) consume from here — exactly as PossessiveMode's screen/e2e
// consume its `index.ts`. NO React / no i18n imports, so e2e can import this in
// a Node process (glossLang is an explicit input, never read from i18n here).

export {
  agreementEquals,
  glossFor,
  INTERROGATIVE_TABLE,
  normalizeAgreement,
  parityClassFor,
  tableEntryFor,
  type GlossLang,
  type IntFormEntry,
  type IntGender,
  type IntNumber,
  type IntParityClass,
  type InterrogativeAgreement,
  type InterrogativeRecord,
  type NormalizedAgreement,
} from './intData.ts';
export {
  filterInterrogativeEligible,
  gradeableFill,
  isInterrogativeEligible,
  reconstructAnswer,
} from './eligibility.ts';
export {
  canonicalize,
  checkAnswer,
  normalizeSpacing,
  stripDiacritics,
} from '../shared/check.ts';
export {
  DEFAULT_INT_SESSION_CONFIG,
  generateSession,
  INT_LEVELS,
  type IntLevel,
  type IntSessionConfig,
  type InterrogativeItem,
} from './session.ts';
