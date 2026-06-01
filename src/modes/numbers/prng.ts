// Seeded, deterministic PRNG for the NumbersMode generator (SPEC §6.1
// deterministic/seeded class). The deterministic generation path MUST NOT use
// `Math.random()` — a given seed reproduces the exact same session (required by
// the determinism test and by the deterministic e2e seed).
//
// Algorithm: mulberry32 — a tiny, well-distributed 32-bit generator. It is
// fully self-contained (no crypto / no platform RNG) so the sequence is
// identical across Node, jsdom, and the browser.

/** A deterministic source of pseudo-random numbers seeded by a 32-bit integer. */
export interface Prng {
  /** Next float in [0, 1). */
  next(): number;
  /** Next integer in [min, max] (inclusive on both ends). */
  intBetween(min: number, max: number): number;
}

/** Hash an arbitrary string/number seed into a 32-bit unsigned integer. */
export function hashSeed(seed: string | number): number {
  const str = String(seed);
  let h = 0x811c9dc5; // FNV-1a offset basis.
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Force unsigned 32-bit.
  return h >>> 0;
}

/**
 * Create a deterministic PRNG from a string or numeric seed.
 *
 * The same seed always yields the same sequence; this is the ONLY randomness
 * source on the deterministic generation path.
 */
export function createPrng(seed: string | number): Prng {
  let state = hashSeed(seed);
  const next = (): number => {
    // mulberry32.
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    intBetween(min: number, max: number): number {
      if (max < min) {
        throw new RangeError(`intBetween: max (${max}) < min (${min})`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },
  };
}
