// NumbersMode session generator (SPEC §1.2 + §6.1 deterministic/seeded).
//
// A seed → a reproducible sequence of drill items. Each item is a production
// task (the user TYPES the answer, never picks): both directions are exercised —
// digit→word (`145` → `cento e quarenta e cinco`) and word→digit. Items mix
// CARDINAL and ORDINAL kinds (Grupo III requires ordinals). The generated text
// is the reference answer for the objective string check (see check.ts).

import {
  MAX_CARDINAL,
  MAX_ORDINAL,
  numberToText,
  ordinalToText,
} from './numberToText.ts';
import { createPrng } from './prng.ts';

/** Numeral kind drilled by an item. Subskills for mastery roll-up (AC6). */
export type NumberKind = 'cardinal' | 'ordinal';

/** Which way the item is presented / which side the user produces. */
export type Direction = 'digit-to-word' | 'word-to-digit';

/** One generated drill item. */
export interface NumberItem {
  /** Stable-within-session id (`<seed>-<index>`); also the attempt `taskId`. */
  id: string;
  kind: NumberKind;
  direction: Direction;
  /** The underlying integer. */
  value: number;
  /** What the user is shown (a digit string or the PT spelling). */
  prompt: string;
  /** The canonical expected answer (PT spelling or the digit string). */
  expected: string;
}

/** Tunable session shape; safe defaults cover the exam-relevant ranges. */
export interface SessionConfig {
  /** Number of items to generate (clamped to ≥ 1). */
  count: number;
  /** Probability (0..1) that any given item is an ordinal. */
  ordinalShare: number;
}

/** Default exam-leaning session shape. */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  count: 10,
  ordinalShare: 0.3,
};

/** Inclusive integer range with a relative sampling weight. */
interface WeightedRange {
  min: number;
  max: number;
  weight: number;
}

/**
 * Fixed exam-leaning cardinal sampling ranges (0–1000+, weighted toward the
 * 21–999 band the exam actually drills). Inlined as a constant — there is no
 * second caller that needs a tunable range, so it is not part of SessionConfig.
 */
const CARDINAL_RANGES: WeightedRange[] = [
  { min: 0, max: 20, weight: 2 },
  { min: 21, max: 100, weight: 3 },
  { min: 101, max: 1000, weight: 3 },
];

/** Inclusive ordinal range drilled by the exam (Grupo III). */
const ORDINAL_MIN = 1;
const ORDINAL_MAX = 20;

/** Pick a weighted range using the seeded PRNG. */
function pickRange(ranges: WeightedRange[], roll: number): WeightedRange {
  const total = ranges.reduce((s, r) => s + r.weight, 0);
  let target = roll * total;
  for (const range of ranges) {
    target -= range.weight;
    if (target < 0) {
      return range;
    }
  }
  return ranges[ranges.length - 1];
}

/**
 * Generate a deterministic NumbersMode session for `seed`.
 *
 * Same `seed` + same `config` ⇒ byte-identical item list (no `Math.random()`).
 * Directions alternate deterministically so every session drills BOTH ways.
 */
export function generateSession(
  seed: string | number,
  config: Partial<SessionConfig> = {},
): NumberItem[] {
  const cfg: SessionConfig = { ...DEFAULT_SESSION_CONFIG, ...config };
  const count = Math.max(1, Math.floor(cfg.count));
  const prng = createPrng(seed);

  const ordinalMin = Math.max(1, Math.min(ORDINAL_MIN, MAX_ORDINAL));
  const ordinalMax = Math.max(ordinalMin, Math.min(ORDINAL_MAX, MAX_ORDINAL));

  const items: NumberItem[] = [];
  for (let i = 0; i < count; i++) {
    const isOrdinal = prng.next() < cfg.ordinalShare;
    const kind: NumberKind = isOrdinal ? 'ordinal' : 'cardinal';

    let value: number;
    let word: string;
    if (isOrdinal) {
      value = prng.intBetween(ordinalMin, ordinalMax);
      word = ordinalToText(value);
    } else {
      const range = pickRange(CARDINAL_RANGES, prng.next());
      const min = Math.max(0, Math.min(range.min, MAX_CARDINAL));
      const max = Math.max(min, Math.min(range.max, MAX_CARDINAL));
      value = prng.intBetween(min, max);
      word = numberToText(value);
    }

    // Alternate directions deterministically so both are always exercised.
    const direction: Direction =
      i % 2 === 0 ? 'digit-to-word' : 'word-to-digit';
    const digits = String(value);

    items.push({
      id: `${String(seed)}-${i}`,
      kind,
      direction,
      value,
      prompt: direction === 'digit-to-word' ? digits : word,
      expected: direction === 'digit-to-word' ? word : digits,
    });
  }
  return items;
}
