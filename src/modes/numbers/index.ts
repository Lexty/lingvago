// NumbersMode public surface (SPEC §1.2 / T7). Pure generator + objective
// check + seeded session; the screen and persistence consume from here.

export {
  MAX_CARDINAL,
  MAX_ORDINAL,
  numberToText,
  ordinalToText,
} from './numberToText.ts';
export {
  canonicalize,
  checkAnswer,
  normalizeSpacing,
  stripDiacritics,
} from './check.ts';
export { createPrng, hashSeed, type Prng } from './prng.ts';
export {
  DEFAULT_SESSION_CONFIG,
  generateSession,
  type Direction,
  type NumberItem,
  type NumberKind,
  type SessionConfig,
} from './session.ts';
