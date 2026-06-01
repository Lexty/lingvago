// Preposition cloze session generator (SPEC §1.2 production-first, §4.8 L1–L3
// curve, §6.1 seeded determinism, §6.3 parity-or-production; WP-C Task 3).
//
// A seed → a reproducible sequence of cloze DrillItems over the VERIFIED-eligible
// prepositions only (the §6.5 / AC3 blank-rule gate is applied up front, so a
// record without an unambiguous single clean-token blank can NEVER appear). Each
// item blanks the ONE clean-token occurrence of the verified `prep` in a chosen
// `example`; the verified key IS that `prep` form — never guessed.
//
// MODE is decided by the SHARED parity module, not here: each generator feeds the
// correct answer plus the §6.3 COMPETITIVE distractors (NEIGHBOURING
// CONTRACTIONS da/de/na/no) to `assembleMcOrProduction`; if a parity set
// assembles the item is MC, else it falls back to PRODUCTION (typed input). The
// §4.8 curve is purely a function of the requested LEVEL — it varies HOW MANY
// competitive traps are offered, and parity then decides the channel from the
// answer's shape:
//
//   L1 — high-frequency, unambiguous: NO competitive distractor is offered ⇒
//        always PRODUCTION (pure typed recall of the prep).
//   L2 — ONE neighbouring-contraction trap. A length-2 single-word prep (`de`,
//        `em`) is parity-equal to a length-2 contraction ⇒ MC; a prep of any
//        other shape (`a`, `para`, `entre`, `longe de`) has no length-parity
//        peer ⇒ production. Data decides the channel.
//   L3 — the FULL neighbouring-contraction trap set (da/de/na/no minus the
//        answer) — the «caverzny» level (§4.8): multiple competitive
//        contractions where parity assembles, else production.
//
// The deterministic path uses ONLY the seeded PRNG — never `Math.random()`.

import type { PrepositionRecord } from '../../db/schema.ts';
import { createPrng } from '../numbers/prng.ts';
import {
  assembleMcOrProduction,
  type DistractorCandidate,
  type DrillItem,
  type DrillSourceRef,
} from '../shared/index.ts';
import { buildCloze, chooseBlankExample } from './blankRule.ts';
import {
  filterPrepositionEligible,
  isPrepCategory,
  type PrepCategory,
} from './eligibility.ts';

/** The §4.8 difficulty levels this skill declares (L1–L3, contract Task 3). */
export const PREP_LEVELS = ['L1', 'L2', 'L3'] as const;

/** A graded difficulty level of the Preposition curve (§4.8). */
export type PrepLevel = (typeof PREP_LEVELS)[number];

/**
 * The §6.3 «competitive» neighbouring-contraction pool — the typical learner
 * error for a bare preposition is to write the CONTRACTED form. All four are
 * length-2 single-word, so the parity module keeps only the length-2 preps (de,
 * em) as MC and falls everything else back to production — data-driven.
 */
const NEIGHBOURING_CONTRACTIONS = ['da', 'de', 'na', 'no'] as const;

/** The parity class for a bare preposition cloze answer. */
const PARITY_CLASS = 'preposition';

/**
 * A generated Preposition item: the shared `DrillItem` (mode decided by the
 * parity module) plus the grounding metadata a screen / mastery roll-up needs.
 */
export interface PrepositionItem {
  /** Stable per-session id (`<seed>-<index>`). */
  id: string;
  /** The §4.8 level this item was generated at. */
  level: PrepLevel;
  /** The category sub-skill (tempo / movimento / lugar) — the mastery sub-axis. */
  category: PrepCategory;
  /** The verified preposition form being drilled (the answer key). */
  prep: string;
  /** The source example the cloze was built from. */
  example: string;
  /** The shared drill item (production-first; MC only when parity assembled). */
  drill: DrillItem;
}

/** Tunable session shape; safe default covers a short single-level drill. */
export interface PrepSessionConfig {
  /** Number of items to generate (clamped to ≥ 1). */
  count: number;
  /** The §4.8 level to generate at. */
  level: PrepLevel;
}

/** Default session: a short L1 (production recall) drill. */
export const DEFAULT_PREP_SESSION_CONFIG: PrepSessionConfig = {
  count: 10,
  level: 'L1',
};

function sourceOf(record: PrepositionRecord): DrillSourceRef {
  return { store: 'prepositions', id: record.contentId };
}

/**
 * The competitive distractor candidates for `prep` at `level`: neighbouring
 * contractions, with the prep itself removed (never a duplicate-correct). L1
 * offers none (⇒ production); L2 offers exactly one; L3 offers the full set.
 * Each candidate carries the typical-error explanation (SPEC §6.3).
 */
function candidatesFor(prep: string, level: PrepLevel): DistractorCandidate[] {
  if (level === 'L1') {
    return [];
  }
  const pool = NEIGHBOURING_CONTRACTIONS.filter((c) => c !== prep.trim().toLowerCase());
  const chosen = level === 'L2' ? pool.slice(0, 1) : pool;
  return chosen.map((surface) => ({
    surface,
    explanation: `neighbouring contraction — «${surface}» contracts a preposition with an article; here the bare preposition «${prep}» is required`,
  }));
}

/**
 * Build one cloze item for a verified-eligible record at `level`. The example is
 * the deterministically-chosen blankable one (AC3); the prompt is that example
 * with the single clean-token occurrence replaced by the blank.
 *
 * Returns `null` if the record is somehow not blankable (defensive — callers
 * pass only eligible records, so this never happens on the happy path).
 */
function buildItem(
  itemSeed: string,
  record: PrepositionRecord,
  level: PrepLevel,
): PrepositionItem | null {
  if (!isPrepCategory(record.category)) {
    return null;
  }
  const example = chooseBlankExample(record.prep, record.examples);
  if (example === null) {
    return null;
  }
  const built = buildCloze(record.prep, example);
  if (built === null) {
    return null;
  }
  const candidates = candidatesFor(record.prep, level);

  return {
    id: itemSeed,
    level,
    category: record.category,
    prep: record.prep,
    example,
    drill: assembleMcOrProduction({
      seed: itemSeed,
      prompt: built.cloze,
      answer: record.prep,
      answerExplanation: `${record.category}: «${record.prep}» — ${record.use || 'preposition'}`,
      parityClass: PARITY_CLASS,
      candidates,
      sourceRef: sourceOf(record),
    }),
  };
}

/**
 * Generate a deterministic Preposition session for `seed` over the
 * verified-eligible subset of `records`, at the requested §4.8 level.
 *
 * Same `seed` + same `records` + same `config` ⇒ byte-identical item list (no
 * `Math.random()`). The §6.5 / AC3 gate is applied here: ineligible records are
 * dropped before any item is built, so they can never appear. Returns `[]` when
 * no record is eligible, so the caller renders a graceful empty state (error
 * path).
 */
export function generateSession(
  seed: string | number,
  records: readonly PrepositionRecord[],
  config: Partial<PrepSessionConfig> = {},
): PrepositionItem[] {
  const cfg: PrepSessionConfig = { ...DEFAULT_PREP_SESSION_CONFIG, ...config };
  const count = Math.max(1, Math.floor(cfg.count));
  const eligible = filterPrepositionEligible([...records]).sort((a, b) =>
    a.contentId < b.contentId ? -1 : a.contentId > b.contentId ? 1 : 0,
  );
  if (eligible.length === 0) {
    return [];
  }

  const prng = createPrng(seed);
  const items: PrepositionItem[] = [];

  for (let i = 0; i < count; i++) {
    const record = eligible[prng.intBetween(0, eligible.length - 1)];
    const itemSeed = `${String(seed)}-${i}`;
    const item = buildItem(itemSeed, record, cfg.level);
    if (item !== null) {
      items.push(item);
    }
  }

  return items;
}
