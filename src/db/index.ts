// v2 progress database (SPEC §7.2) in a DEDICATED IndexedDB `lingvago2`.
//
// Isolation invariant (SPEC §10.6): this database name is EXACTLY `lingvago2`
// and the v1 database `lingvago` is never opened, read, or migrated here. v1
// progress is intentionally NOT auto-migrated (clean start); the two databases
// coexist on the same origin so a rollback to v1 stays possible.

import Dexie, { type Table } from 'dexie';
import type {
  AnnotationRecord,
  AttemptRecord,
  CardStateRecord,
  ConjugationTableRecord,
  ContentMetaRecord,
  InterrogativeRecord,
  NounRecord,
  OrphanedProgressRecord,
  PossessiveContextRecord,
  PossessiveRecord,
  PrepositionRecord,
  ReferenceCardRecord,
  SessionRecord,
  SettingsRecord,
  SkillMasteryRecord,
  VerbRecord,
} from './schema.ts';

/** Exact IndexedDB name for the v2 progress database (SPEC §10.6). */
export const DB_NAME = 'lingvago2';

/**
 * Dexie database for v2 progress (§7.2 read-write) + content (§7.1 read-only).
 *
 * Indexes are chosen for the queries the app needs (§7.2): `attempts` by
 * sessionId/skill, `cardStates` by due/state.
 *
 * Version history (ADDITIVE — never mutate a shipped version's stores):
 *  - v1: §7.2 progress stores ONLY.
 *  - v2: ADD read-only §7.1 content stores + content-version meta + an
 *    orphaned-progress archive. The v1 progress stores are NOT redeclared, so
 *    Dexie carries them over unchanged (no data loss on the bump — see test).
 *  - v3: ADD the read-only `conjugationTables` content store (verified
 *    present-tense tables, contract T8). Additive — earlier versions/stores are
 *    untouched (Dexie carries them over).
 *  - v4: ADD the read-only `possessives` content store (verified EP possessive
 *    cloze items). Additive — earlier versions/stores are untouched. NOTE the
 *    Dexie version (4) is independent of the bundle CONTENT_VERSION (3).
 *  - v5: ADD the read-only `interrogatives` content store (verified EP
 *    interrogative cloze items). Additive — earlier versions/stores are
 *    untouched. NOTE the Dexie version (5) is independent of the bundle
 *    CONTENT_VERSION (4).
 *  - v6: ADD the read-only `possessiveContext` content store (verified EP
 *    possessive CONTEXT dialogue cloze items — the harder L3 tier). Additive —
 *    earlier versions/stores are untouched. NOTE the Dexie version (6) is
 *    independent of the bundle CONTENT_VERSION (5).
 */
export class Lingvago2Db extends Dexie {
  cardStates!: Table<CardStateRecord, string>;
  skillMastery!: Table<SkillMasteryRecord, string>;
  attempts!: Table<AttemptRecord, number>;
  sessions!: Table<SessionRecord, string>;
  annotations!: Table<AnnotationRecord, number>;
  settings!: Table<SettingsRecord, string>;
  // §7.1 read-only content stores (populated by the content loader only).
  referenceCards!: Table<ReferenceCardRecord, string>;
  verbs!: Table<VerbRecord, string>;
  nouns!: Table<NounRecord, string>;
  prepositions!: Table<PrepositionRecord, string>;
  conjugationTables!: Table<ConjugationTableRecord, string>;
  possessives!: Table<PossessiveRecord, string>;
  possessiveContext!: Table<PossessiveContextRecord, string>;
  interrogatives!: Table<InterrogativeRecord, string>;
  // §7.3 content-version meta + orphaned-progress archive.
  contentMeta!: Table<ContentMetaRecord, string>;
  orphanedProgress!: Table<OrphanedProgressRecord, number>;

  constructor() {
    super(DB_NAME);

    this.version(1).stores({
      // Stable string id; indexed by due/state for scheduling queries.
      cardStates: 'id, due, state',
      // Stable id (`skill` or `skill:subskill`); indexed for skill rollups.
      skillMastery: 'id, skillId',
      // Auto-incremented id; indexed for attempts-by-session / by-skill.
      attempts: '++id, sessionId, skill, [sessionId+skill], ts',
      // Stable session id; indexed by start time.
      sessions: 'id, startedAt',
      // Auto-incremented id; indexed by target and timestamp.
      annotations: '++id, [targetType+targetId], ts',
      // Key/value settings (e.g. `app` incl. userAlias).
      settings: 'key',
    });

    // v2 ADDS content stores only — v1 progress stores are intentionally NOT
    // listed here so Dexie preserves them (and their data) across the bump.
    this.version(2).stores({
      // Content stores are keyed by their primary `contentId` only; the loader
      // does keyed ops (get/bulkPut/clear) exclusively. Secondary indexes are
      // added when (and only when) a WP queries by that field (YAGNI).
      referenceCards: 'contentId',
      verbs: 'contentId',
      nouns: 'contentId',
      prepositions: 'contentId',
      contentMeta: 'key',
      orphanedProgress: '++id, store, originalId, removedAtVersion',
    });

    // v3 ADDS the conjugation-tables content store ONLY (contract T8 Task 1).
    // Keyed by `contentId` (`conj:<infinitive>:presente`); the loader does keyed
    // ops (bulkPut/clear) exclusively. Earlier versions are not redeclared, so
    // Dexie carries their stores (and data) over unchanged.
    this.version(3).stores({
      conjugationTables: 'contentId',
    });

    // v4 ADDS the possessives content store ONLY. Keyed by `contentId`
    // (`poss:NNNN`); the loader does keyed ops (bulkPut/clear) exclusively.
    // Earlier versions are not redeclared, so Dexie carries their stores (and
    // data) over unchanged — no destructive migration.
    this.version(4).stores({
      possessives: 'contentId',
    });

    // v5 ADDS the interrogatives content store ONLY. Keyed by `contentId`
    // (`int:NNNN`); the loader does keyed ops (bulkPut/clear) exclusively.
    // Earlier versions are not redeclared, so Dexie carries their stores (and
    // data) over unchanged — no destructive migration.
    this.version(5).stores({
      interrogatives: 'contentId',
    });

    // v6 ADDS the possessiveContext content store ONLY (the harder L3 tier of
    // the possessive drill). Keyed by `contentId` (`ctxNNNN`); the loader does
    // keyed ops (bulkPut/clear) exclusively. Earlier versions are not
    // redeclared, so Dexie carries their stores (and data) over unchanged — no
    // destructive migration.
    this.version(6).stores({
      possessiveContext: 'contentId',
    });
  }
}

/**
 * Process-wide singleton handle to the v2 progress database.
 *
 * Importing this opens (lazily, on first query) the `lingvago2` IndexedDB.
 */
export const db = new Lingvago2Db();

export type {
  AnnotationRecord,
  AttemptRecord,
  CardStateRecord,
  Channel,
  ConjugationForms,
  ConjugationTableRecord,
  ContentMetaRecord,
  FsrsCard,
  InterrogativeRecord,
  NounRecord,
  OrphanedProgressRecord,
  PossessiveContextRecord,
  PossessiveRecord,
  PrepositionRecord,
  ReferenceCardRecord,
  SessionRecord,
  SettingsRecord,
  SkillMasteryRecord,
  VerbRecord,
} from './schema.ts';

// dexie-react-hooks re-export so future screens can `useLiveQuery` from the db
// barrel without a separate dependency import.
export { useLiveQuery } from 'dexie-react-hooks';
