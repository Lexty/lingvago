import { createPrng } from '../modes/numbers/prng.ts';
import type { Localized, Pack, PackBlock, PackExercise, PackGroup } from './types.ts';
import { UNIT_18 } from './unit18.ts';
import { UNIT_19 } from './unit19.ts';

export type { CheckOutcome } from './check.ts';
export { acceptedAnswers, checkExercise, normalizeAnswer } from './check.ts';
export type { ChoiceOption, ExerciseKind, Localized, Pack, PackBlock, PackDrillLink, PackExercise, PackGroup } from './types.ts';

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
 * The session for one group, for the whole pack when `groupId` is
 * {@link MIX_GROUP_ID}, or for one block when it is `mix-<blockId>`. A single
 * group is practised on its own; a mix really interleaves the mechanics (a
 * shuffled round of at most {@link MIX_SESSION_LENGTH} exercises drawn from
 * all of them), which is what a learner who already met each of them needs.
 * Returns `[]` for an unknown group.
 */
export function buildSession(pack: Pack, groupId: string, seed: string): SessionEntry[] {
  const block = findBlock(pack, groupId);
  const groups =
    groupId === MIX_GROUP_ID
      ? pack.groups
      : block
        ? pack.groups.filter((g) => block.groupIds.includes(g.id))
        : pack.groups.filter((g) => g.id === groupId);
  const entries = groups.flatMap((group) =>
    group.exercises.map((exercise) => ({ group, exercise })),
  );
  const order = shuffled(entries, `${pack.id}:${groupId}:${seed}`);
  // A mixed session is a short round, not a marathon over the whole lesson; the
  // next round (a new shuffle) starts when it runs out.
  return groupId === MIX_GROUP_ID || block ? order.slice(0, MIX_SESSION_LENGTH) : order;
}

/** How many exercises one mixed round holds. */
export const MIX_SESSION_LENGTH = 20;

/** The route segment of a block's own mix: `mix-<blockId>`. */
export function blockMixId(block: PackBlock): string {
  return `${MIX_GROUP_ID}-${block.id}`;
}

/** The block whose mix `groupId` names, if it does. */
export function findBlock(pack: Pack, groupId: string | undefined): PackBlock | undefined {
  return (pack.blocks ?? []).find((block) => blockMixId(block) === groupId);
}
