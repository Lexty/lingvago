// GenderArticle session generator (SPEC §1.2 production-first, §4.8 L1–L3 curve,
// §6.1 seeded determinism, §6.3 parity-or-production; WP-C Task 2).
//
// A seed → a reproducible sequence of DrillItems over the VERIFIED-eligible
// nouns only (the §6.5 gate is applied up front, so a noun without a trusted
// `article`/`gender` can NEVER appear). Every item's answer key derives from the
// noun's verified `article` by the closed contraction rule — never guessed.
//
// MODE is decided by the SHARED parity module, not here: each generator feeds
// the correct answer plus a single COMPETITIVE distractor (the opposite article /
// opposite contraction) to `assembleMcOrProduction`; if a parity set assembles
// the item is MC, else it falls back to PRODUCTION (typed input). The §4.8 curve
// is purely a function of the requested LEVEL:
//
//   L1 — high-frequency plain DEFINITE article (o/a). Opposite article is
//        parity-equal (both length-1) ⇒ MC recognition scaffold.
//   L2 — DEFINITE + INDEFINITE. The indefinite (um/uma) opposite is NOT
//        parity-equal (um≠uma in length) ⇒ production; mixes channels.
//   L3 — CONTRACTIONS (de/em/a + article) with the opposite contraction as the
//        competitive trap. do/da, no/na, ao are parity-equal ⇒ MC; `à` (folds
//        to length-1) has no length-1 contraction peer ⇒ production. The hardest
//        level, exactly as §4.8 prescribes (first combinatorics + traps).
//
// The deterministic path uses ONLY the seeded PRNG — never `Math.random()`.

import type { NounRecord } from '../../db/schema.ts';
import { createPrng } from '../numbers/prng.ts';
import {
  assembleMcOrProduction,
  type DistractorCandidate,
  type DrillItem,
  type DrillSourceRef,
} from '../shared/index.ts';
import {
  articleFormsFor,
  contract,
  oppositeArticle,
  oppositeContraction,
  type Contractable,
  type DefiniteArticle,
} from './contractions.ts';
import { filterGenderEligible } from './eligibility.ts';

/** The §4.8 difficulty levels this skill declares (L1–L3, contract Task 2). */
export const GENDER_LEVELS = ['L1', 'L2', 'L3'] as const;

/** A graded difficulty level of the GenderArticle curve (§4.8). */
export type GenderLevel = (typeof GENDER_LEVELS)[number];

/** Which article task a generated item drills (also the mastery sub-axis). */
export type GenderTaskKind = 'definite' | 'indefinite' | 'contraction';

/** The three EP prepositions L3 contracts with, in canonical order. */
const PREPS: readonly Contractable[] = ['de', 'em', 'a'];

/**
 * A generated GenderArticle item: the shared `DrillItem` (mode decided by the
 * parity module) plus the grounding metadata a screen / mastery roll-up needs.
 */
export interface GenderItem {
  /** Stable per-session id (`<seed>-<index>`). */
  id: string;
  /** The §4.8 level this item was generated at. */
  level: GenderLevel;
  /** Which article form is being drilled (mastery sub-axis). */
  kind: GenderTaskKind;
  /** The lemma the item is grounded in. */
  lemma: string;
  /** The preposition, for `kind === 'contraction'` items only. */
  prep?: Contractable;
  /** The shared drill item (production-first; MC only when parity assembled). */
  drill: DrillItem;
}

/** Tunable session shape; safe default covers a short single-level drill. */
export interface GenderSessionConfig {
  /** Number of items to generate (clamped to ≥ 1). */
  count: number;
  /** The §4.8 level to generate at. */
  level: GenderLevel;
}

/** Default session: a short L1 (plain definite article) drill. */
export const DEFAULT_GENDER_SESSION_CONFIG: GenderSessionConfig = {
  count: 10,
  level: 'L1',
};

function sourceOf(noun: NounRecord): DrillSourceRef {
  return { store: 'nouns', id: noun.contentId };
}

/** Build the DEFINITE-article item for a noun (competitive = opposite article). */
function buildDefinite(
  seed: string,
  noun: NounRecord,
  article: DefiniteArticle,
  level: GenderLevel,
): GenderItem {
  const opposite = oppositeArticle(article);
  const candidate: DistractorCandidate = {
    surface: opposite,
    explanation: `opposite article — «${noun.lemma}» is ${noun.gender === 'm' ? 'masculine → o' : 'feminine → a'}, not «${opposite}»`,
  };
  return {
    id: seed,
    level,
    kind: 'definite',
    lemma: noun.lemma,
    drill: assembleMcOrProduction({
      seed,
      prompt: `${noun.lemma} → ___`,
      answer: article,
      answerExplanation: `${noun.gender === 'm' ? 'masculine' : 'feminine'} singular → definite article «${article}»`,
      parityClass: 'article-def',
      candidates: [candidate],
      sourceRef: sourceOf(noun),
    }),
  };
}

/**
 * Build the INDEFINITE-article item for a noun (L2). The opposite indefinite
 * (um↔uma) is fed as the competitive distractor; because `um`/`uma` differ in
 * length the parity set does NOT assemble, so the parity module returns a
 * PRODUCTION item — the deterministic fallback, exercised by data not by a flag.
 */
function buildIndefinite(seed: string, noun: NounRecord, article: DefiniteArticle): GenderItem {
  const { indefinite } = articleFormsFor(article);
  const opposite = indefinite === 'um' ? 'uma' : 'um';
  const candidate: DistractorCandidate = {
    surface: opposite,
    explanation: `opposite indefinite — «${noun.lemma}» is ${noun.gender === 'm' ? 'masculine → um' : 'feminine → uma'}, not «${opposite}»`,
  };
  return {
    id: seed,
    level: 'L2',
    kind: 'indefinite',
    lemma: noun.lemma,
    drill: assembleMcOrProduction({
      seed,
      prompt: `${noun.lemma} → ___ (indefinido)`,
      answer: indefinite,
      answerExplanation: `${noun.gender === 'm' ? 'masculine' : 'feminine'} singular → indefinite article «${indefinite}»`,
      parityClass: 'article-indef',
      candidates: [candidate],
      sourceRef: sourceOf(noun),
    }),
  };
}

/**
 * Build a CONTRACTION item for a noun + preposition (L3). The answer is the
 * by-rule contraction (de+a=da, em+o=no, a+a=à, …); the competitive distractor
 * is the OPPOSITE contraction (the neighbouring trap, §6.3). do/da/no/na/ao are
 * parity-equal ⇒ MC; `à` folds to length-1 with no length-1 contraction peer ⇒
 * production fallback — the §4.8 «first combinatorics» level decided by data.
 */
function buildContraction(
  seed: string,
  noun: NounRecord,
  article: DefiniteArticle,
  prep: Contractable,
): GenderItem {
  const answer = contract(prep, article);
  const trap = oppositeContraction(prep, article);
  const candidate: DistractorCandidate = {
    surface: trap,
    explanation: `neighbouring contraction — «${noun.lemma}» is ${noun.gender === 'm' ? 'masculine → ' : 'feminine → '}${prep}+${article}=${answer}, not «${trap}»`,
  };
  return {
    id: seed,
    level: 'L3',
    kind: 'contraction',
    lemma: noun.lemma,
    prep,
    drill: assembleMcOrProduction({
      seed,
      prompt: `${prep} + ${noun.lemma} → ___`,
      answer,
      answerExplanation: `${prep} + «${article}» = «${answer}» (contraction by rule)`,
      parityClass: 'prep-contraction',
      candidates: [candidate],
      sourceRef: sourceOf(noun),
    }),
  };
}

/**
 * Generate a deterministic GenderArticle session for `seed` over the
 * verified-eligible subset of `nouns`, at the requested §4.8 level.
 *
 * Same `seed` + same `nouns` + same `config` ⇒ byte-identical item list (no
 * `Math.random()`). The §6.5 gate is applied here: ineligible nouns are dropped
 * before any item is built, so they can never appear. Returns `[]` when no noun
 * is eligible, so the caller renders a graceful empty state (error path).
 */
export function generateSession(
  seed: string | number,
  nouns: readonly NounRecord[],
  config: Partial<GenderSessionConfig> = {},
): GenderItem[] {
  const cfg: GenderSessionConfig = { ...DEFAULT_GENDER_SESSION_CONFIG, ...config };
  const count = Math.max(1, Math.floor(cfg.count));
  const eligible = filterGenderEligible([...nouns]).sort((a, b) =>
    a.contentId < b.contentId ? -1 : a.contentId > b.contentId ? 1 : 0,
  );
  if (eligible.length === 0) {
    return [];
  }

  const prng = createPrng(seed);
  const items: GenderItem[] = [];

  for (let i = 0; i < count; i++) {
    const noun = eligible[prng.intBetween(0, eligible.length - 1)];
    const article = noun.article;
    const itemSeed = `${String(seed)}-${i}`;

    if (cfg.level === 'L1') {
      items.push(buildDefinite(itemSeed, noun, article, 'L1'));
    } else if (cfg.level === 'L2') {
      // Mix definite (parity ⇒ MC) and indefinite (no parity ⇒ production),
      // seeded — so L2 deterministically exercises both channels. Both carry the
      // session LEVEL (L2); `kind` distinguishes the article form.
      const indefinite = prng.next() < 0.5;
      items.push(
        indefinite
          ? buildIndefinite(itemSeed, noun, article)
          : buildDefinite(itemSeed, noun, article, 'L2'),
      );
    } else {
      const prep = PREPS[prng.intBetween(0, PREPS.length - 1)];
      items.push(buildContraction(itemSeed, noun, article, prep));
    }
  }

  return items;
}
