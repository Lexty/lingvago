// Objective string check for NumbersMode answers (SPEC §1.2 «объективная
// проверка строкой», AC4). The normalization is SHARED with ConjugationMode via
// `../shared/check.ts` so both production drills behave identically and the
// diacritic policy lives in one place; the policy is pinned by this mode's tests
// (check.test.ts) and documented on the shared module.
//
// For a numeral-assembly recall drill this means: the canonical EP spelling WITH
// diacritics (`três`, `sétimo`) is always correct, and an accent-STRIPPED answer
// (`tres`, `setimo`) is ALSO accepted (the fold is applied uniformly to
// reference and user answer). The word→digit direction is an exact integer-
// string match after trimming, handled by the caller.

export {
  canonicalize,
  checkAnswer,
  normalizeSpacing,
  stripDiacritics,
} from '../shared/check.ts';
