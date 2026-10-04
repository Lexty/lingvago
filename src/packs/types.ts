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
 *  - `build`  — write the whole sentence from ordered cue words;
 *  - `transform` — write a whole sentence from another one: rewrite it as the
 *    instruction says, or answer a question from a hint in brackets;
 *  - `choose` — read a Portuguese sentence and pick what it means. The only
 *    kind that is not typed: it trains reading a construction (não tem de vs
 *    não pode), and is followed by typed practice in new situations.
 */
export type ExerciseKind = 'recall' | 'cloze' | 'build' | 'transform' | 'choose';

/** One option of a `choose` exercise. Its `id` is the exercise's `answer`. */
export interface ChoiceOption {
  id: string;
  text: Localized;
}

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
  /** The model answer shown after checking (for `choose`: the right option's id). */
  answer: string;
  /** The options of a `choose` exercise, in display order. */
  options?: readonly ChoiceOption[];
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

/**
 * One word card of a unit's vocabulary, exported to Anki. The Portuguese side
 * carries the article (`o lago`) so the gender is learned with the word.
 */
export interface VocabCard {
  /**
   * Stable id, unique inside the pack (`agencia-de-viagens`). It makes the
   * Anki note's GUID, so it is NEVER changed or reused: fixing the Portuguese
   * (an accent, the article) must update the learner's note, not create a new
   * one beside it. Written once from the first spelling and then left alone.
   */
  id: string;
  pt: string;
  ru: string;
  en: string;
  /** A short remark shown under the Portuguese word (false friend, other sense). */
  note?: Localized;
  /** Tag slug (`geografia`); every card is also tagged `lingvago unidade-NN`. */
  topic: string;
}

export interface PackVocab {
  /** Where meanings, spelling and gender were checked (specific pages). */
  sources: readonly string[];
  /** When the list was last checked against `sources` (ISO date). */
  reviewedOn: string;
  cards: readonly VocabCard[];
}

/** A heading on the lesson screen that gathers related groups. */
export interface PackBlock {
  /** Stable id; `mix-<id>` is the route of the block's own mixed session. */
  id: string;
  title: Localized;
  /** Group ids, in display order. Every group of the pack is in exactly one block. */
  groupIds: readonly string[];
}

export interface Pack {
  /** Stable id (`unit-18`). */
  id: string;
  /** The course unit this pack belongs to. */
  unit: number;
  title: Localized;
  summary: Localized;
  groups: readonly PackGroup[];
  /**
   * Optional sections of the lesson screen. Without them the groups are one
   * flat list. They change only the layout: the mix still takes every group.
   */
  blocks?: readonly PackBlock[];
  /** Existing drills that also belong to this unit. */
  drills?: readonly PackDrillLink[];
  /** The unit's words, exportable as Anki cards. */
  vocab?: PackVocab;
}
