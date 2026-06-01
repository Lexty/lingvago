// Export-domain (SPEC §13.3): build a versioned, deterministic progress bundle
// from a snapshot of the §7.2 progress stores.
//
// ONLY the seven progress stores are exported (attempts / sessions / cardStates
// / skillMastery / annotations / settings / orphanedProgress). The read-only
// §7.1 content stores (nouns / verbs / prepositions / referenceCards /
// conjugationTables / contentMeta) are NEVER exported — they are reconstructed
// from the content bundle by the loader (contract Invariants).
//
// Determinism: the serializer emits a stable key order and the timestamp
// (`exportedAt`) is INJECTED by the caller (never `Date.now()` here), so the
// same DB snapshot + same `exportedAt` always serializes to byte-identical JSON.

import type { Lingvago2Db } from '../db/index.ts';
import type {
  AnnotationRecord,
  AttemptRecord,
  CardStateRecord,
  OrphanedProgressRecord,
  SessionRecord,
  SettingsRecord,
  SkillMasteryRecord,
} from '../db/schema.ts';
import { getLoadedContentVersion } from '../content/loader.ts';

/**
 * Bundle-FORMAT schema version (contract note 2). This is DISTINCT from the
 * Dexie store version (currently 3): it versions the export envelope so a
 * restore can refuse an incompatible bundle. Bump only when the bundle shape
 * (envelope or `data` store set) changes incompatibly.
 */
export const BUNDLE_SCHEMA_VERSION = 1;

/** The §7.2 progress stores carried in a bundle's `data`, in canonical order. */
export interface ProgressData {
  attempts: AttemptRecord[];
  sessions: SessionRecord[];
  cardStates: CardStateRecord[];
  skillMastery: SkillMasteryRecord[];
  annotations: AnnotationRecord[];
  settings: SettingsRecord[];
  orphanedProgress: OrphanedProgressRecord[];
}

/** Canonical order of the progress stores in `data` (drives serialization). */
export const PROGRESS_STORES = [
  'attempts',
  'sessions',
  'cardStates',
  'skillMastery',
  'annotations',
  'settings',
  'orphanedProgress',
] as const satisfies ReadonlyArray<keyof ProgressData>;

/** The export envelope (SPEC §13.3). */
export interface ProgressBundle {
  /** Bundle-format version (validated on restore — {@link BUNDLE_SCHEMA_VERSION}). */
  schemaVersion: number;
  /** App build version (from package.json via the `__APP_VERSION__` define). */
  appVersion: string;
  /** Content version currently materialized in the content stores. */
  contentVersion: number | null;
  /** Caller-injected export timestamp (ISO string; keeps the bundle deterministic). */
  exportedAt: string;
  /** Local user alias (no account/PII), if set. */
  userAlias?: string;
  /** Snapshot of the §7.2 progress stores. */
  data: ProgressData;
}

/** Read the app build version injected at build time (contract Task 1 / AC2). */
export function getAppVersion(): string {
  return __APP_VERSION__;
}

/**
 * Snapshot all §7.2 progress stores from the DB into a {@link ProgressData}.
 *
 * Read-only: no store is mutated. Records are returned verbatim (Dates stay as
 * `Date` instances until JSON serialization in {@link serializeBundle}).
 */
export async function snapshotProgress(db: Lingvago2Db): Promise<ProgressData> {
  // Iterate the canonical PROGRESS_STORES list so the snapshotted store set has
  // ONE source of truth — a new §7.2 store added to PROGRESS_STORES is exported
  // without a second hand-maintained list to keep in sync (SM002).
  const entries = await Promise.all(
    PROGRESS_STORES.map(async (store) => [store, await db[store].toArray()] as const),
  );
  return Object.fromEntries(entries) as unknown as ProgressData;
}

/** Optional overrides (mainly for deterministic tests). */
export interface BuildBundleOptions {
  /** Injected export timestamp — REQUIRED for determinism (contract AC1). */
  exportedAt: Date | string;
  /** Override the user alias (defaults to the `app` settings row's alias). */
  userAlias?: string;
}

/**
 * Build the export bundle from the live DB (SPEC §13.3).
 *
 * Versions are real (contract AC2): `appVersion` from the build-time define,
 * `contentVersion` from the loader/contentMeta, `schemaVersion` the bundle
 * constant. `exportedAt` is injected by the caller so the build is deterministic.
 * The user alias defaults to the `app` settings row's `userAlias`.
 */
export async function buildBundle(
  db: Lingvago2Db,
  opts: BuildBundleOptions,
): Promise<ProgressBundle> {
  const [data, contentVersion] = await Promise.all([
    snapshotProgress(db),
    getLoadedContentVersion(db),
  ]);
  const exportedAt =
    opts.exportedAt instanceof Date ? opts.exportedAt.toISOString() : opts.exportedAt;
  const userAlias = opts.userAlias ?? data.settings.find((s) => s.key === 'app')?.userAlias;

  const bundle: ProgressBundle = {
    schemaVersion: BUNDLE_SCHEMA_VERSION,
    appVersion: getAppVersion(),
    contentVersion,
    exportedAt,
    data,
  };
  // Only attach the optional alias when present so serialization stays stable
  // (an absent alias must not emit a `userAlias: undefined` placeholder).
  if (userAlias !== undefined) bundle.userAlias = userAlias;
  return bundle;
}

/**
 * Deterministically serialize a value to JSON with stable, recursively-sorted
 * object keys. Arrays keep their order (it is data); `Date` instances become
 * ISO strings (the default `toJSON`); `undefined` properties are omitted (as
 * with native JSON). The result is valid JSON and byte-stable for a given
 * input, so two exports of the same snapshot compare equal.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

/** Recursively rebuild a value with object keys in sorted order. */
function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    const v = obj[key];
    if (v === undefined) continue; // mirror JSON.stringify dropping undefined
    out[key] = canonicalize(v);
  }
  return out;
}

/** Serialize a bundle to deterministic, valid JSON (stable key order). */
export function serializeBundle(bundle: ProgressBundle): string {
  return stableStringify(bundle);
}

/** Build + serialize in one step (the common export path). */
export async function exportBundleJson(
  db: Lingvago2Db,
  opts: BuildBundleOptions,
): Promise<string> {
  return serializeBundle(await buildBundle(db, opts));
}
