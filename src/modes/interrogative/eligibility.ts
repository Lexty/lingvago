// Verified-key content-QA gate for the Interrogative cue-production drill (SPEC
// §6.5 / AC5). An `InterrogativeRecord` may seed a session item ONLY when its
// answer is objectively GRADEABLE — never an under-determined or self-leaking
// production prompt:
//
//   (a) ANSWER ↔ TABLE consistency: the record's `answer` must be a known
//       closed-class interrogative whose declared category matches the table
//       row, AND (for an agreeing form) the record's agreement features, reduced
//       to the SINGLE normalized vocabulary `{m|f, sg|pl}`, must equal the
//       table row's declared agreement. This proves the answer is the unique
//       interrogative consistent with its category/gloss + visible agreement —
//       the cue (gloss) plus the counted-noun gender+number / number make it
//       well-determined. A mislabeled row (answer disagreeing with category or
//       agreement) is EXCLUDED rather than shown as an ungradeable prompt.
//
//   (b) NO PREFIX/SUFFIX DUPLICATION: the gradeable fill the learner must type
//       is derived from `blankSentence` by re-inserting the answer into the
//       `___` slot and reading back the contiguous word-span the answer would
//       occupy. If a token printed immediately before/after the blank duplicates
//       the answer's leading/trailing word (e.g. a `De ___ és?` cloze for the
//       multi-word `de onde`), the surface no longer grades as `de onde` — the
//       fill the learner types is just `onde` — so `canonicalize(fill) !=
//       canonicalize(answer)` and the row is EXCLUDED. The corpus was cleaned
//       upstream (int:0055 re-blanked) but this gate is the durable guard since
//       `extraction/**` is read-only.
//
// An ineligible row is EXCLUDED here so it can never surface as a production
// prompt the drill cannot grade. The gate accepts loosely-typed input and
// returns `false` rather than throwing, so a malformed content row is dropped.

import type { InterrogativeRecord } from '../../db/schema.ts';
import { canonicalize } from '../shared/check.ts';
import {
  agreementEquals,
  normalizeAgreement,
  tableEntryFor,
} from './intData.ts';

// The blank slot is ANY run of 3+ underscores. The corpus mixes `___` (3) and
// `____` (4+) — both denote the same single fill slot — so the gate keys on the
// regex run, NOT a literal `___`, ensuring `___` and `____` behave identically
// and no stray `_` ever leaks into the gradeable fill (SPEC §6.5 / AC5).
const BLANK_RE = /_{3,}/;

/** Does `text` contain a blank slot (a run of 3+ underscores)? */
function hasBlank(text: string): boolean {
  return BLANK_RE.test(text);
}

/**
 * Split `blankSentence` into the surface printed BEFORE the blank slot and the
 * surface printed AFTER it. Matches the whole 3+-underscore run so no stray
 * underscore survives in either side (the root cause of the `____` leak).
 */
function splitOnBlank(blankSentence: string): { before: string; after: string } | null {
  const match = BLANK_RE.exec(blankSentence);
  if (match === null) {
    return null;
  }
  return {
    before: blankSentence.slice(0, match.index),
    after: blankSentence.slice(match.index + match[0].length),
  };
}

/**
 * Token-boundary helper shared by BOTH the before-blank and after-blank sides of
 * the duplication guard (§6.5 (b) / Q001): strip every non-letter/-digit/-space
 * character (punctuation: `?`, `!`, `.`, `,`, `:`, `—`, …) so a trailing answer
 * word followed by ANY punctuation is still detected, then canonicalize
 * (accent-fold + space-collapse, matching `check.ts`) and split into tokens.
 */
function boundaryTokens(text: string): string[] {
  return canonicalize(text.replace(/[^\p{L}\p{N}\s]/gu, ' '))
    .split(' ')
    .filter(Boolean);
}

/**
 * The canonical (verified) answer for `record`, or `null` if it is not a known
 * closed-class interrogative consistent with its declared category + agreement
 * (§6.5 (a)). This is the SINGLE source of the answer key — the session
 * generator uses it so an answer is never read blindly but always proven against
 * the static table.
 */
export function reconstructAnswer(
  record: Partial<InterrogativeRecord> | null | undefined,
): string | null {
  if (record == null) {
    return null;
  }
  const { answer, category } = record;
  if (typeof answer !== 'string' || answer.trim() === '') {
    return null;
  }
  const entry = tableEntryFor(answer);
  if (entry === null) {
    return null;
  }
  // Category must match the table (rejects a mislabeled row).
  if (typeof category !== 'string' || category !== entry.category) {
    return null;
  }
  // Agreement (reduced to the single normalized vocabulary) must match.
  const itemAgreement = normalizeAgreement(record.agreement);
  const tableAgreement = normalizeAgreement(entry.agreement);
  if (!agreementEquals(itemAgreement, tableAgreement)) {
    return null;
  }
  return entry.form;
}

/**
 * The gradeable fill the learner must type, derived from `blankSentence` by
 * re-inserting `answer` into the blank slot (any run of 3+ underscores, so `___`
 * and `____` behave identically) and reading back the contiguous span the answer
 * occupies (§6.5 (b)). For a single-word answer this is just the
 * answer. For a multi-word answer (`de onde`, `para onde`, `o que`) any token
 * printed adjacent to the blank that duplicates the answer's leading/trailing
 * word collapses the gradeable span — exposing a self-leaking cloze.
 *
 * Returns `null` if the sentence has no blank slot.
 */
export function gradeableFill(
  blankSentence: string,
  answer: string,
): string | null {
  if (typeof blankSentence !== 'string') {
    return null;
  }
  const split = splitOnBlank(blankSentence);
  if (split === null) {
    return null;
  }
  const answerWords = canonicalize(answer).split(' ').filter(Boolean);
  if (answerWords.length === 0) {
    return null;
  }
  // Tokens of the sentence around the blank, via the SHARED token-boundary
  // helper so both sides fold accents/spacing AND strip ALL punctuation (Q001).
  const beforeTokens = boundaryTokens(split.before);
  const afterTokens = boundaryTokens(split.after);

  // Count how many leading answer-words are already printed BEFORE the blank
  // (a prefix duplication, e.g. `De ___ és?` for `de onde`).
  let leadDup = 0;
  while (
    leadDup < answerWords.length &&
    beforeTokens.length - leadDup - 1 >= 0 &&
    beforeTokens[beforeTokens.length - 1 - leadDup] === answerWords[leadDup]
  ) {
    leadDup += 1;
  }
  // Count how many trailing answer-words are already printed AFTER the blank
  // (a suffix duplication).
  let trailDup = 0;
  while (
    trailDup < answerWords.length &&
    afterTokens[trailDup] === answerWords[answerWords.length - 1 - trailDup]
  ) {
    trailDup += 1;
  }

  // The fill the learner actually types is the answer-span MINUS any words the
  // cloze already prints adjacent to the blank.
  const fillWords = answerWords.slice(leadDup, answerWords.length - trailDup);
  return fillWords.join(' ');
}

/**
 * Is `record` eligible for an Interrogative production/MC item? (SPEC §6.5 /
 * AC5.) Eligible ⇔
 *   - it has a blank slot (a run of 3+ underscores, `___` or `____`), AND
 *   - its answer reconstructs (category + normalized agreement consistent), AND
 *   - the gradeable fill derived from `blankSentence` canonicalizes to the
 *     answer (no prefix/suffix duplication).
 *
 * Any failure EXCLUDES the row rather than emitting an ungradeable prompt.
 */
export function isInterrogativeEligible(
  record: Partial<InterrogativeRecord> | null | undefined,
): boolean {
  if (record == null) {
    return false;
  }
  const { blankSentence } = record;
  if (typeof blankSentence !== 'string' || !hasBlank(blankSentence)) {
    return false;
  }
  const answer = reconstructAnswer(record);
  if (answer === null) {
    return false;
  }
  const fill = gradeableFill(blankSentence, answer);
  if (fill === null) {
    return false;
  }
  return canonicalize(fill) === canonicalize(answer);
}

/** Keep only the verified-eligible records (the §6.5 gate, applied). */
export function filterInterrogativeEligible(
  records: readonly InterrogativeRecord[],
): InterrogativeRecord[] {
  return records.filter((r) => isInterrogativeEligible(r));
}
