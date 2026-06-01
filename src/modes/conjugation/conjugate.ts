// Present-tense conjugation engine (SPEC §1.2 / T8 AC1).
//
// Two sources of truth, never mixed:
//   - REGULAR verbs (group -ar / -er / -ir) are conjugated BY RULE from the EP
//     present endings. The stem is the infinitive minus its 2-letter group
//     ending; reflexive verbs (`-se`) and the `pôr`/`-or` group are NOT covered
//     by the rule.
//   - IRREGULAR verbs are read VERBATIM from the verified `conjugationTables`
//     store (verbs_teacher handout). An irregular form is NEVER guessed — if no
//     verified table exists the engine refuses (see eligibility.ts §6.5 gate).
//
// EP present endings by group (5 persons, vós dropped):
//   -ar → o / as / a  / amos / am
//   -er → o / es / e  / emos / em
//   -ir → o / es / e  / imos / em
//
// Orthographic eu-form spelling changes (EP present indicativo). The endings
// above are appended to the bare stem (infinitive minus its 2-letter group), but
// for the eu form the stem's final consonant must change to preserve the
// soft /s/ or /ʒ/ sound before the back vowel `o` — otherwise the rule would
// emit a MISSPELLED form (e.g. `conhecer` → wrong `conheco`, correct `conheço`):
//   -cer  → eu -ço  (conhecer → conheço)
//   -ger  → eu -jo  (proteger → protejo)
//   -gir  → eu -jo  (dirigir  → dirijo)
//   -guir → eu -go  (the silent `u` is dropped before `o`: distinguir → distingo)
// (Stem-changing -guir verbs such as seguir/conseguir are IRREGULAR and come
// from a verified table, never this rule.) These are the only present-indicativo
// eu orthographic changes; the other classic spelling changes (-car/-gar/-çar)
// affect the preterite/subjunctive, NOT the present indicativo, so they need no
// handling here.

import type { ConjugationForms } from '../../db/schema.ts';
import { PERSONS, isPerson, type Person } from './persons.ts';

/** A regular conjugation group the RULE can handle. */
export type RegularGroup = '-ar' | '-er' | '-ir';

/** Per-person regular present endings, keyed by group. */
const REGULAR_ENDINGS: Record<RegularGroup, ConjugationForms> = {
  '-ar': { eu: 'o', tu: 'as', voce_ele_ela: 'a', nos: 'amos', voces_eles_elas: 'am' },
  '-er': { eu: 'o', tu: 'es', voce_ele_ela: 'e', nos: 'emos', voces_eles_elas: 'em' },
  '-ir': { eu: 'o', tu: 'es', voce_ele_ela: 'e', nos: 'imos', voces_eles_elas: 'em' },
};

/** True when `group` is one the regular RULE can conjugate. */
export function isRegularGroup(group: string): group is RegularGroup {
  return group === '-ar' || group === '-er' || group === '-ir';
}

/**
 * Apply the EP present-indicativo orthographic spelling change to the eu form
 * of a regular verb whose stem would otherwise be misspelled before the `o`
 * ending. Returns the corrected eu form, or `null` when the verb needs no
 * change (in which case the caller appends the plain `o` ending).
 *
 * Only the eu form is affected in the present indicativo:
 *   - `-cer`  → `…ço`  (conhecer → conheço)
 *   - `-ger`  → `…jo`  (proteger → protejo)
 *   - `-gir`  → `…jo`  (dirigir  → dirijo)
 *   - `-guir` → `…go`  (drop the silent `u`: distinguir → distingo)
 */
function regularEuForm(inf: string): string | null {
  if (inf.endsWith('cer')) {
    return `${inf.slice(0, -3)}ço`;
  }
  if (inf.endsWith('guir')) {
    return `${inf.slice(0, -4)}go`;
  }
  if (inf.endsWith('ger') || inf.endsWith('gir')) {
    return `${inf.slice(0, -3)}jo`;
  }
  return null;
}

/**
 * Minimal verb facts needed to conjugate, mirroring the content stores. The
 * caller (the screen / a test) assembles this from the `verbs` and
 * `conjugationTables` stores; this module stays pure and DB-free.
 */
export interface VerbData {
  infinitive: string;
  /** Conjugation group (`-ar` / `-er` / `-ir` / `-or`). */
  group: string;
  /** Whether the verb conjugates by the regular endings rule. */
  regular: boolean;
  /** Verified present-tense table, when one exists (irregulars require it). */
  table?: ConjugationForms;
  /** Excluded from exam (needsTableReview); never conjugated for a drill. */
  needsTableReview?: boolean;
}

/** Error thrown when a conjugation cannot be produced from a trusted source. */
export class ConjugationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConjugationError';
  }
}

/**
 * Conjugate one regular verb form BY RULE. The verb MUST be a regular -ar/-er/-ir
 * verb whose infinitive ends in that group's 2-letter ending; reflexive (`-se`)
 * infinitives are rejected (the rule conjugates the base verb only).
 *
 * @throws {ConjugationError} for a non-regular group, a wrong-ending infinitive,
 *   or an invalid person — never returns a guessed form.
 */
export function conjugateRegular(infinitive: string, person: Person): string {
  if (typeof infinitive !== 'string' || infinitive.trim() === '') {
    throw new ConjugationError('conjugateRegular: empty infinitive');
  }
  if (!isPerson(person)) {
    throw new ConjugationError(`conjugateRegular: invalid person "${String(person)}"`);
  }
  const inf = infinitive.trim().toLowerCase();
  const group = inf.slice(-2);
  if (!isRegularGroup(`-${group}`)) {
    throw new ConjugationError(
      `conjugateRegular: "${infinitive}" is not a regular -ar/-er/-ir infinitive`,
    );
  }
  const stem = inf.slice(0, -2);
  if (stem === '') {
    throw new ConjugationError(`conjugateRegular: "${infinitive}" has no stem`);
  }
  // The eu form may need an orthographic spelling change so the rule never
  // emits a misspelled form (conhecer → conheço, not conheco).
  if (person === 'eu') {
    const eu = regularEuForm(inf);
    if (eu !== null) {
      return eu;
    }
  }
  return stem + REGULAR_ENDINGS[`-${group}` as RegularGroup][person];
}

/**
 * Produce the present-tense form of `verb` for `person` (T8 AC1).
 *
 * - REGULAR verb (rule-eligible group) → conjugated by rule.
 * - IRREGULAR verb → read verbatim from its verified `table`.
 *
 * @throws {ConjugationError} when the form cannot be produced from a trusted
 *   source: an invalid person, a `needsTableReview` verb, or an irregular verb
 *   WITHOUT a verified table (never a guess — SPEC §6.5).
 */
export function conjugate(verb: VerbData, person: Person): string {
  if (!isPerson(person)) {
    throw new ConjugationError(`conjugate: invalid person "${String(person)}"`);
  }
  if (verb.needsTableReview === true) {
    throw new ConjugationError(
      `conjugate: "${verb.infinitive}" needs table review — refusing to emit an unverified form`,
    );
  }
  // A verified table always wins (it is the trusted, verbatim source) and is
  // REQUIRED for any irregular verb.
  if (verb.table) {
    return verb.table[person];
  }
  if (verb.regular && isRegularGroup(verb.group) && !verb.infinitive.includes('-')) {
    return conjugateRegular(verb.infinitive, person);
  }
  throw new ConjugationError(
    `conjugate: "${verb.infinitive}" is irregular without a verified table — refusing to guess`,
  );
}

/**
 * The full 5-person present table for `verb` (assemble-table task), built from
 * the same trusted sources as {@link conjugate}.
 *
 * @throws {ConjugationError} when `verb` is not exam-eligible (same rules as
 *   {@link conjugate}).
 */
export function conjugateTable(verb: VerbData): ConjugationForms {
  const out = {} as ConjugationForms;
  for (const person of PERSONS) {
    out[person] = conjugate(verb, person);
  }
  return out;
}
