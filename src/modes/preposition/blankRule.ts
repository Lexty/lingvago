// The DETERMINISTIC blank rule for the Preposition cloze drill (SPEC §6.5
// verified-key gate / WP-C Task 3, AC3 — the CRUX of this mode).
//
// A cloze item may be built from a `PrepositionRecord` ONLY when the verified
// `prep` form occurs EXACTLY ONCE as a CLEAN TOKEN in a chosen `example`. That
// single occurrence is blanked and the verified key IS the `prep` form — never
// guessed. Records whose `prep` occurs ≠ 1 time, or whose `prep` is a compound
// locução that does not match a single clean token run in any example (e.g.
// `em frente de` whereas the example writes the contracted `em frente da`), are
// EXCLUDED. This is a pure, testable function: occurrence-count == 1 ⇒
// buildable; else excluded.
//
// "CLEAN TOKEN" (pinned here, asserted by blankRule.test.ts):
//   - Tokens are the maximal runs of letters/digits of the ACCENT-FOLDED,
//     case-folded text (the SHARED `check.ts` normalization owns the accent +
//     case policy, so `à`/`A` and `a` are the SAME token — exactly the policy
//     the objective check uses). Punctuation, hyphens, and whitespace are token
//     BOUNDARIES.
//   - A single-word prep (`a`, `de`, `em`, `para`) matches one token by WHOLE-
//     WORD equality on its folded key — so `de` matches the word `de` but NEVER
//     the `de` inside `desde` or `cidade` (word-boundary semantics, explicit).
//   - A multi-word prep (a locução like `longe de`, `em frente de`) matches a
//     CONTIGUOUS run of whole tokens equal, in order, to the prep's folded
//     tokens. `em frente de` therefore does NOT match `em frente da` (the
//     contracted `da` ≠ the token `de`), so that record is excluded — exactly
//     the §6.5 compound-locução exclusion AC3 calls out.

import { canonicalize } from '../shared/check.ts';

/**
 * Tokenize `text` into clean tokens: the accent-/case-folded surface split on
 * any run of non-alphanumeric characters. Mirrors the shared canonicalization
 * (fold first) so token identity matches the objective check's accent policy.
 */
export function cleanTokens(text: string): string[] {
  if (typeof text !== 'string') {
    return [];
  }
  // Fold accents + case via the shared policy, THEN split on non-alphanumerics
  // (punctuation/hyphen/space are all boundaries). Empty runs are dropped.
  return canonicalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

/**
 * Count how many times `prep` occurs as a CLEAN TOKEN (whole-word, or a
 * contiguous whole-token run for a multi-word locução) in `example`.
 *
 * Returns 0 for empty/malformed input rather than throwing, so a bad record is
 * simply not buildable (it never crashes the gate).
 */
export function cleanTokenOccurrences(prep: string, example: string): number {
  const prepTokens = cleanTokens(prep);
  if (prepTokens.length === 0) {
    return 0;
  }
  const exTokens = cleanTokens(example);
  const n = prepTokens.length;
  if (exTokens.length < n) {
    return 0;
  }

  let count = 0;
  for (let i = 0; i + n <= exTokens.length; i++) {
    let match = true;
    for (let j = 0; j < n; j++) {
      if (exTokens[i + j] !== prepTokens[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      count++;
    }
  }
  return count;
}

/**
 * Is `prep` blankable in `example`? True iff it occurs EXACTLY ONCE as a clean
 * token (AC3 occurrence-count == 1 rule).
 */
export function isBlankable(prep: string, example: string): boolean {
  return cleanTokenOccurrences(prep, example) === 1;
}

/**
 * The deterministically-chosen blankable example for `prep` among `examples`:
 * the FIRST example (in source order) in which `prep` occurs exactly once as a
 * clean token, or `null` when no example yields an unambiguous single blank
 * (the record is then EXCLUDED, §6.5).
 *
 * Source order is the stable, content-authored order, so the choice is
 * reproducible without any randomness.
 */
export function chooseBlankExample(
  prep: string,
  examples: readonly string[],
): string | null {
  if (!Array.isArray(examples)) {
    return null;
  }
  for (const example of examples) {
    if (typeof example === 'string' && isBlankable(prep, example)) {
      return example;
    }
  }
  return null;
}

/** The result of applying the blank rule: the example, blanked, + the key. */
export interface BlankedCloze {
  /** The chosen source example (unmodified). */
  example: string;
  /** The example with the single clean-token occurrence replaced by the blank. */
  cloze: string;
  /** The verified key (the prep form) — the objective-check answer. */
  answer: string;
}

/** The blank token rendered in the cloze prompt. */
export const BLANK = '___';

/**
 * Build the blanked cloze for `prep` in `example` IF it is blankable (exactly
 * one clean-token occurrence), else `null`. The replaced run preserves the
 * surrounding text and punctuation; only the matched token run becomes `BLANK`.
 *
 * Pure + deterministic: no randomness, no DB.
 */
export function buildCloze(prep: string, example: string): BlankedCloze | null {
  if (typeof prep !== 'string' || typeof example !== 'string') {
    return null;
  }
  if (!isBlankable(prep, example)) {
    return null;
  }

  const prepTokens = cleanTokens(prep);
  const cloze = replaceTokenRun(example, prepTokens);
  if (cloze === null) {
    return null;
  }
  return { example, cloze, answer: prep };
}

/**
 * Replace the (single, already-verified) contiguous run of clean tokens equal
 * to `prepTokens` in `original` with `BLANK`, walking the ORIGINAL surface so
 * the surrounding casing/punctuation is preserved. Returns `null` defensively
 * if the run cannot be located on the original surface.
 */
function replaceTokenRun(original: string, prepTokens: readonly string[]): string | null {
  const n = prepTokens.length;
  if (n === 0) {
    return null;
  }

  // Walk the ORIGINAL string char-by-char, collecting maximal runs whose FOLDED
  // form is alphanumeric — the SAME token boundary `cleanTokens` uses — so the
  // token-run match maps back to exact char offsets and never diverges from the
  // occurrence count.
  const runs: { start: number; end: number; key: string }[] = [];
  let runStart = -1;
  for (let i = 0; i <= original.length; i++) {
    const isAlnum = i < original.length && /[a-z0-9]/.test(canonicalize(original[i]));
    if (isAlnum && runStart === -1) {
      runStart = i;
    } else if (!isAlnum && runStart !== -1) {
      const slice = original.slice(runStart, i);
      const key = canonicalize(slice);
      if (key.length > 0) {
        runs.push({ start: runStart, end: i, key });
      }
      runStart = -1;
    }
  }

  for (let i = 0; i + n <= runs.length; i++) {
    let match = true;
    for (let j = 0; j < n; j++) {
      if (runs[i + j].key !== prepTokens[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      const start = runs[i].start;
      const end = runs[i + n - 1].end;
      return original.slice(0, start) + BLANK + original.slice(end);
    }
  }
  return null;
}
