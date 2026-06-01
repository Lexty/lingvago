// Test-only helper: load the REAL extraction data (verbs_inventory.json +
// verbs_teacher.json) and project it into the `VerbData[]` the engine consumes,
// so the conjugation tests are grounded in shipped content rather than mocks.
//
// This mirrors how scripts/build-content.ts assembles the content stores: the
// inventory supplies group/regular/needsTableReview, and the teacher handout
// supplies the verified present table (joined by infinitive). It is a `.test-
// helper.ts` (not bundled) and is imported only by *.test.ts files.

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ConjugationForms } from '../../db/schema.ts';
import type { VerbData } from './conjugate.ts';

const here = dirname(fileURLToPath(import.meta.url));
/** Repo-root extraction dir (src/modes/conjugation → ../../../extraction). */
const EXTRACTION = resolve(here, '../../../extraction/normalized');

interface InventoryVerb {
  infinitive: string;
  group: string;
  reflexive: boolean;
  regular: boolean | null;
  hasTable: boolean;
  needsTableReview: boolean;
}

interface TeacherVerb {
  verb: string;
  tense: string;
  regular: boolean;
  group: string;
  forms: ConjugationForms & { vos?: string };
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(EXTRACTION, file), 'utf8')) as T;
}

/** The 5 canonical persons projected out of a teacher record (vós dropped). */
function fiveForms(forms: TeacherVerb['forms']): ConjugationForms {
  return {
    eu: forms.eu,
    tu: forms.tu,
    voce_ele_ela: forms.voce_ele_ela,
    nos: forms.nos,
    voces_eles_elas: forms.voces_eles_elas,
  };
}

/**
 * Build the full `VerbData[]` from real extraction data — exactly the join the
 * content pipeline performs (inventory ⨝ verified present table by infinitive).
 */
export function loadVerbData(): VerbData[] {
  const inventory = readJson<{ verbs: InventoryVerb[] }>('verbs_inventory.json');
  const teacher = readJson<{ verbs: TeacherVerb[] }>('verbs_teacher.json');

  const tableByInf = new Map<string, ConjugationForms>();
  for (const t of teacher.verbs) {
    if (t.tense === 'presente' && !tableByInf.has(t.verb)) {
      tableByInf.set(t.verb, fiveForms(t.forms));
    }
  }

  return inventory.verbs.map((v) => ({
    infinitive: v.infinitive,
    group: v.group,
    regular: v.regular === true,
    table: tableByInf.get(v.infinitive),
    needsTableReview: v.needsTableReview === true,
  }));
}

/** The verified present tables keyed by infinitive (for table== sample tests). */
export function loadTeacherTables(): Map<string, ConjugationForms> {
  const teacher = readJson<{ verbs: TeacherVerb[] }>('verbs_teacher.json');
  const out = new Map<string, ConjugationForms>();
  for (const t of teacher.verbs) {
    if (t.tense === 'presente' && !out.has(t.verb)) {
      out.set(t.verb, fiveForms(t.forms));
    }
  }
  return out;
}

/** Raw inventory rows (for needsTableReview / regular-null assertions). */
export function loadInventory(): InventoryVerb[] {
  return readJson<{ verbs: InventoryVerb[] }>('verbs_inventory.json').verbs;
}
