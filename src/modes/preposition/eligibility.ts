// Verified-key content-QA gate for the Preposition cloze drill (SPEC §6.5 / Task
// 3 AC3 «verified-key gate»). A `PrepositionRecord` may seed a session item ONLY
// when:
//   - its `category` is one of the three verified sub-skills (tempo / movimento /
//     lugar — `transporte` is NOT in the data and is NOT added), AND
//   - its `prep` form is a non-empty string, AND
//   - the DETERMINISTIC blank rule (AC3) yields a blankable example: `prep`
//     occurs EXACTLY ONCE as a clean token in at least one `example`.
//
// Everything else is EXCLUDED and must never surface in a session — most
// notably compound locuções (`em frente de`) whose examples write the
// contracted form (`em frente da`) and so have NO single clean-token blank.
// Mirrors the GenderArticle §6.5 gate: a wrong/ambiguous key is more dangerous
// than a missing item.

import type { PrepositionRecord } from '../../db/schema.ts';
import { chooseBlankExample } from './blankRule.ts';

/** The three verified preposition sub-skills (§4.x). `transporte` is excluded. */
export const PREP_CATEGORIES = ['tempo', 'movimento', 'lugar'] as const;

/** A verified preposition sub-skill / mastery sub-axis. */
export type PrepCategory = (typeof PREP_CATEGORIES)[number];

/** Is `category` one of the three verified sub-skills? */
export function isPrepCategory(category: unknown): category is PrepCategory {
  return (
    typeof category === 'string' &&
    (PREP_CATEGORIES as readonly string[]).includes(category)
  );
}

/**
 * Is `record` eligible for a Preposition session? (SPEC §6.5 / AC3.)
 *
 * Eligible ⇔ verified category AND non-empty `prep` AND a blankable example
 * exists (the AC3 occurrence-count == 1 rule). Accepts loosely-typed input (a
 * content row whose fields might be malformed) and returns `false` rather than
 * throwing, so a bad/compound row is simply excluded.
 */
export function isPrepositionEligible(
  record: Partial<PrepositionRecord> | null | undefined,
): boolean {
  if (record == null) {
    return false;
  }
  const { category, prep, examples } = record;
  if (!isPrepCategory(category)) {
    return false;
  }
  if (typeof prep !== 'string' || prep.trim() === '') {
    return false;
  }
  if (!Array.isArray(examples)) {
    return false;
  }
  return chooseBlankExample(prep, examples) !== null;
}

/** Keep only the verified-eligible records (the §6.5 gate, applied). */
export function filterPrepositionEligible(
  records: readonly PrepositionRecord[],
): PrepositionRecord[] {
  return records.filter((r) => isPrepositionEligible(r));
}
