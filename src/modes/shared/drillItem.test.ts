import { describe, expect, it } from 'vitest';
import type { DrillItem, McDrillItem, ProductionDrillItem } from './drillItem.ts';

describe('DrillItem discriminated type', () => {
  it('narrows a production item by its `mode` discriminant', () => {
    const item: DrillItem = {
      mode: 'production',
      prompt: 'casa → ___',
      answer: 'a',
      sourceRef: { store: 'nouns', id: 'noun:casa' },
    } satisfies ProductionDrillItem;

    expect(item.mode).toBe('production');
    if (item.mode === 'production') {
      // `options` is NOT a member of the production branch.
      expect('options' in item).toBe(false);
      expect(item.answer).toBe('a');
    }
  });

  it('narrows an mc item by its `mode` discriminant (always has options)', () => {
    const item: DrillItem = {
      mode: 'mc',
      prompt: 'casa → ___',
      answer: 'a',
      options: [
        { surface: 'a', correct: true, explanation: 'fem def article' },
        { surface: 'o', correct: false, explanation: 'opposite article' },
      ],
      sourceRef: { store: 'nouns', id: 'noun:casa' },
    } satisfies McDrillItem;

    expect(item.mode).toBe('mc');
    if (item.mode === 'mc') {
      expect(item.options).toHaveLength(2);
      expect(item.options.filter((o) => o.correct)).toHaveLength(1);
    }
  });
});
