// PURE projection of the read-only content records (`verbs` ⨝
// `conjugationTables`) into the engine `VerbData[]` (T8 Task 3). Kept free of any
// DB / React import so it is safe to import into the Playwright Node e2e process
// (which recomputes the expected session from the shipped bundle JSON) — exactly
// like the pure `session.ts` engine.
//
// This is the SAME join the content pipeline performed at build time, replayed
// at read time: the inventory row supplies group / regular / needsTableReview,
// and the verified present table (when one exists) supplies the verbatim forms.

import type { ConjugationTableRecord, VerbRecord } from '../../db/schema.ts';
import type { VerbData } from './conjugate.ts';

/**
 * Build the engine `VerbData[]` by joining verb-inventory rows with their
 * verified present tables (by infinitive).
 *
 * Pure and order-STABLE: the output is sorted by infinitive, so the order is
 * independent of how the caller iterated storage (DB `toArray()` key order vs.
 * bundle-array order). This keeps a seeded session reproducible regardless of
 * the read source (the screen reads the DB; the e2e reads the bundle JSON). The
 * eligibility gate (§6.5) is applied later by the session generator, not here.
 */
export function projectVerbData(
  verbs: readonly VerbRecord[],
  conjugationTables: readonly ConjugationTableRecord[],
): VerbData[] {
  const tableByInf = new Map<string, ConjugationTableRecord['forms']>();
  for (const t of conjugationTables) {
    if (t.tense === 'presente' && !tableByInf.has(t.infinitive)) {
      tableByInf.set(t.infinitive, t.forms);
    }
  }

  const sorted = [...verbs].sort((a, b) =>
    a.infinitive < b.infinitive ? -1 : a.infinitive > b.infinitive ? 1 : 0,
  );
  return sorted.map((v) => {
    const table = tableByInf.get(v.infinitive);
    const data: VerbData = {
      infinitive: v.infinitive,
      group: v.group,
      regular: v.regular === true,
      needsTableReview: v.needsTableReview === true,
    };
    if (table) {
      data.table = table;
    }
    return data;
  });
}
