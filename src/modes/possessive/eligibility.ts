// Verified-key content-QA gate for the Possessive cue-production drill (SPEC §6.5
// / AC5). A `PossessiveRecord` may seed a session item ONLY when its answer is
// objectively RECONSTRUCTIBLE from its cue + labels — never guessed:
//
//   - determiner: reconstructible from `(person, possessedGender, possessedNumber)`
//     against the closed-class paradigm (`determinerForm`). The reconstructed
//     form MUST equal the record's stored `answer`, else the row is a data error
//     and is EXCLUDED rather than shown as an ungradeable production prompt.
//   - dele family: reconstructible from the OWNER cue derived from the answer
//     (`dele`→ele, `dela`→ela, …). Because the dele cue is the OWNER (not the
//     collapsed `ele·ela·você` person), `dele` vs `dela` is determinable —
//     this is the collision the owner cue fixes (AC5).
//
// A genuinely non-reconstructible row is EXCLUDED here so it can never surface
// as a production question the drill cannot grade. Mirrors the Preposition /
// GenderArticle §6.5 gates: a wrong/ambiguous key is more dangerous than a
// missing item. The gate accepts loosely-typed input and returns `false` rather
// than throwing, so a malformed content row is simply dropped.

import type { PossessiveContextRecord, PossessiveRecord } from '../../db/schema.ts';
import { canonicalize } from '../shared/check.ts';
import {
  determinerForm,
  isInPossessiveInventory,
  isPossKind,
  ownerForDele,
  POSS_PERSONS,
  type PossPerson,
} from './possData.ts';

/** Is `person` one of the six closed-class persons? */
export function isPossPerson(person: unknown): person is PossPerson {
  return typeof person === 'string' && (POSS_PERSONS as readonly string[]).includes(person);
}

/**
 * Reconstruct the verified answer for `record` from its cue + labels, or `null`
 * if it is not reconstructible (§6.5). This is the SINGLE source of the answer
 * key — the session generator uses it so an item's answer is never read blindly
 * from the row but always proven against the paradigm / dele family.
 */
export function reconstructAnswer(
  record: Partial<PossessiveRecord> | null | undefined,
): string | null {
  if (record == null) {
    return null;
  }
  const { kind, person, possessedGender, possessedNumber, answer } = record;
  if (typeof answer !== 'string' || answer.trim() === '') {
    return null;
  }
  if (!isPossKind(kind)) {
    return null;
  }

  if (kind === 'determiner') {
    if (!isPossPerson(person)) {
      return null;
    }
    if (possessedGender !== 'm' && possessedGender !== 'f') {
      return null;
    }
    if (possessedNumber !== 'sg' && possessedNumber !== 'pl') {
      return null;
    }
    return determinerForm(person, possessedGender, possessedNumber);
  }

  // dele family: the answer itself names the owner; reconstruct from it so the
  // owner cue (ele/ela/eles/elas) deterministically maps back to this one form.
  const owner = ownerForDele(answer.trim().toLowerCase());
  return owner === null ? null : answer.trim().toLowerCase();
}

/**
 * Is `record` eligible for a Possessive production/MC item? (SPEC §6.5 / AC5.)
 *
 * Eligible ⇔ it has a `___` blank AND its answer is reconstructible from the cue
 * AND the reconstructed form matches the stored `answer` (canonical compare).
 * The match guard catches a mislabeled row (e.g. `person`/`gender` disagreeing
 * with `answer`) and excludes it rather than emitting a wrong key.
 */
export function isPossessiveEligible(
  record: Partial<PossessiveRecord> | null | undefined,
): boolean {
  if (record == null) {
    return false;
  }
  const { blankSentence, answer } = record;
  if (typeof blankSentence !== 'string' || !blankSentence.includes('___')) {
    return false;
  }
  const reconstructed = reconstructAnswer(record);
  if (reconstructed === null || typeof answer !== 'string') {
    return false;
  }
  return canonicalize(reconstructed) === canonicalize(answer);
}

/** Keep only the verified-eligible records (the §6.5 gate, applied). */
export function filterPossessiveEligible(
  records: readonly PossessiveRecord[],
): PossessiveRecord[] {
  return records.filter((r) => isPossessiveEligible(r));
}

// ── CONTEXT (L3) eligibility — a SEPARATE path (AC4) ─────────────────────────
//
// A {@link PossessiveContextRecord} is the HARD L3 tier: the owner is inferred
// from a two-turn `dialogue`, NOT from a person cue. Its answer is AUTHORED and
// context-decided (e.g. `vosso`/`seu` are chosen BY the dialogue), so it is
// CRUCIALLY NOT routed through `reconstructAnswer`/`filterPossessiveEligible`:
// those PROVE the answer from person+gender+number against the closed paradigm,
// which is correct for cue-based L1/L2 but WRONG here (it would reject or
// mis-key a context answer the labels can't derive).
//
// HONESTY STORY (must be documented): for a context item the "objectively
// gradeable" guarantee rests on the OFFLINE codex uniqueness verification of the
// dataset (the answer is the UNIQUE natural EP form for that dialogue) — NOT on
// runtime reconstruction. The only runtime guard is structural: exactly one
// `___` blank + a non-empty `answer` that is a real possessive surface (in the
// {@link POSSESSIVE_INVENTORY}). A learner who types a linguistically-defensible
// alternative is graded (exact-match) against the one authored answer. To keep a
// bad authored row from ever shipping, the Task-1 build-time `buildContext`
// builder ALSO fail-loud-asserts the same structural invariants; this runtime
// gate is the defensive twin that simply SKIPS a malformed row, never shows it.

/** Count of `___` blank slots in a string (the context gate needs EXACTLY one). */
function blankCount(text: string): number {
  return text.split('___').length - 1;
}

/**
 * Is `record` eligible for a CONTEXT (L3) drill item (AC4)?
 *
 * Eligible ⇔ the `dialogue` has EXACTLY one `___` blank AND `answer` is a
 * non-empty possessive surface in the closed-class inventory (determiner + dele
 * forms). This is exact-match graded against that single authored answer — there
 * is NO paradigm reconstruction (see the honesty story above). Accepts loosely-
 * typed input and returns `false` (never throws) so a malformed row is dropped.
 */
export function isContextEligible(
  record: Partial<PossessiveContextRecord> | null | undefined,
): boolean {
  if (record == null) {
    return false;
  }
  const { dialogue, answer } = record;
  if (typeof dialogue !== 'string' || blankCount(dialogue) !== 1) {
    return false;
  }
  if (typeof answer !== 'string' || answer.trim() === '') {
    return false;
  }
  return isInPossessiveInventory(answer);
}

/** Keep only the context-eligible records (the §6.5 context gate, applied). */
export function filterContextEligible(
  records: readonly PossessiveContextRecord[],
): PossessiveContextRecord[] {
  return records.filter((r) => isContextEligible(r));
}
