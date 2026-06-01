// DB-backed source for a ConjugationMode session (T8 Task 3): read the
// read-only content stores and project them into the engine `VerbData[]` via the
// PURE `projectVerbData` (kept in its own module so the e2e can import the
// projection without dragging the Dexie/React db barrel into Node).
//
// The content stores are READ-ONLY here — never written.

import { db } from '../../db/index.ts';
import type { VerbData } from './conjugate.ts';
import { projectVerbData } from './projectVerbData.ts';

/**
 * Read the read-only content stores and project them into `VerbData[]` (the
 * runtime source for a ConjugationMode session). Returns `[]` when content has
 * not been loaded yet, so the screen renders a graceful empty state rather than
 * crashing (error path).
 */
export async function loadVerbDataFromDb(): Promise<VerbData[]> {
  const [verbs, conjugationTables] = await Promise.all([
    db.verbs.toArray(),
    db.conjugationTables.toArray(),
  ]);
  return projectVerbData(verbs, conjugationTables);
}
