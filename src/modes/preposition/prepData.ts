// DB-backed source for a Preposition session (Task 3): read the read-only
// `prepositions` content store and hand it to the seeded session generator. The
// content store is READ-ONLY here — never written (mirrors gender/genderData.ts).

import { db } from '../../db/index.ts';
import type { PrepositionRecord } from '../../db/schema.ts';

/**
 * Read the read-only `prepositions` content store. Returns `[]` when content has
 * not been loaded yet, so the screen renders a graceful empty state rather than
 * crashing (error path). The §6.5 eligibility gate is applied later by the
 * session generator, not here.
 */
export async function loadPrepositionsFromDb(): Promise<PrepositionRecord[]> {
  return db.prepositions.toArray();
}
