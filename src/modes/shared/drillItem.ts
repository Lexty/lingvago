// Shared DrillItem type for the production-first grammar drills (SPEC §6.3 /
// §1.2). WP-C Tasks 2–4 (GenderArticle, Preposition, the screens) all consume
// THIS discriminated type so the screen layer renders one shape regardless of
// which generator produced the item.
//
// PRODUCTION-FIRST invariant (SPEC §6.3): an item is MC *only* when a plausible
// parity set was assembled; otherwise it is a typed-input PRODUCTION item. The
// `mode` discriminant makes that decision explicit and type-checked — an `'mc'`
// item ALWAYS carries `options`, a `'production'` item NEVER does.

/**
 * One multiple-choice option: a surface form plus the explanation that teaches
 * *why* it is right or wrong (SPEC §6.3 «каждый дистрактор — с объяснением»).
 * The correct option carries `correct: true`; every distractor carries an
 * explanation grounded in a typical-learner error.
 */
export interface DrillOption {
  /** The rendered surface form (e.g. `a`, `do`, `na`). */
  surface: string;
  /** True for the single correct option; false for a distractor. */
  correct: boolean;
  /**
   * Why this option is right/wrong — shown as feedback. For a distractor this
   * names the typical error it represents (e.g. «opposite article»,
   * «neighbouring contraction»); for the correct option it states the rule.
   */
  explanation: string;
}

/** Where an item's answer was verified from (SPEC §6.5 traceability). */
export interface DrillSourceRef {
  /** Which content store the item is grounded in. */
  store: string;
  /** Stable content id of the originating record. */
  id: string;
}

/**
 * A PRODUCTION (typed-input) drill item — the default mode. The learner types a
 * free-text answer that is checked objectively against `answer`.
 */
export interface ProductionDrillItem {
  mode: 'production';
  /** The natural prompt shown to the learner. */
  prompt: string;
  /** The single canonical verified answer (objective check target). */
  answer: string;
  /** Where the answer was verified from. */
  sourceRef: DrillSourceRef;
}

/**
 * A MULTIPLE-CHOICE drill item — produced ONLY when a plausible parity set was
 * assembled (SPEC §6.3). Always carries `options` (one correct + ≥1 competitive
 * distractor, all parity-equal), each with an explanation.
 */
export interface McDrillItem {
  mode: 'mc';
  prompt: string;
  /** The canonical verified answer; also the `correct` option's surface. */
  answer: string;
  /** Parity-equal option set, already ordered (seeded). */
  options: readonly DrillOption[];
  sourceRef: DrillSourceRef;
}

/** A single drill item, discriminated by `mode` (production vs. mc). */
export type DrillItem = ProductionDrillItem | McDrillItem;

/** The presentation mode of a drill item. */
export type DrillMode = DrillItem['mode'];
