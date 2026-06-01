// App-side content types (SPEC §7.1) — the shape of `content.vN.json` as loaded
// into the read-only content stores. Mirrors scripts/build-content.ts output;
// kept independent of the (node-stripped) build script so the app bundle never
// imports build tooling.

import type {
  ConjugationTableRecord,
  NounRecord,
  PrepositionRecord,
  ReferenceCardRecord,
  VerbRecord,
} from '../db/schema.ts';

/** The full content bundle as produced by scripts/build-content.ts (§7.3). */
export interface ContentBundle {
  contentVersion: number;
  referenceCards: ReferenceCardRecord[];
  verbs: VerbRecord[];
  nouns: NounRecord[];
  prepositions: PrepositionRecord[];
  conjugationTables: ConjugationTableRecord[];
}

/**
 * Renames/removals of `contentId` across content versions (SPEC §7.3
 * alias-table). Maps an OLD contentId to either a new contentId (rename) or the
 * sentinel `'removed'` (the fact was deleted from the content bundle).
 */
export type ContentAliasTable = Record<string, string | 'removed'>;
