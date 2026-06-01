// Shared objective string-check helpers for the production-input drills (SPEC
// §1.2 «объективная проверка строкой»). NumbersMode (T7) and ConjugationMode
// (T8) consume the SAME normalization so the two drills behave identically and
// the diacritic policy lives in ONE place. Each mode re-exports these from its
// own `check.ts` (alongside the mode-specific policy doc comment) — mirroring
// how the seeded PRNG (`numbers/prng.ts`) is already shared cross-mode.
//
// SHIPPED DIACRITIC POLICY (pinned by each mode's tests):
//  - The canonical EP spelling WITH diacritics is the reference form and is
//    always CORRECT (`três`, `está`, `põe`).
//  - An accent-STRIPPED answer (`tres`, `esta`, `poe`) is ALSO accepted. These
//    are production *recall* drills, not orthography/typing tests, and mobile
//    keyboards make diacritics costly; a learner who produced the right form but
//    skipped accents is not penalised. The fold is applied UNIFORMLY to both the
//    reference and the user answer, and is asserted explicitly in tests.
//  - The grammar drills rely on this too: the `a + a = à` contraction folds to a
//    length-1 `a`, so the objective check accepts both `à` and an accent-stripped
//    `a`, and the parity module measures `à` as length-1 (parity-equal to
//    `ao`/`do`/`da`). The preposition blank rule reuses the SAME fold for its
//    clean-token boundary, so a token's cloze identity matches the check exactly.

/** Lowercase, trim, and collapse internal whitespace runs to a single space. */
export function normalizeSpacing(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Strip combining diacritical marks (NFD fold) — `três` → `tres`, `põe` → `poe`. */
export function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Canonical comparison key for an answer: spacing-normalized AND accent-folded
 * (per the shipped diacritic policy above).
 */
export function canonicalize(text: string): string {
  return stripDiacritics(normalizeSpacing(text));
}

/**
 * Objective check: does `userAnswer` match the canonical `expected` form?
 *
 * Empty / whitespace-only / non-string input returns `false` (never throws), so
 * an empty submission is simply "wrong", not a crash.
 */
export function checkAnswer(userAnswer: string, expected: string): boolean {
  if (typeof userAnswer !== 'string' || userAnswer.trim() === '') {
    return false;
  }
  return canonicalize(userAnswer) === canonicalize(expected);
}
