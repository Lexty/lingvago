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

import type { PossessiveRecord } from '../../db/schema.ts';
import { canonicalize } from '../shared/check.ts';
import {
  determinerForm,
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
