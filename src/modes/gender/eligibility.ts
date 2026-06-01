// Verified-key content-QA gate for the GenderArticle drill (SPEC §6.5 / Task 2
// AC «verified-key gate»). A noun may seed a session item ONLY when its article
// key is verified and unambiguous:
//   - `gender` is exactly `'m'` or `'f'`, AND
//   - `article` is exactly `'o'` or `'a'`, AND
//   - `gender`/`article` AGREE (m↔o, f↔a) — a row whose two fields disagree is
//     internally inconsistent and its article key cannot be trusted.
//
// Everything else is EXCLUDED and must never surface in a session, mirroring the
// ConjugationMode §6.5 gate (a wrong key is more dangerous than a missing item).

import type { NounRecord } from '../../db/schema.ts';

/** The article a verified gender implies (m → o, f → a). */
const ARTICLE_FOR_GENDER: Record<'m' | 'f', 'o' | 'a'> = { m: 'o', f: 'a' };

/**
 * Is `noun` eligible for a GenderArticle session? (SPEC §6.5.)
 *
 * Eligible ⇔ gender ∈ {m,f} AND article ∈ {o,a} AND they agree. Accepts
 * loosely-typed input (a content row whose fields might be malformed) and
 * returns `false` rather than throwing, so a bad row is simply excluded.
 */
export function isGenderEligible(noun: Partial<NounRecord> | null | undefined): boolean {
  if (noun == null) {
    return false;
  }
  const { gender, article } = noun;
  if (gender !== 'm' && gender !== 'f') {
    return false;
  }
  if (article !== 'o' && article !== 'a') {
    return false;
  }
  return ARTICLE_FOR_GENDER[gender] === article;
}

/** Keep only the verified-eligible nouns from `nouns` (the §6.5 gate, applied). */
export function filterGenderEligible(nouns: readonly NounRecord[]): NounRecord[] {
  return nouns.filter((n) => isGenderEligible(n));
}
