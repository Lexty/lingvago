// Content loader (SPEC §7.3): materialize the versioned `content.vN.json`
// bundle into the read-only content stores in IndexedDB at first run / on a
// contentVersion change, preserving §7.2 progress.
//
// Migration model (minimal — version-bump + alias + orphaned-progress only):
//  - Progress (cardStates / skillMastery) is keyed by content-derived ids whose
//    colon-delimited segments include the `contentId` (e.g.
//    `card:<contentId>:recognition`, or the contentId itself).
//  - On a version change we apply the ALIAS TABLE (old contentId → new | removed):
//      • rename  → re-key the matching progress records to the new contentId,
//      • removed → ARCHIVE the matching progress records into
//        `orphanedProgress` and delete the originals (never silently dropped).
//  - Content stores are then fully replaced with the new bundle (read-only).
//  - `contentMeta` records the loaded version; an identical version is a no-op.

import type { Table } from 'dexie';
import type { Lingvago2Db } from '../db/index.ts';
import type {
  CardStateRecord,
  OrphanedProgressRecord,
  SkillMasteryRecord,
} from '../db/schema.ts';
import type { ContentAliasTable, ContentBundle } from './types.ts';

/** Outcome of a {@link loadContentIntoDb} call (useful for tests / telemetry). */
export interface LoadContentResult {
  /** Whether the content stores were (re)written this call. */
  loaded: boolean;
  /** Version now materialized in the content stores. */
  contentVersion: number;
  /** Previously-loaded version (`null` on first run). */
  previousVersion: number | null;
  /** Count of progress records re-keyed by a rename alias. */
  renamed: number;
  /** Count of progress records archived as orphaned (removed contentId). */
  archived: number;
  /**
   * Set when the call was a no-op because the bundle version is OLDER than the
   * version already loaded (a downgrade is refused, not applied backwards).
   */
  skippedDowngrade?: boolean;
}

/** Read the content version currently materialized, or null if none. */
export async function getLoadedContentVersion(db: Lingvago2Db): Promise<number | null> {
  const meta = await db.contentMeta.get('content');
  return meta?.contentVersion ?? null;
}

/**
 * True when `contentId` occurs in `id` as a colon-bounded run — i.e. the id is
 * exactly the contentId, or the contentId sits between `:` separators (the
 * `card:<contentId>:channel` / `<contentId>:sub` conventions). This avoids
 * partial-token matches (`verb:se` must not match inside `verb:ser`).
 */
function findContentId(id: string, contentId: string): boolean {
  let from = 0;
  for (;;) {
    const at = id.indexOf(contentId, from);
    if (at < 0) return false;
    const before = at === 0 ? ':' : id[at - 1];
    const afterIdx = at + contentId.length;
    const after = afterIdx === id.length ? ':' : id[afterIdx];
    if (before === ':' && after === ':') return true;
    from = at + 1;
  }
}

/**
 * Re-key a progress record id by the alias table. The id embeds one or more
 * `contentId`s as colon-bounded runs; every aliased OLD contentId matching the
 * ORIGINAL id is rewritten in place. A REMOVED match orphans the whole record.
 *
 * ALL matching entries are applied (not just the first), so a composite id like
 * `card:<contentId>:<channel>` whose multiple segments are independently aliased
 * migrates fully and order-independently. Matching is evaluated against the
 * original id (a rewrite never synthesizes a spurious match for a later entry).
 *
 * @returns the new id (one or more segments renamed), the original id (no alias
 *   touches it), or `null` when ANY matched contentId was REMOVED (orphaned).
 */
export function remapProgressId(id: string, alias: ContentAliasTable): string | null {
  let result = id;
  let changed = false;
  for (const [oldId, target] of Object.entries(alias)) {
    // Match against the ORIGINAL id so earlier rewrites can't conjure a match.
    if (!findContentId(id, oldId)) continue;
    if (target === 'removed') return null; // any removed match → orphaned
    // Pad with sentinel colons so every colon-bounded occurrence (including at
    // the string ends) is replaced uniformly, then strip the sentinels.
    const padded = `:${result}:`;
    result = padded.split(`:${oldId}:`).join(`:${target}:`).slice(1, -1);
    changed = true;
  }
  return changed ? result : id;
}

/** A keyed progress record carrying a stable string `id`. */
type KeyedProgress = CardStateRecord | SkillMasteryRecord;

/**
 * Apply the alias table to a single keyed progress store, in one place so
 * cardStates and skillMastery share identical rename/archive semantics. The
 * concrete table is passed in (typed `Table<R, string>`) so the bulk ops stay
 * type-safe per store.
 */
async function reconcileStore<R extends KeyedProgress>(
  table: Table<R, string>,
  storeName: OrphanedProgressRecord['store'],
  orphans: Table<OrphanedProgressRecord, number>,
  alias: ContentAliasTable,
  removedAtVersion: number,
  now: Date,
): Promise<{ renamed: number; archived: number }> {
  let renamed = 0;
  const archived: OrphanedProgressRecord[] = [];
  const toDelete: string[] = [];
  const toPut: R[] = [];

  const rows = await table.toArray();
  const archive = (row: R): void => {
    archived.push({
      store: storeName,
      originalId: row.id,
      payload: row,
      removedAtVersion,
      archivedAt: now,
    });
  };

  // Set of keys that are being moved AWAY from (renamed/removed originals).
  // A live record still occupies a key UNLESS that key is in this set.
  const vacated = new Set<string>();
  // Renamed records pending write, keyed by their NEW id. A later rename
  // landing on the same new id would clobber an earlier one via bulkPut, so we
  // resolve collisions here and archive the displaced record (never silently
  // lost — contract AC4 / Invariants).
  const putByNewId = new Map<string, R>();

  for (const row of rows) {
    const mapped = remapProgressId(row.id, alias);
    if (mapped === null) {
      // Removed contentId → archive verbatim, then delete original.
      archive(row);
      toDelete.push(row.id);
      vacated.add(row.id);
      continue;
    }
    if (mapped !== row.id) {
      // Renamed contentId → move the record to the new key.
      toDelete.push(row.id);
      vacated.add(row.id);
      const incoming = { ...row, id: mapped };
      const prior = putByNewId.get(mapped);
      if (prior) {
        // Two renames collide on the same target id: keep the first, archive
        // the loser so no progress is silently dropped.
        archive(incoming);
      } else {
        putByNewId.set(mapped, incoming);
      }
      renamed += 1;
    }
  }

  // A renamed record may land on a key still occupied by an UNTOUCHED live
  // record (one not being moved away). bulkPut would overwrite it silently, so
  // archive the displaced occupant before the write (contract AC4).
  const existingIds = new Set(rows.map((r) => r.id));
  const renamedTargets = [...putByNewId.keys()];
  for (const newId of renamedTargets) {
    if (existingIds.has(newId) && !vacated.has(newId)) {
      const occupant = rows.find((r) => r.id === newId);
      if (occupant) archive(occupant);
    }
  }

  for (const rec of putByNewId.values()) toPut.push(rec);

  if (toDelete.length) await table.bulkDelete(toDelete);
  if (toPut.length) await table.bulkPut(toPut);
  if (archived.length) await orphans.bulkAdd(archived);

  return { renamed, archived: archived.length };
}

/** Replace all content stores with the bundle's records (read-only payload). */
async function replaceContentStores(db: Lingvago2Db, bundle: ContentBundle): Promise<void> {
  await Promise.all([
    db.referenceCards.clear(),
    db.verbs.clear(),
    db.nouns.clear(),
    db.prepositions.clear(),
    db.conjugationTables.clear(),
    db.possessives.clear(),
  ]);
  await Promise.all([
    db.referenceCards.bulkPut(bundle.referenceCards),
    db.verbs.bulkPut(bundle.verbs),
    db.nouns.bulkPut(bundle.nouns),
    db.prepositions.bulkPut(bundle.prepositions),
    db.conjugationTables.bulkPut(bundle.conjugationTables),
    db.possessives.bulkPut(bundle.possessives),
  ]);
}

/**
 * Load a content bundle into the DB (SPEC §7.3).
 *
 * - Same `contentVersion` as already loaded → no-op (`loaded: false`).
 * - First run or a different version → reconcile progress via the alias table
 *   (renames re-keyed, removals archived), replace content stores, bump meta.
 *
 * All mutations run in one read-write transaction so a failure rolls back
 * (no half-loaded content / no lost progress).
 */
export async function loadContentIntoDb(
  db: Lingvago2Db,
  bundle: ContentBundle,
  alias: ContentAliasTable = {},
  now: Date = new Date(),
): Promise<LoadContentResult> {
  const previousVersion = await getLoadedContentVersion(db);

  if (previousVersion === bundle.contentVersion) {
    return {
      loaded: false,
      contentVersion: bundle.contentVersion,
      previousVersion,
      renamed: 0,
      archived: 0,
    };
  }

  // Monotonicity guard: refuse a DOWNGRADE (a stale/cached older bundle loading
  // after a newer one — e.g. an SW serving an old precache). Running a newer
  // alias table backwards or tagging archives with a lower removedAtVersion
  // would corrupt progress, so skip it (keep the newer content intact) rather
  // than reconciling backwards. Equal/first-run/upgrade paths are unaffected.
  if (previousVersion !== null && bundle.contentVersion < previousVersion) {
    console.warn(
      `content loader: refusing downgrade (bundle v${bundle.contentVersion} < loaded v${previousVersion}); keeping loaded content`,
    );
    return {
      loaded: false,
      contentVersion: previousVersion,
      previousVersion,
      renamed: 0,
      archived: 0,
      skippedDowngrade: true,
    };
  }

  let renamed = 0;
  let archived = 0;
  let loaded = true;
  // The version actually in effect after this call (may differ from the bundle
  // if a concurrent writer won the race — see the in-transaction re-check).
  let effectiveVersion = bundle.contentVersion;
  let effectivePrevious = previousVersion;

  await db.transaction(
    'rw',
    [
      db.cardStates,
      db.skillMastery,
      db.orphanedProgress,
      db.referenceCards,
      db.verbs,
      db.nouns,
      db.prepositions,
      db.conjugationTables,
      db.possessives,
      db.contentMeta,
    ],
    async () => {
      // Re-read the loaded version INSIDE the rw transaction to close the TOCTOU
      // window (multiple PWA tabs can both pass the outer gate before either
      // writes). Dexie serializes rw transactions over these stores, so the
      // second writer observes the first's committed meta here and bails — the
      // gate and the writes are now atomic.
      const committedVersion = await getLoadedContentVersion(db);
      effectivePrevious = committedVersion;
      if (committedVersion === bundle.contentVersion) {
        loaded = false;
        effectiveVersion = bundle.contentVersion;
        return;
      }
      if (committedVersion !== null && bundle.contentVersion < committedVersion) {
        // A concurrent writer advanced past us → treat as a downgrade no-op.
        loaded = false;
        effectiveVersion = committedVersion;
        return;
      }

      // Only reconcile progress when bumping an EXISTING version with aliases;
      // a first run has no progress to migrate.
      if (committedVersion !== null && Object.keys(alias).length > 0) {
        const cards = await reconcileStore(
          db.cardStates,
          'cardStates',
          db.orphanedProgress,
          alias,
          bundle.contentVersion,
          now,
        );
        const skills = await reconcileStore(
          db.skillMastery,
          'skillMastery',
          db.orphanedProgress,
          alias,
          bundle.contentVersion,
          now,
        );
        renamed = cards.renamed + skills.renamed;
        archived = cards.archived + skills.archived;
      }

      await replaceContentStores(db, bundle);

      await db.contentMeta.put({
        key: 'content',
        contentVersion: bundle.contentVersion,
        loadedAt: now,
      });
    },
  );

  return {
    loaded,
    contentVersion: effectiveVersion,
    previousVersion: effectivePrevious,
    renamed,
    archived,
  };
}

/**
 * Filename of the current content artifact (`content.v<N>.json`). Mirrors
 * scripts/build-content.ts `CONTENT_FILENAME`; kept in sync by the build-content
 * tests (this app bundle never imports the node build script). The `content.v*`
 * precache glob (src/pwa-config.ts) covers every version offline.
 */
export const CONTENT_BUNDLE_FILENAME = 'content.v3.json';

/**
 * Fetch the versioned content bundle from the app origin (precached by the SW,
 * see src/pwa-config.ts) and return the parsed bundle.
 */
export async function fetchContentBundle(): Promise<ContentBundle> {
  const url = `${import.meta.env.BASE_URL}${CONTENT_BUNDLE_FILENAME}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`content loader: failed to fetch ${url} (HTTP ${res.status})`);
  }
  return (await res.json()) as ContentBundle;
}

/**
 * contentId renames/removals applied on a version-bump (SPEC §7.3). Empty in
 * v1; future content versions append their old→new|removed entries here.
 */
export const CONTENT_ALIAS_TABLE: ContentAliasTable = {};

/**
 * App-startup entry point (SPEC §7.3): fetch the versioned bundle and load it
 * into the read-only content stores, applying the alias table. Returns the load
 * result; fetch/load errors are surfaced to the caller (which logs and lets the
 * app keep running — progress is never touched on a fetch failure).
 */
export async function bootstrapContent(db: Lingvago2Db): Promise<LoadContentResult> {
  const bundle = await fetchContentBundle();
  return loadContentIntoDb(db, bundle, CONTENT_ALIAS_TABLE);
}
