// Record types for the v2 database (SPEC §7.2 progress + §7.1 content).
//
// The read-write *progress* schema (§7.2) and the read-only *content* schema
// (§7.1) both live in the dedicated IndexedDB `lingvago2` (SPEC §10.6
// isolation). Content stores are populated ONLY by the content loader from the
// versioned `content.vN.json` bundle (§7.3) and are never written by gameplay.
//
// Dates are stored as native `Date` objects — Dexie/structured-clone persists
// them losslessly and they round-trip back as `Date` instances.

import type { Card, Grade, State } from 'ts-fsrs';

/** Recognition vs. production channel for an attempt (SPEC §13.1). */
export type Channel = 'recognition' | 'production';

/**
 * Serializable snapshot of an FSRS card as persisted in `cardStates`.
 *
 * Mirrors the shape of ts-fsrs `Card`; kept as an explicit alias so the stored
 * schema is documented and decoupled from the library type at call sites.
 */
export type FsrsCard = Card;

/**
 * Per-fact FSRS scheduling state (SPEC §7.2 `cardStates`).
 *
 * `id` is a stable, content-derived key (e.g. `word:<contentId>:recognition`)
 * so progress survives content re-indexing (§7.3 stable ids).
 */
export interface CardStateRecord {
  /** Stable card id (content-derived); primary key. */
  id: string;
  /** FSRS card payload (due/stability/difficulty/state/…). */
  card: FsrsCard;
  /** Cached due date for indexed scheduling queries. */
  due: Date;
  /** Cached FSRS state for indexed filtering (New/Learning/Review/Relearning). */
  state: State;
  /** Last time this card was reviewed, if ever. */
  lastReview?: Date;
  /** Wall-clock time of the last write to this record. */
  updatedAt: Date;
}

/**
 * Aggregated mastery per skill/subskill for generative drills (SPEC §7.2,
 * §4.6). This layer only persists/reads it; the mastery *computation* engine is
 * out of scope (a later WP).
 */
export interface SkillMasteryRecord {
  /** `<skillId>` or `<skillId>:<subskillId>`; primary key. */
  id: string;
  skillId: string;
  subskillId?: string;
  /** Mastery score in 0..1 (interpretation owned by the mastery engine). */
  mastery: number;
  /** Number of attempts that contributed to this score. */
  attempts: number;
  updatedAt: Date;
}

/**
 * Rich per-attempt telemetry log (SPEC §13.1).
 *
 * `id` is auto-incremented by Dexie. FSRS / mastery before-after snapshots are
 * captured here so the export bundle is sufficient for restore (§13.3).
 */
export interface AttemptRecord {
  /** Auto-incremented primary key. */
  id?: number;
  sessionId: string;
  ts: Date;
  modeId: string;
  skill: string;
  subskill?: string;
  level: string;
  generatorClass?: string;
  channel: Channel;
  taskId: string;
  sourceRef?: string;
  ruleRef?: string;
  prompt?: string;
  /** Options shown for multiple-choice tasks. */
  shownOptions?: string[];
  userAnswer: string;
  correctAnswer: string;
  correct: boolean;
  /** Response time in milliseconds. */
  responseMs?: number;
  /** Number of edits/returns during input (for production tasks). */
  edits?: number;
  /** Error category, when the answer was wrong. */
  errorType?: string;
  /** FSRS card snapshot before this attempt. */
  fsrsBefore?: FsrsCard;
  /** FSRS card snapshot after this attempt. */
  fsrsAfter?: FsrsCard;
  /** Mastery score before this attempt. */
  masteryBefore?: number;
  /** Mastery score after this attempt. */
  masteryAfter?: number;
  ambiguityFlag?: boolean;
}

/** Per-session summary telemetry (SPEC §13.1). */
export interface SessionRecord {
  /** Stable session id; primary key. */
  id: string;
  startedAt: Date;
  endedAt?: Date;
  /** Session recipe / generation parameters. */
  recipe?: string;
  /** Duration in milliseconds. */
  durationMs?: number;
  /** Per-skill composition (skill -> attempt count). */
  skillBreakdown?: Record<string, number>;
  accuracy?: number;
  /** Accuracy over time (fatigue) — chronological samples. */
  accuracyTrend?: number[];
  /** Share of production vs. recognition tasks (0..1). */
  productionShare?: number;
}

/** Free-form user annotation on an item or session (SPEC §13.2). */
export interface AnnotationRecord {
  /** Auto-incremented primary key. */
  id?: number;
  ts: Date;
  /** What the note is attached to. */
  targetType: 'attempt' | 'session' | 'item';
  /** Id of the attached target. */
  targetId: string;
  note: string;
}

/**
 * Singleton-ish settings store (SPEC §7.2 incl. `userAlias`, §13.2).
 *
 * Key/value shaped so future settings can be added without schema bumps; the
 * canonical app settings live under the `app` key.
 */
export interface SettingsRecord {
  /** Setting key; primary key (e.g. `app`). */
  key: string;
  /** Local user alias used to tag telemetry exports (no account/PII). */
  userAlias?: string;
  /** Free-form value bag for additional settings. */
  value?: unknown;
}

/** Re-export the ts-fsrs `Grade` (Again/Hard/Good/Easy) for convenience. */
export type { Grade };

// ---------------------------------------------------------------------------
// Read-only content schema (SPEC §7.1). Records mirror the `content.vN.json`
// bundle produced by scripts/build-content.ts; `contentId` is the stable
// primary key (SPEC §7.3) progress is keyed against.
// ---------------------------------------------------------------------------

/** Authored reference card (verified didactic material, WP-B). */
export interface ReferenceCardRecord {
  /** Stable content id; primary key. */
  contentId: string;
  topic: string;
  title: string;
  body: string;
}

/** Verb inventory entry (from verbs_inventory). */
export interface VerbRecord {
  /** Stable content id (`verb:<infinitive>`); primary key. */
  contentId: string;
  infinitive: string;
  group: string;
  reflexive: boolean;
  regular: boolean;
  hasTable: boolean;
  /**
   * Caverdyne / stem-shift verb without a verified table — EXCLUDED from
   * exam/production drills until a verified table exists (SPEC §6.5). Carried
   * verbatim from verbs_inventory.json.
   */
  needsTableReview: boolean;
}

/**
 * The five canonical A1 persons of a conjugation table (vós is archaic and
 * intentionally dropped). `voce_ele_ela` covers você/ele/ela; `voces_eles_elas`
 * covers vocês/eles/elas.
 */
export interface ConjugationForms {
  eu: string;
  tu: string;
  voce_ele_ela: string;
  nos: string;
  voces_eles_elas: string;
}

/**
 * Verified present-tense conjugation table (from verbs_teacher), copied
 * verbatim from the teacher handout (SPEC §6.5). Present-tense only (A1 scope);
 * irregular verbs are conjugated ONLY from this verified table.
 */
export interface ConjugationTableRecord {
  /** Stable content id (`conj:<infinitive>:presente`); primary key. */
  contentId: string;
  infinitive: string;
  /** Always `presente` in this bundle (present-tense only). */
  tense: string;
  /** Conjugation group (`-ar` / `-er` / `-ir` / `-or`). */
  group: string;
  /** Whether the verb conjugates by the regular endings rule. */
  regular: boolean;
  /** The 5 canonical persons (vós dropped). */
  forms: ConjugationForms;
}

/** Noun with gender/article (gender→article drills). */
export interface NounRecord {
  /** Stable content id (`noun:<lemma>`); primary key. */
  contentId: string;
  lemma: string;
  gender: 'm' | 'f';
  article: 'o' | 'a';
  en: string | null;
}

/** Preposition usage entry (from prepositions_teacher). */
export interface PrepositionRecord {
  /** Stable content id (`prep:<category>:<NNNN>`); primary key. */
  contentId: string;
  category: string;
  prep: string;
  use: string;
  examples: string[];
}

/**
 * Verified EP possessive cloze item (from possessives.json), carrying the
 * cue/grading fields the possessive drill mode needs. The determiner family
 * agrees with the possessed noun (gender + number); the `dele` family
 * (dele/dela/deles/delas) is invariable and follows the noun.
 */
export interface PossessiveRecord {
  /** Stable content id (`poss:NNNN`, the dataset id); primary key. */
  contentId: string;
  /** Cloze sentence with the possessive blanked as `___`. */
  blankSentence: string;
  /** Canonical answer (the possessive form). */
  answer: string;
  /** Grammatical person (`eu` / `tu` / `ele_ela_voce` / `nos` / `vos` / `eles_elas`). */
  person: string;
  /** `determiner` (agrees with the possessed noun) or `dele` (invariable family). */
  kind: string;
  /** Possessed noun's gender (`m` / `f`). */
  possessedGender: string;
  /** Possessed noun's number (`sg` / `pl`). */
  possessedNumber: string;
  /** Whether the cloze keeps a definite article before the blank. */
  hasArticle: boolean;
}

/**
 * Singleton meta row tracking the loaded content version (SPEC §7.3).
 *
 * Compared at startup to decide first-load vs. version-bump vs. skip.
 */
export interface ContentMetaRecord {
  /** Constant primary key (always `content`). */
  key: 'content';
  /** The `contentVersion` currently materialized into the content stores. */
  contentVersion: number;
  /** Wall-clock time of the last content (re)load. */
  loadedAt: Date;
}

/**
 * Archived progress whose `contentId` was REMOVED by a content version-bump
 * (SPEC §7.3 orphaned-progress: archive, never silently delete). Kept so the
 * user's effort is recoverable and never destroyed.
 */
export interface OrphanedProgressRecord {
  /** Auto-incremented primary key. */
  id?: number;
  /** Which progress store the archived row came from. */
  store: 'cardStates' | 'skillMastery';
  /** The original (now-removed) contentId / record id. */
  originalId: string;
  /** The archived record payload (verbatim). */
  payload: unknown;
  /** contentVersion that removed it. */
  removedAtVersion: number;
  archivedAt: Date;
}
