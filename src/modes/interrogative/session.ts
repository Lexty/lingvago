// Interrogative cue-production session generator (SPEC §1.2 production-first,
// §4.8 L1→L3 curve, §6.1 seeded determinism, §6.3 parity-or-production, AC2–AC5).
//
// A (seed, glossLang) → a reproducible sequence of gloss-cue-prefixed cloze
// DrillItems over the VERIFIED-eligible interrogative items only (the §6.5
// verified-key gate is applied up front, so a row whose answer is not gradeable
// from its cue + visible agreement can NEVER appear). Each item:
//
//  - carries a structured `cue`/`gloss` (AC3): the language-aware meaning gloss
//    (`gloss_ru` for ru, `gloss_en` for en) — the cue that makes a bare cloze
//    (`___ moras?` — onde? como?) well-determined.
//  - prefixes that gloss into the visible `drill.prompt`, e.g. `(где) ___
//    moras?` / `(where) ___ moras?`, so the shared GrammarDrill needs NO change.
//    glossLang is an EXPLICIT input → determinism is preserved (no i18n import).
//
// MODE is decided by the SHARED parity module, not here (AC4): the generator
// feeds the answer + the §6.3 COMPETITIVE distractors to
// `assembleMcOrProduction`; if a parity set assembles the item is MC, else it
// falls back to PRODUCTION (typed input). Distractors are ONLY parity-feasible
// contrasts the shared `parity.ts` can actually assemble (equal canonical
// length + word-count + parityClass):
//
//   - a `wh` single-word answer → other equal-length single-word `wh`
//     interrogatives (the meaning-confusion set, e.g. quem/onde/como/qual len4).
//     Trains the recall confusion via recognition.
//   - a `quant` answer → the same-family GENDER contrast (quanto↔quanta len6,
//     quantos↔quantas len7). Trains gender agreement. `quanta` has ZERO items so
//     it only ever appears as a DISTRACTOR here, never as an answer.
//
// NEVER cross-length (qual(4)↔quais(5)) or cross-class (quanto↔quando) options;
// parity rejects them anyway. The where-family directional contrast
// (onde/aonde/de onde) and the qual↔quais NUMBER contrast are trained by the
// PRODUCTION channel (the gloss cue distinguishes them) + the ref card — NOT MC.
// Multi-word forms (o que / de onde / para onde) are word-count 2 with no
// equal-shape same-class peer in practice ⇒ they fall back to production.
//
// The §4.8 curve only varies HOW MANY competitive traps are offered; parity then
// decides the channel from the answer's shape. The deterministic path uses ONLY
// the seeded PRNG.

import type { InterrogativeRecord } from '../../db/schema.ts';
import { createPrng } from '../numbers/prng.ts';
import {
  assembleMcOrProduction,
  canonicalize,
  type DistractorCandidate,
  type DrillItem,
  type DrillSourceRef,
} from '../shared/index.ts';
import {
  filterInterrogativeEligible,
  reconstructAnswer,
} from './eligibility.ts';
import {
  glossFor,
  INTERROGATIVE_TABLE,
  parityClassFor,
  type GlossLang,
  type IntParityClass,
} from './intData.ts';

/** The §4.8 difficulty levels this skill declares (L1→L3, AC2). */
export const INT_LEVELS = ['L1', 'L2', 'L3'] as const;

/** A graded difficulty level of the Interrogative curve (§4.8). */
export type IntLevel = (typeof INT_LEVELS)[number];

/**
 * A generated Interrogative item: the shared `DrillItem` (mode decided by the
 * parity module) plus the grounding metadata a screen / mastery roll-up needs.
 */
export interface InterrogativeItem {
  /** Stable per-session id (`<seed>-<index>`). */
  id: string;
  /** The §4.8 level this item was generated at. */
  level: IntLevel;
  /** Semantic category of the source row (mastery sub-axis). */
  category: string;
  /** The §6.3 parity class of the answer (`quant` vs `wh`). */
  parityClass: IntParityClass;
  /**
   * The structured cue (AC3): the language-aware meaning gloss displayed in the
   * prompt. Equal to `gloss` (kept as `cue` to mirror possessive's field name).
   */
  cue: string;
  /** Same as `cue`; the explicit gloss field (AC3). */
  gloss: string;
  /** The gloss language this item was generated for. */
  glossLang: GlossLang;
  /** The verified interrogative form being drilled (the answer key). */
  answer: string;
  /** The shared drill item (production-first; MC only when parity assembled). */
  drill: DrillItem;
}

/** Tunable session shape; safe default covers a short single-level drill. */
export interface IntSessionConfig {
  /** Number of items to generate (clamped to ≥ 1). */
  count: number;
  /** The §4.8 level to generate at. */
  level: IntLevel;
  /** The gloss language for the meaning cue (AC3). */
  glossLang: GlossLang;
}

/** Default session: a short L1 (production recall) drill, Russian gloss. */
export const DEFAULT_INT_SESSION_CONFIG: IntSessionConfig = {
  count: 10,
  level: 'L1',
  glossLang: 'ru',
};

function sourceOf(record: InterrogativeRecord): DrillSourceRef {
  return { store: 'interrogatives', id: record.contentId };
}

/** Canonical word-count of a surface (1 for `onde`, 2 for `de onde`). */
function wordCount(surface: string): number {
  const c = canonicalize(surface);
  return c === '' ? 0 : c.split(' ').length;
}

/**
 * The §6.3 competitive distractor pool for an answer at `level`.
 *
 *  - `wh` answer → other single-word `wh` interrogatives of the SAME canonical
 *    length (so quem↔onde↔como↔qual at len4), the answer itself removed,
 *    de-duped by surface. The meaning-confusion recognition set.
 *  - `quant` answer → same-family forms of the SAME canonical length (the gender
 *    contrast quanto↔quanta len6, quantos↔quantas len7), answer removed.
 *
 * Cross-length / cross-class / multi-word peers are filtered HERE and rejected
 * again by parity. L1 offers NONE (⇒ production); L2 offers exactly one; L3 the
 * full set. Returned in a STABLE order (table order) so selection is
 * reproducible before the parity module's seeded shuffle.
 */
function candidatesFor(
  answer: string,
  parityClass: IntParityClass,
  level: IntLevel,
): DistractorCandidate[] {
  if (level === 'L1') {
    return [];
  }
  const answerKey = canonicalize(answer);
  const answerLen = answerKey.length;
  const answerWc = wordCount(answer);

  const seen = new Set<string>([answerKey]);
  const pool: DistractorCandidate[] = [];
  for (const entry of INTERROGATIVE_TABLE) {
    if (entry.parityClass !== parityClass) {
      continue;
    }
    const key = canonicalize(entry.form);
    if (seen.has(key)) {
      continue;
    }
    if (key.length !== answerLen || wordCount(entry.form) !== answerWc) {
      continue;
    }
    seen.add(key);
    if (parityClass === 'quant') {
      pool.push({
        surface: entry.form,
        explanation: `wrong gender/number — «${entry.form}» agrees with a ${entry.agreement?.gender ?? '?'}/${entry.agreement?.number ?? '?'} noun; here «${answer}» is required (it must match the counted noun's gender+number)`,
      });
    } else {
      pool.push({
        surface: entry.form,
        explanation: `wrong meaning — «${entry.form}» means «${entry.gloss_en}»; here the cue calls for «${answer}»`,
      });
    }
  }

  if (level === 'L2') {
    return pool.slice(0, 1);
  }
  return pool;
}

/**
 * Build one gloss-cue-prefixed item for a verified-eligible record at `level`.
 * The answer is reconstructed via the §6.5 gate (never read blindly); the prompt
 * is the blank sentence prefixed with the language-aware gloss cue (AC3).
 *
 * Returns `null` if the record is somehow not reconstructible (defensive —
 * callers pass only eligible records, so this never happens on the happy path).
 */
function buildItem(
  itemSeed: string,
  record: InterrogativeRecord,
  level: IntLevel,
  glossLang: GlossLang,
): InterrogativeItem | null {
  const answer = reconstructAnswer(record);
  if (answer === null) {
    return null;
  }
  const entry = INTERROGATIVE_TABLE.find((e) => e.form === answer);
  if (entry === undefined) {
    return null;
  }
  const gloss = glossFor(entry, glossLang);
  const prompt = `(${gloss}) ${record.blankSentence}`;
  const parityClass = parityClassFor(answer);
  const candidates = candidatesFor(answer, parityClass, level);

  return {
    id: itemSeed,
    level,
    category: record.category,
    parityClass,
    cue: gloss,
    gloss,
    glossLang,
    answer,
    drill: assembleMcOrProduction({
      seed: itemSeed,
      prompt,
      answer,
      answerExplanation:
        parityClass === 'quant'
          ? `«${answer}» — agrees in gender+number with the counted noun (${entry.agreement?.gender ?? '?'}/${entry.agreement?.number ?? '?'})`
          : `«${answer}» — the «${gloss}» interrogative`,
      parityClass,
      candidates,
      sourceRef: sourceOf(record),
    }),
  };
}

/**
 * Generate a deterministic Interrogative session for `seed` over the
 * verified-eligible subset of `records`, at the requested §4.8 level and gloss
 * language.
 *
 * Same `seed` + same `records` + same `config` ⇒ byte-identical item list (no
 * `Math.random()`). The §6.5 verified-key gate is applied here: ineligible /
 * non-reconstructible records are dropped before any item is built, so they can
 * never appear as an ungradeable production prompt. Returns `[]` when no record
 * is eligible, so the caller renders a graceful empty state (error path).
 */
export function generateSession(
  seed: string | number,
  records: readonly InterrogativeRecord[],
  config: Partial<IntSessionConfig> = {},
): InterrogativeItem[] {
  const cfg: IntSessionConfig = { ...DEFAULT_INT_SESSION_CONFIG, ...config };
  const count = Math.max(1, Math.floor(cfg.count));
  const eligible = filterInterrogativeEligible([...records]).sort((a, b) =>
    a.contentId < b.contentId ? -1 : a.contentId > b.contentId ? 1 : 0,
  );
  if (eligible.length === 0) {
    return [];
  }

  const prng = createPrng(seed);
  const items: InterrogativeItem[] = [];

  for (let i = 0; i < count; i++) {
    const record = eligible[prng.intBetween(0, eligible.length - 1)];
    const itemSeed = `${String(seed)}-${i}`;
    const item = buildItem(itemSeed, record, cfg.level, cfg.glossLang);
    if (item !== null) {
      items.push(item);
    }
  }

  return items;
}
