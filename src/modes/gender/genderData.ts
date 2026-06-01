// DB-backed source for a GenderArticle session (Task 2): read the read-only
// `nouns` content store and hand it to the seeded session generator. The content
// store is READ-ONLY here — never written (mirrors conjugation/verbData.ts).

import { db } from '../../db/index.ts';
import type { NounRecord } from '../../db/schema.ts';

/**
 * Read the read-only `nouns` content store. Returns `[]` when content has not
 * been loaded yet, so the screen renders a graceful empty state rather than
 * crashing (error path). The §6.5 eligibility gate is applied later by the
 * session generator, not here.
 */
export async function loadNounsFromDb(): Promise<NounRecord[]> {
  return db.nouns.toArray();
}
