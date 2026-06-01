// SPEC §6.3 distractor-PARITY module + the production-first FALLBACK rule (the
// heart of WP-C Task 1). Shared by Tasks 2–4 (GenderArticle, Preposition).
//
// WHY (SPEC §6.3, LEARNING_SCIENCE §3): in an MC item every option MUST be
// indistinguishable BY FORM — equal length / word-count / part-of-speech /
// grammatical form — so the surface never leaks the answer, and the distractors
// must be PLAUSIBLE «competitive» errors a learner actually makes (opposite
// article, neighbouring contraction). A distractor that is obviously wrong (or
// shaped differently) teaches nothing.
//
// FALLBACK RULE (production-first invariant): if a plausible PARITY set cannot
// be assembled — too few candidates survive the parity filter, or none qualify
// — the item is returned as a PRODUCTION (typed-input) item, NOT MC. This rule
// is a pure, deterministic function (`assembleMcOrProduction`) and is the most
// heavily tested surface of this module.
//
// DETERMINISM (SPEC §6.1): all ordering/selection goes through the shared seeded
// PRNG (`numbers/prng.ts`). The deterministic path NEVER calls `Math.random()`.

import { createPrng, type Prng } from '../numbers/prng.ts';
import { canonicalize } from './check.ts';
import type {
  DrillItem,
  DrillOption,
  DrillSourceRef,
  McDrillItem,
  ProductionDrillItem,
} from './drillItem.ts';

/**
 * A caller-supplied candidate distractor. The caller (a generator) is the only
 * party that knows the domain (gender, preposition), so it supplies BOTH the
 * surface form AND the explanation naming the typical error it represents. The
 * parity module decides only whether the candidate *qualifies* by form.
 */
export interface DistractorCandidate {
  /** The distractor surface form (e.g. `o`, `da`). */
  surface: string;
  /** The typical-learner-error explanation (SPEC §6.3 «с объяснением»). */
  explanation: string;
}

/** The shape an answer must match for parity (length / word-count / class). */
export interface ParityShape {
  /** Canonical-key character length. */
  length: number;
  /** Number of whitespace-separated words. */
  wordCount: number;
  /**
   * A caller-defined parity class capturing part-of-speech / grammatical form
   * (e.g. `'article-def'`, `'prep-contraction'`). Two surfaces are parity-equal
   * only when their classes are equal, so a generator can keep articles from
   * mixing with bare prepositions even at identical length.
   */
  parityClass: string;
}

/**
 * The minimum number of options (correct + distractors) an MC item must have.
 * Below this we fall back to production — a "multiple choice" with a single
 * option is not a choice (SPEC §6.3 plausible-set requirement).
 */
export const MIN_MC_OPTIONS = 2;

/** Number of words in a surface after spacing-normalization. */
function wordCount(surface: string): number {
  const c = canonicalize(surface);
  return c === '' ? 0 : c.split(' ').length;
}

/**
 * Derive the parity shape of a surface for a given parity class. Length and
 * word-count are measured on the CANONICAL key (accent-folded, spacing-
 * normalized) so `à` and `a` compare on equal footing with user input.
 */
export function parityShapeOf(surface: string, parityClass: string): ParityShape {
  return {
    length: canonicalize(surface).length,
    wordCount: wordCount(surface),
    parityClass,
  };
}

/** Are two parity shapes equal in length, word-count, AND class? */
export function isParityEqual(a: ParityShape, b: ParityShape): boolean {
  return (
    a.length === b.length && a.wordCount === b.wordCount && a.parityClass === b.parityClass
  );
}

/**
 * Filter `candidates` to those that qualify for an MC parity set against the
 * correct answer. A candidate qualifies iff it is:
 *   - parity-equal to the answer (length / word-count / class), AND
 *   - NOT a duplicate of the correct answer (no duplicate-correct, SPEC §6.3),
 *     AND
 *   - NOT a duplicate of an already-accepted candidate (de-duped by canonical
 *     key), AND
 *   - non-empty.
 *
 * Pure and order-stable: the surviving candidates are returned in their input
 * order (any randomisation happens later, seeded, in the builder).
 */
export function qualifyingDistractors(
  answer: string,
  parityClass: string,
  candidates: readonly DistractorCandidate[],
): DistractorCandidate[] {
  const answerShape = parityShapeOf(answer, parityClass);
  const answerKey = canonicalize(answer);
  const seen = new Set<string>([answerKey]);
  const out: DistractorCandidate[] = [];

  for (const candidate of candidates) {
    const key = canonicalize(candidate.surface);
    if (key === '') {
      continue;
    }
    if (seen.has(key)) {
      // Duplicate-correct or duplicate-distractor → reject (SPEC §6.3).
      continue;
    }
    if (!isParityEqual(parityShapeOf(candidate.surface, parityClass), answerShape)) {
      continue;
    }
    seen.add(key);
    out.push(candidate);
  }

  return out;
}

/**
 * The deterministic FALLBACK decision (SPEC §6.3, pure + testable in isolation):
 * given the count of parity-QUALIFYING distractors, can a plausible MC set be
 * assembled? An MC item needs the correct option plus at least one qualifying
 * competitive distractor, i.e. `qualifyingCount + 1 >= MIN_MC_OPTIONS`.
 *
 * `false` ⇒ the item MUST become PRODUCTION (typed input), never MC.
 */
export function canAssembleParity(qualifyingCount: number): boolean {
  return qualifyingCount + 1 >= MIN_MC_OPTIONS;
}

/** Fisher–Yates shuffle driven by the seeded PRNG (no `Math.random`). */
function seededShuffle<T>(items: readonly T[], prng: Prng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = prng.intBetween(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Input describing one item the caller wants built as MC-if-possible. */
export interface AssembleInput {
  /** Seed for deterministic distractor selection/ordering. */
  seed: string | number;
  /** The prompt shown to the learner. */
  prompt: string;
  /** The single verified correct answer. */
  answer: string;
  /** The explanation for the correct option (the rule). */
  answerExplanation: string;
  /** The parity class articles/prepositions are grouped by. */
  parityClass: string;
  /** Caller-supplied competitive distractor pool. */
  candidates: readonly DistractorCandidate[];
  /** Where the answer was verified from (SPEC §6.5). */
  sourceRef: DrillSourceRef;
}

function buildProduction(input: AssembleInput): ProductionDrillItem {
  return {
    mode: 'production',
    prompt: input.prompt,
    answer: input.answer,
    sourceRef: input.sourceRef,
  };
}

/**
 * Build an MC item IF a plausible parity set assembles, ELSE a PRODUCTION item
 * (the production-first fallback rule, SPEC §6.3). This is the module's primary
 * entry point and is fully deterministic for a given seed.
 *
 * Behaviour:
 *  - Empty/insufficient/non-qualifying candidates ⇒ PRODUCTION (never throws).
 *  - Exactly one qualifying distractor or more ⇒ MC with the correct option +
 *    all qualifying distractors, all parity-equal, no duplicate-correct, every
 *    distractor carrying its explanation. Option ORDER is seeded (same seed ⇒
 *    same order).
 */
export function assembleMcOrProduction(input: AssembleInput): DrillItem {
  const qualifying = qualifyingDistractors(
    input.answer,
    input.parityClass,
    input.candidates,
  );

  if (!canAssembleParity(qualifying.length)) {
    return buildProduction(input);
  }

  const prng = createPrng(input.seed);

  // Seeded ordering of the final option set off the seeded PRNG so the whole MC
  // layout is reproducible from the seed. All qualifying distractors are kept.
  const chosen = seededShuffle(qualifying, prng);

  const correctOption: DrillOption = {
    surface: input.answer,
    correct: true,
    explanation: input.answerExplanation,
  };
  const distractorOptions: DrillOption[] = chosen.map((candidate) => ({
    surface: candidate.surface,
    correct: false,
    explanation: candidate.explanation,
  }));

  const options = seededShuffle([correctOption, ...distractorOptions], prng);

  const item: McDrillItem = {
    mode: 'mc',
    prompt: input.prompt,
    answer: input.answer,
    options,
    sourceRef: input.sourceRef,
  };
  return item;
}
