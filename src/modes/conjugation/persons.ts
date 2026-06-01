// The five canonical A1 persons of an EP present-tense table (SPEC §1.2, T8).
//
// `vós` is archaic and intentionally dropped (contract: 5 persons only). The two
// composite persons mirror the content schema `ConjugationForms` keys:
//   - `voce_ele_ela`    covers você / ele / ela
//   - `voces_eles_elas` covers vocês / eles / elas

import type { ConjugationForms } from '../../db/schema.ts';

/** A grammatical person key — exactly the keys of {@link ConjugationForms}. */
export type Person = keyof ConjugationForms;

/**
 * The 5 persons in fixed canonical order (eu → tu → você/ele/ela → nós →
 * vocês/eles/elas). The order is stable so the seeded session and the
 * assemble-table task always present persons identically.
 */
export const PERSONS: readonly Person[] = [
  'eu',
  'tu',
  'voce_ele_ela',
  'nos',
  'voces_eles_elas',
] as const;

/** A natural-language subject pronoun shown to the learner for a person. */
const PERSON_PRONOUN: Record<Person, string> = {
  eu: 'eu',
  tu: 'tu',
  voce_ele_ela: 'você',
  nos: 'nós',
  voces_eles_elas: 'eles',
};

/** Type guard: is `value` one of the 5 canonical person keys? */
export function isPerson(value: unknown): value is Person {
  return typeof value === 'string' && (PERSONS as readonly string[]).includes(value);
}

/** The subject pronoun for a person (the natural exam-prompt subject). */
export function pronounFor(person: Person): string {
  return PERSON_PRONOUN[person];
}
