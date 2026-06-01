// Restore-domain (SPEC §13.3, §10.2 #5): validate a parsed export bundle and
// transactionally replace ONLY the §7.2 progress stores from it.
//
// Hard rules (contract AC3 / Invariants):
//  - Validate the bundle FIRST. An incompatible `schemaVersion`, malformed
//    input, or a missing required field → REFUSE with a clear reason and make
//    NO mutation (existing progress is never corrupted on a bad bundle).
//  - Replace progress in ONE read-write transaction: `clear()` + `bulkPut()`
//    each of the seven progress stores from `data`. Content stores are NEVER
//    touched. `skillMastery` is restored DIRECTLY from the bundle — it is a
//    persisted §7.2 store and is NOT recomputed (contract note 3).
//  - Rehydrate Dates: `JSON.stringify` turned every `Date` into an ISO string,
//    and several are Dexie-INDEXED (`cardStates.due`, `attempts.ts`,
//    `sessions.startedAt`, `annotations.ts`) or feed FSRS date math
//    (`card.due`/`card.last_review`, `fsrsBefore`/`fsrsAfter`). On restore we
//    turn those ISO strings back into real `Date` instances (contract note 1),
//    or the indexes / FSRS math corrupt and the round-trip identity fails.

import type { Table } from 'dexie';
import type { Lingvago2Db } from '../db/index.ts';
import type {
  AnnotationRecord,
  AttemptRecord,
  CardStateRecord,
  FsrsCard,
  OrphanedProgressRecord,
  SessionRecord,
  SkillMasteryRecord,
} from '../db/schema.ts';
import {
  BUNDLE_SCHEMA_VERSION,
  PROGRESS_STORES,
  type ProgressBundle,
  type ProgressData,
} from './bundle.ts';

/** Thrown when a bundle is invalid/incompatible — restore made NO mutation. */
export class BundleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BundleValidationError';
  }
}

/** Narrow `unknown` to a plain object (not null, not array). */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validate a PARSED value as a restorable {@link ProgressBundle} (contract AC3):
 * compatible `schemaVersion`, an object `data` with every progress store
 * present as an array. Throws {@link BundleValidationError} on any violation;
 * the caller never mutates the DB unless this returns.
 *
 * Compatibility is intentionally strict (exact-match) for the single shipped
 * format version; a future migration can widen this to a range.
 */
export function validateBundle(parsed: unknown): asserts parsed is ProgressBundle {
  if (!isPlainObject(parsed)) {
    throw new BundleValidationError('bundle is not an object');
  }
  if (parsed.schemaVersion !== BUNDLE_SCHEMA_VERSION) {
    throw new BundleValidationError(
      `incompatible schemaVersion: expected ${BUNDLE_SCHEMA_VERSION}, got ${String(
        parsed.schemaVersion,
      )}`,
    );
  }
  const data = parsed.data;
  if (!isPlainObject(data)) {
    throw new BundleValidationError('bundle.data is missing or not an object');
  }
  for (const store of PROGRESS_STORES) {
    if (!Array.isArray(data[store])) {
      throw new BundleValidationError(`bundle.data.${store} is missing or not an array`);
    }
  }
}

/**
 * Parse a JSON string into a validated bundle. Malformed JSON → a
 * {@link BundleValidationError} (so callers handle ONE refusal type), never an
 * unguarded `SyntaxError`.
 */
export function parseBundle(json: string): ProgressBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new BundleValidationError(
      `malformed JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  validateBundle(parsed);
  return parsed;
}

// ---------------------------------------------------------------------------
// Date rehydration (contract note 1). JSON has no Date type, so every persisted
// `Date` arrives as an ISO string. We pin the exact Date-bearing fields per
// store and turn them back into `Date` instances. A value that is already a
// `Date` (defensive) or absent is left as-is.
// ---------------------------------------------------------------------------

/**
 * Coerce an ISO-string (or pass through an existing Date) to a `Date`.
 *
 * A malformed/garbage value yields an Invalid Date (`NaN` time). We REFUSE the
 * bundle here rather than persisting an unindexable Date into a Dexie-INDEXED /
 * FSRS date field (validate-before-mutate: rehydration runs before the restore
 * transaction, so this throw happens before any DB mutation — AC3).
 */
function toDate(v: unknown): Date {
  const d = v instanceof Date ? v : new Date(v as string);
  if (Number.isNaN(d.getTime())) {
    throw new BundleValidationError(`bundle carries a malformed date value: ${String(v)}`);
  }
  return d;
}

/** Same, but preserves `undefined` (for optional Date fields). */
function toDateOpt(v: unknown): Date | undefined {
  return v === undefined || v === null ? undefined : toDate(v);
}

/** Rehydrate the Date fields inside an FSRS card snapshot (`due`, `last_review`). */
function rehydrateFsrsCard<T extends FsrsCard | undefined>(card: T): T {
  if (!card) return card;
  return {
    ...card,
    due: toDate(card.due),
    last_review: toDateOpt(card.last_review),
  } as T;
}

function rehydrateCardState(r: CardStateRecord): CardStateRecord {
  return {
    ...r,
    card: rehydrateFsrsCard(r.card),
    due: toDate(r.due),
    lastReview: toDateOpt(r.lastReview),
    updatedAt: toDate(r.updatedAt),
  };
}

function rehydrateAttempt(r: AttemptRecord): AttemptRecord {
  return {
    ...r,
    ts: toDate(r.ts),
    fsrsBefore: rehydrateFsrsCard(r.fsrsBefore),
    fsrsAfter: rehydrateFsrsCard(r.fsrsAfter),
  };
}

function rehydrateSession(r: SessionRecord): SessionRecord {
  return { ...r, startedAt: toDate(r.startedAt), endedAt: toDateOpt(r.endedAt) };
}

function rehydrateAnnotation(r: AnnotationRecord): AnnotationRecord {
  return { ...r, ts: toDate(r.ts) };
}

function rehydrateSkillMastery(r: SkillMasteryRecord): SkillMasteryRecord {
  return { ...r, updatedAt: toDate(r.updatedAt) };
}

/**
 * Rehydrate an orphaned-progress row: its own `archivedAt`, plus the nested
 * `payload` (a verbatim cardStates/skillMastery record that also carries Dates).
 */
function rehydrateOrphan(r: OrphanedProgressRecord): OrphanedProgressRecord {
  let payload = r.payload;
  if (isPlainObject(payload)) {
    if (r.store === 'cardStates') {
      payload = rehydrateCardState(payload as unknown as CardStateRecord);
    } else if (r.store === 'skillMastery') {
      payload = rehydrateSkillMastery(payload as unknown as SkillMasteryRecord);
    }
  }
  return { ...r, archivedAt: toDate(r.archivedAt), payload };
}

/**
 * Rehydrate every Date-bearing field across all progress stores. Returns a new
 * {@link ProgressData} with real `Date` instances (inputs are not mutated).
 */
export function rehydrateProgressData(data: ProgressData): ProgressData {
  return {
    attempts: data.attempts.map(rehydrateAttempt),
    sessions: data.sessions.map(rehydrateSession),
    cardStates: data.cardStates.map(rehydrateCardState),
    skillMastery: data.skillMastery.map(rehydrateSkillMastery),
    annotations: data.annotations.map(rehydrateAnnotation),
    // Settings carry no Date fields — passed through unchanged.
    settings: data.settings,
    orphanedProgress: data.orphanedProgress.map(rehydrateOrphan),
  };
}

/**
 * Restore a VALIDATED bundle into the DB (SPEC §13.3, contract AC3/AC4).
 *
 * Replaces ONLY the seven §7.2 progress stores: each is `clear()`ed then
 * `bulkPut()` from the bundle's (Date-rehydrated) `data`, all inside ONE
 * read-write transaction so a failure rolls back cleanly. Content stores are
 * NOT in the transaction scope and are never touched. `skillMastery` is written
 * directly from the bundle (not recomputed — contract note 3).
 *
 * Pass a parsed+validated bundle (use {@link parseBundle} for JSON input). The
 * bundle is re-validated here so a direct caller cannot skip the guard and
 * corrupt progress with a malformed object.
 */
export async function restoreBundle(
  db: Lingvago2Db,
  bundle: ProgressBundle,
): Promise<void> {
  validateBundle(bundle);
  const data = rehydrateProgressData(bundle.data);

  // Derive the transaction scope, the clear() set, and the bulkPut() set from
  // the single canonical PROGRESS_STORES list so the §7.2 store set has ONE
  // source of truth (adding a store can't silently desync clear vs restore).
  // Each table is viewed as `Table<unknown>` so the loop is store-agnostic; the
  // per-store row type is preserved by `data[store]` matching its own table.
  const tableOf = (store: (typeof PROGRESS_STORES)[number]): Table<unknown> =>
    db[store] as unknown as Table<unknown>;
  const tables = PROGRESS_STORES.map(tableOf);
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((table) => table.clear()));
    await Promise.all(PROGRESS_STORES.map((store) => tableOf(store).bulkPut(data[store])));
  });
}

/** Parse JSON → validate → restore (the common import path). */
export async function restoreBundleJson(db: Lingvago2Db, json: string): Promise<void> {
  return restoreBundle(db, parseBundle(json));
}
