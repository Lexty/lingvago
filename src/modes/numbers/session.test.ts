import { describe, expect, it } from 'vitest';
import { checkAnswer } from './check.ts';
import { numberToText, ordinalToText } from './numberToText.ts';
import { generateSession } from './session.ts';

describe('generateSession — seeded determinism (AC2/AC8)', () => {
  it('produces an identical sequence for the same seed', () => {
    const a = generateSession('exam-7', { count: 12 });
    const b = generateSession('exam-7', { count: 12 });
    expect(a).toEqual(b);
  });

  it('produces a different sequence for a different seed', () => {
    const a = generateSession('seed-a', { count: 12 });
    const b = generateSession('seed-b', { count: 12 });
    // At least one item must differ (prompts), proving the seed matters.
    expect(a.map((i) => i.prompt)).not.toEqual(b.map((i) => i.prompt));
  });

  it('generates exactly `count` items (clamped to ≥1)', () => {
    expect(generateSession('s', { count: 5 })).toHaveLength(5);
    expect(generateSession('s', { count: 0 })).toHaveLength(1);
  });
});

describe('generateSession — both directions (AC3)', () => {
  it('exercises both digit→word and word→digit', () => {
    const items = generateSession('dirs', { count: 8 });
    const dirs = new Set(items.map((i) => i.direction));
    expect(dirs.has('digit-to-word')).toBe(true);
    expect(dirs.has('word-to-digit')).toBe(true);
  });
});

// Reference-comparison (AC1), NOT a true numberToText⁻¹ inverse: there is no
// independent word→number parser, so each item's `expected` is compared against
// the SAME pure generator the app uses (the EP-canon table in
// numberToText.test.ts is the independent ground truth for the spellings).
describe('generateSession — reference-comparison (numberToText vs check)', () => {
  it('every generated item validates against its own canonical answer', () => {
    const items = generateSession('roundtrip', { count: 40, ordinalShare: 0.5 });
    for (const item of items) {
      // The expected answer always passes the objective check.
      expect(checkAnswer(item.expected, item.expected)).toBe(true);

      // And the spelling matches the generator for that kind/direction.
      const word =
        item.kind === 'ordinal'
          ? ordinalToText(item.value)
          : numberToText(item.value);
      if (item.direction === 'digit-to-word') {
        expect(item.prompt).toBe(String(item.value));
        expect(item.expected).toBe(word);
      } else {
        expect(item.prompt).toBe(word);
        expect(item.expected).toBe(String(item.value));
      }
    }
  });

  it('mixes cardinal and ordinal kinds when ordinalShare is balanced', () => {
    const items = generateSession('mix', { count: 30, ordinalShare: 0.5 });
    const kinds = new Set(items.map((i) => i.kind));
    expect(kinds.has('cardinal')).toBe(true);
    expect(kinds.has('ordinal')).toBe(true);
  });
});
