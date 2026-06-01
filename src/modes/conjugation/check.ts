// Objective string check for ConjugationMode answers (SPEC §1.2 «объективная
// проверка строкой», T8 AC7). The normalization is SHARED with NumbersMode via
// `../shared/check.ts` so the two production drills behave identically and the
// diacritic policy lives in one place; the policy is pinned by this mode's tests
// (check.test.ts) and documented on the shared module.
//
// For a verb-form recall drill this means: the canonical EP spelling WITH
// diacritics (`és`, `está`) is always correct, and an accent-STRIPPED answer
// (`es`, `esta`) is ALSO accepted (the fold is applied uniformly to reference
// and user answer) — a learner who produced the right form but skipped accents
// is not penalised.

export {
  canonicalize,
  checkAnswer,
  normalizeSpacing,
  stripDiacritics,
} from '../shared/check.ts';
