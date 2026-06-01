import { describe, expect, it } from 'vitest';
import { createPrng, hashSeed } from './prng.ts';

describe('createPrng — deterministic (no Math.random)', () => {
  it('replays the exact same float sequence for the same seed', () => {
    const a = createPrng('seed');
    const b = createPrng('seed');
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('keeps every float in [0, 1)', () => {
    const prng = createPrng(42);
    for (let i = 0; i < 100; i++) {
      const v = prng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('intBetween stays within the inclusive bounds', () => {
    const prng = createPrng('ints');
    for (let i = 0; i < 200; i++) {
      const v = prng.intBetween(5, 9);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(9);
    }
  });

  it('intBetween throws when max < min', () => {
    expect(() => createPrng('x').intBetween(9, 5)).toThrow(RangeError);
  });
});

describe('hashSeed', () => {
  it('is stable and returns an unsigned 32-bit integer', () => {
    const h = hashSeed('exam-7');
    expect(h).toBe(hashSeed('exam-7'));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
    expect(Number.isInteger(h)).toBe(true);
  });
});
