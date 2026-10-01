// Authored lesson packs.
//
// A pack is DATA: one file per unit of the course, holding the exercises for
// the mechanics that unit introduces. Adding a lesson means adding a pack file
// and reviewing its language — no new drill module, route or database table.
// Packs ship inside the app bundle, so they are available offline.
//
// Nothing here is generated at run time: every prompt, answer and explanation
// is written by hand, checked against the sources listed on its group, and
// reviewed before it ships.

/** UI text in both interface languages. Portuguese content is never localized. */
export interface Localized {
  ru: string;
  en: string;
}

/**
 * What the learner does with an exercise:
 *  - `recall` — remember a word or collocation from its meaning;
 *  - `cloze`  — fill the gap(s) in a sentence;
 *  - `build`  — write the whole sentence from ordered cue words.
 */
export type ExerciseKind = 'recall' | 'cloze' | 'build';

export interface PackExercise {
  /** Stable id (`u18-comp-03`). Never reused; survives wording edits. */
  id: string;
  /**
   * Portuguese prompt: a sentence with `___`, cue words, or a word pair. A
   * `recall` exercise may have none — its `cue` (the meaning) is the prompt.
   */
  prompt?: string;
  /** Meaning / condition cue shown with the prompt (e.g. the gloss, `(+)`). */
  cue?: Localized;
  /** The model answer shown after checking. */
  answer: string;
  /**
   * Other answers that are also correct Portuguese (a valid variant of the
   * norm — `do que` / `que`, `mais pequeno` / `menor`). Kept apart from the
   * model answer so the textbook form is never mistaken for the only one.
   */
  accept?: readonly string[];
  /** One short line on why the answer has this form. */
  why: Localized;
}

export interface PackGroup {
  /** Stable id, unique inside the pack (`comparisons`). */
  id: string;
  kind: ExerciseKind;
  title: Localized;
  /** The instruction shown above every exercise of the group. */
  instruction: Localized;
  /** Portuguese example shown on the group's card. */
  example: string;
  /** Reference card (`referenceCards.contentId`) behind the "Rule" button. */
  ruleId?: string;
  /**
   * Where the group's Portuguese was checked: specific pages, not home pages.
   * A group with no sources must not ship.
   */
  sources: readonly string[];
  /**
   * When the group's Portuguese was last checked against `sources` and solved
   * blind by the second reviewer (ISO date). Re-review after editing answers.
   */
  reviewedOn: string;
  exercises: readonly PackExercise[];
}

/** A link from a pack to an existing drill that trains one of its mechanics. */
export interface PackDrillLink {
  to: string;
  title: Localized;
  example: string;
}

export interface Pack {
  /** Stable id (`unit-18`). */
  id: string;
  /** The course unit this pack belongs to. */
  unit: number;
  title: Localized;
  summary: Localized;
  groups: readonly PackGroup[];
  /** Existing drills that also belong to this unit. */
  drills?: readonly PackDrillLink[];
}
