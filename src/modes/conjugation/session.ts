// ConjugationMode session generator (SPEC §1.2 + §6.1 deterministic/seeded; T8
// AC4/AC5/AC6).
//
// A seed → a reproducible sequence of drill items over the EXAM-ELIGIBLE verbs
// only (the §6.5 gate is applied up front, so a `needsTableReview` verb or an
// irregular-without-table verb can NEVER appear). Two task types are produced:
//   - 'fill-form'      : a person + infinitive prompt → the learner types the
//                        single present form for that person.
//   - 'assemble-table' : the learner types all 5 present forms.
//
// Every item carries a `source` ref (the verb table / inventory entry it came
// from) AND a meaningful natural-context `prompt` (subject pronoun + verb), so a
// test can assert prompts are GROUNDED, not random nonsense (plan-review note 2).
// The deterministic path uses ONLY the seeded PRNG — never `Math.random()`.

import type { ConjugationForms } from '../../db/schema.ts';
import { createPrng } from '../numbers/prng.ts';
import { conjugate, conjugateTable, type VerbData } from './conjugate.ts';
import { filterExamEligible } from './eligibility.ts';
import { PERSONS, pronounFor, type Person } from './persons.ts';

/** Which kind of conjugation task an item drills (also the mastery subskill). */
export type ConjugationTaskType = 'fill-form' | 'assemble-table';

/** Where a generated prompt is grounded (plan-review note 2: traceability). */
export interface ConjugationSource {
  /** Stable content id of the originating verb (`verb:<infinitive>`). */
  verbId: string;
  /** The infinitive the prompt was built from. */
  infinitive: string;
  /**
   * How the reference answer was derived: `table` (verbatim verified table) or
   * `rule` (regular EP endings). Lets a test assert grounding.
   */
  derivation: 'table' | 'rule';
}

/** A single 'fill-form' item: one person of one verb. */
export interface FillFormItem {
  id: string;
  type: 'fill-form';
  infinitive: string;
  person: Person;
  /** Natural exam prompt (subject pronoun + infinitive), e.g. `eu (falar)`. */
  prompt: string;
  /** Canonical expected present form for `person`. */
  expected: string;
  source: ConjugationSource;
}

/** A single 'assemble-table' item: all 5 present forms of one verb. */
export interface AssembleTableItem {
  id: string;
  type: 'assemble-table';
  infinitive: string;
  /** The persons to fill, in canonical order. */
  persons: readonly Person[];
  /** Natural exam prompt naming the verb. */
  prompt: string;
  /** Canonical expected 5-person table. */
  expected: ConjugationForms;
  source: ConjugationSource;
}

/** One generated conjugation drill item (discriminated by `type`). */
export type ConjugationItem = FillFormItem | AssembleTableItem;

/** Tunable session shape; safe defaults cover a short mixed drill. */
export interface SessionConfig {
  /** Number of items to generate (clamped to ≥ 1). */
  count: number;
  /** Probability (0..1) that any given item is an assemble-table task. */
  tableShare: number;
}

/** Default mixed session: mostly single-form, some assemble-table. */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  count: 10,
  tableShare: 0.3,
};

/** The derivation source of an eligible verb (table verbatim vs. rule). */
function derivationOf(verb: VerbData): ConjugationSource['derivation'] {
  return verb.table ? 'table' : 'rule';
}

function sourceOf(verb: VerbData): ConjugationSource {
  return {
    verbId: `verb:${verb.infinitive}`,
    infinitive: verb.infinitive,
    derivation: derivationOf(verb),
  };
}

/**
 * Generate a deterministic ConjugationMode session for `seed` over the
 * exam-eligible subset of `verbs`.
 *
 * Same `seed` + same `verbs` + same `config` ⇒ byte-identical item list (no
 * `Math.random()`). The §6.5 gate is applied here: ineligible verbs are dropped
 * before any item is built, so they can never appear.
 *
 * Returns `[]` when no verb is eligible (the caller treats an empty session
 * gracefully — never a crash).
 */
export function generateSession(
  seed: string | number,
  verbs: readonly VerbData[],
  config: Partial<SessionConfig> = {},
): ConjugationItem[] {
  const cfg: SessionConfig = { ...DEFAULT_SESSION_CONFIG, ...config };
  const count = Math.max(1, Math.floor(cfg.count));
  const eligible = filterExamEligible(verbs);
  if (eligible.length === 0) {
    return [];
  }

  const prng = createPrng(seed);
  const items: ConjugationItem[] = [];

  for (let i = 0; i < count; i++) {
    const verb = eligible[prng.intBetween(0, eligible.length - 1)];
    const id = `${String(seed)}-${i}`;
    const source = sourceOf(verb);
    const isTable = prng.next() < cfg.tableShare;

    if (isTable) {
      items.push({
        id,
        type: 'assemble-table',
        infinitive: verb.infinitive,
        persons: PERSONS,
        prompt: `${verb.infinitive} (presente)`,
        expected: conjugateTable(verb),
        source,
      });
    } else {
      const person = PERSONS[prng.intBetween(0, PERSONS.length - 1)];
      items.push({
        id,
        type: 'fill-form',
        infinitive: verb.infinitive,
        person,
        prompt: `${pronounFor(person)} (${verb.infinitive})`,
        expected: conjugate(verb, person),
        source,
      });
    }
  }

  return items;
}
