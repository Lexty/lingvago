import { createPrng } from '../modes/numbers/prng.ts';
import type { Localized, Pack, PackExercise, PackGroup } from './types.ts';
import { UNIT_18 } from './unit18.ts';
import { UNIT_19 } from './unit19.ts';

export type { CheckOutcome } from './check.ts';
export { acceptedAnswers, checkExercise, normalizeAnswer } from './check.ts';
export type { ExerciseKind, Localized, Pack, PackDrillLink, PackExercise, PackGroup } from './types.ts';

/** Every shipped pack, newest unit last. */
export const PACKS: readonly Pack[] = [UNIT_18, UNIT_19];

/** The id of the "everything in this pack, mixed" session. */
export const MIX_GROUP_ID = 'mix';

export function findPack(packId: string | undefined): Pack | undefined {
  return PACKS.find((pack) => pack.id === packId);
}

export function findGroup(pack: Pack, groupId: string | undefined): PackGroup | undefined {
  return pack.groups.find((group) => group.id === groupId);
}

/** Pick the text for the current interface language (`ru`, else English). */
export function localized(text: Localized, lang: string | undefined): string {
  return lang?.toLowerCase().startsWith('ru') ? text.ru : text.en;
}

/** One exercise of a session, with the group it belongs to. */
export interface SessionEntry {
  group: PackGroup;
  exercise: PackExercise;
}

/** Deterministic Fisher–Yates shuffle (same seed ⇒ same order). */
function shuffled<T>(items: readonly T[], seed: string): T[] {
  const prng = createPrng(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = prng.intBetween(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * The session for one group, or for the whole pack when `groupId` is
 * {@link MIX_GROUP_ID}. A single group is practised as a block; the mix really
 * interleaves the mechanics (every exercise of the pack in one shuffled
 * sequence), which is what a learner who already met each of them needs.
 * Returns `[]` for an unknown group.
 */
export function buildSession(pack: Pack, groupId: string, seed: string): SessionEntry[] {
  const groups = groupId === MIX_GROUP_ID ? pack.groups : pack.groups.filter((g) => g.id === groupId);
  const entries = groups.flatMap((group) =>
    group.exercises.map((exercise) => ({ group, exercise })),
  );
  return shuffled(entries, `${pack.id}:${groupId}:${seed}`);
}
